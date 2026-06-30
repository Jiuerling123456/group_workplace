// Vercel Serverless Function for Dify workflow proxy
export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const { inputs, response_mode = 'streaming', user = 'vercel-user' } = req.body;
    
    if (!inputs || !inputs.keywords) {
      return res.status(400).json({ error: 'Missing required field: inputs.keywords' });
    }

    // 从环境变量获取 API Key
    const API_KEY = process.env.DIFY_API_KEY || 'app-r2ny0MjklS9YYhBRvN80j3S9';
    const DIFY_URL = 'https://api.dify.ai/v1/workflows/run';

    const response = await fetch(DIFY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Vercel-Serverless)',
        'Accept': '*/*'
      },
      body: JSON.stringify({
        inputs,
        response_mode,
        user
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dify API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Dify API error: ${response.status}`,
        details: errorText.slice(0,的口500)
      });
    }

    // 处理流式响应
    const data = await response.text();
    const lines = data.split('\n').filter(line => line.trim());
    
    let results = [];
    for (const line of lines) {
      if (line.startsWith('data:')) {
        try {
          const chunk = JSON.parse(line.slice(5).trim());
          const event = chunk.event;
          if (event === 'workflow_finished') {
            const outputs = chunk.data?.outputs || {};
            results = outputs.results || [];
            break;
          }
        } catch (e) {
          console.warn('Failed to parse SSE chunk:', e.message);
        }
      }
    }

    return res.status(200).json({ results });
    
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}