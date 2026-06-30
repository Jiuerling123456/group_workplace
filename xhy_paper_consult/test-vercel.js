// 测试 Vercel Serverless Function 的本地模拟
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // 静态文件服务
  if (req.url === '/' || req.url === '/index.html') {
    const content = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
    return;
  }
  
  // API 路由
  if (req.url === '/api/paper-proxy' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { inputs } = JSON.parse(body);
        
        // 模拟 Dify API 响应
        const mockResults = [
          {
            title: "Attention Is All You Need",
            authors: ["Vaswani, A.", "Shazeer, N.", "Parmar, N.", "Uszkoreit, J.", "Jones, L.", "Gomez, A. N.", "Kaiser, L.", "Polosukhin, I."],
            year: 2017,
            journal: "Neural Information Processing Systems (NeurIPS)",
            abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a novel simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
            keywords: ["transformer", "attention", "neural networks", "nlp"],
            url: "https://arxiv.org/abs/1706.03762"
          },
          {
            title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
            authors: ["Devlin, J.", "Chang, M. W.", "Lee, K.", "Toutanova, K."],
            year: 2018,
            journal: "North American Chapter of the Association for Computational Linguistics (NAACL)",
            abstract: "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.",
            keywords: ["bert", "transformer", "language model", "nlp"],
            url: "https://arxiv.org/abs/1810.04805"
          }
        ];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results: mockResults }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log(`Test with: curl -X POST http://localhost:${PORT}/api/paper-proxy -H "Content-Type: application/json" -d '{"inputs":{"keywords":"test"}}'`);
});