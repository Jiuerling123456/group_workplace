// 测试 API 功能
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testVercelAPI() {
  console.log('Testing Vercel-like API...');
  
  const mockData = {
    inputs: { keywords: 'transformer' },
    response_mode: 'streaming',
    user: 'test-user'
  };

  try {
    // 测试本地代理
    const localRes = await fetch('http://localhost:3000/api/paper-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockData)
    });
    
    console.log('Local API Status:', localRes.status);
    const localData = await localRes.json();
    console.log('Local API Response:', JSON.stringify(localData, null, 2));
    
  } catch (error) {
    console.log('Local API test skipped (server not running):', error.message);
  }
  
  console.log('\n---\n');
  console.log('To test with Vercel deployment:');
  console.log('1. Deploy to Vercel: vercel --prod');
  console.log('2. Test with: curl -X POST https://your-project.vercel.app/api/paper-proxy');
  console.log('   -H "Content-Type: application/json"');
  console.log('   -d \'{"inputs":{"keywords":"test"}}\'');
}

testVercelAPI();