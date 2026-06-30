/**
 * Vercel Serverless Function - Dify API 代理 (CommonJS)
 *
 * 解决 Vercel 静态托管下 /proxy/* 请求的转发问题。
 * 通过 vercel.json rewrite 将 /proxy/* 映射到此函数。
 *
 * 需在 Vercel 环境变量中配置：
 *   DIFY_API_KEY  - 你的 Dify API Key（必需）
 *   DIFY_API_BASE - Dify API 地址（可选，默认 https://api.dify.ai/v1）
 */

module.exports = async function handler(req, res) {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }

  const apiKey = process.env.DIFY_API_KEY;
  if (!apiKey) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: 'DIFY_API_KEY 未配置，请在 Vercel Settings → Environment Variables 中设置' });
  }

  const apiBase = process.env.DIFY_API_BASE || 'https://api.dify.ai/v1';

  /**
   * 核心修复：直接从 req.url 提取路径
   *
   * Vercel rewrite 后 req.url 仍是原始 URL，如：
   *   /proxy/v1/chat-messages?user=abc123
   *
   * 去掉 /proxy 前缀就是 Dify API 的路径。
   */
  const parsedUrl = new URL(req.url, 'http://localhost');
  const difyPath = parsedUrl.pathname.replace(/^\/proxy/, '');
  const targetUrl = apiBase + difyPath + parsedUrl.search;

  console.log('[Proxy]', req.method, req.url, '->', targetUrl);

  // 读取请求体
  let body = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks).toString();
    } catch (_) {
      body = '';
    }
  }

  try {
    const fetchResp = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': req.headers['content-type'] || 'application/json',
        'User-Agent': 'Vercel-Dify-Proxy/2.0',
      },
      body: body || undefined,
      signal: AbortSignal.timeout(120000),
    });

    const contentType = fetchResp.headers.get('content-type') || 'application/json';

    // SSE 流式响应 - 逐块转发
    if (contentType.includes('text/event-stream')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no');
      res.status(200);

      const reader = fetchResp.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          res.write(decoder.decode(result.value, { stream: true }));
        }
      } catch (e) {
        console.error('[Proxy] SSE error:', e.message);
      }
      return res.end();
    }

    // 普通响应
    const responseBody = await fetchResp.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    return res.status(fetchResp.status).send(responseBody);

  } catch (error) {
    console.error('[Proxy] Error:', error.message);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return res.status(504).json({ error: 'Dify API 请求超时' });
    }
    return res.status(502).json({ error: '代理请求失败: ' + error.message });
  }
};
