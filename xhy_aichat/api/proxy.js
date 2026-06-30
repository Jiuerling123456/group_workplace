/**
 * Vercel Serverless Function - Dify API 代理
 * 
 * 解决 Vercel 静态托管下 /proxy/* 请求的转发问题。
 * 通过 vercel.json rewrite 将 /proxy/* 映射到此函数。
 * 
 * 需在 Vercel 环境变量中配置：
 *   DIFY_API_KEY  - 你的 Dify API Key（必需）
 *   DIFY_API_BASE - Dify API 地址（可选，默认 https://api.dify.ai/v1）
 */
export default async function handler(req, res) {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const apiKey = process.env.DIFY_API_KEY;
  if (!apiKey) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: 'DIFY_API_KEY 未配置，请在 Vercel 环境变量中设置' });
  }

  const apiBase = process.env.DIFY_API_BASE || 'https://api.dify.ai/v1';

  // 从 rewrite 规则中获取原始路径
  const difyPath = req.query.dify_path || '';

  // 重构查询参数（排除 dify_path）
  const url = new URL(req.url, 'http://localhost');
  url.searchParams.delete('dify_path');
  const queryString = url.search;

  const targetUrl = `${apiBase}/${difyPath}${queryString}`;

  // 读取请求体
  let body = '';
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks).toString();
  }

  try {
    const fetchResp = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Dify-Proxy/1.0',
      },
      body: body || undefined,
      signal: AbortSignal.timeout(120000), // 2 分钟超时
    });

    const contentType = fetchResp.headers.get('content-type') || 'application/json';
    const responseBody = await fetchResp.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    return res.status(fetchResp.status).send(responseBody);
  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return res.status(504).json({ error: 'Dify API 请求超时' });
    }
    return res.status(502).json({ error: '代理请求失败: ' + error.message });
  }
}
