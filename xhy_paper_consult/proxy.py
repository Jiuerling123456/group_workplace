import http.server
import threading
import urllib.request
import json
import os

PORT = 3000
DIFY_URL = 'https://api.dify.ai/v1/workflows/run'
API_KEY = 'app-r2ny0MjklS9YYhBRvN80j3S9'

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/api/proxy':
            self.send_error(404)
            return

        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8')

        req = urllib.request.Request(DIFY_URL, data=body.encode('utf-8'))
        req.add_header('Authorization', f'Bearer {API_KEY}')
        req.add_header('Content-Type', 'application/json')
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        req.add_header('Accept', '*/*')

        try:
            with urllib.request.urlopen(req, timeout=120) as upstream:
                self.send_response(upstream.status)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                data = upstream.read()
                # 收集所有 SSE 行
                lines = data.decode('utf-8').split('\n')
                results = []
                for line in lines:
                    if line.startswith('data:'):
                        try:
                            chunk = json.loads(line[5:].strip())
                            ev = chunk.get('event', '')
                            if ev == 'workflow_finished':
                                outputs = chunk.get('data', {}).get('outputs', {})
                                results = outputs.get('results', [])
                        except json.JSONDecodeError:
                            pass
                # 返回简化结果
                resp_data = json.dumps({'results': results}, ensure_ascii=False)
                self.wfile.write(resp_data.encode('utf-8'))
        except urllib.error.HTTPError as e:
            err = e.read()
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(err)
        except Exception as e:
            msg = json.dumps({'results': [], 'error': str(e)}).encode()
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(msg)

    def do_GET(self):
        # 提供静态文件
        if self.path == '/' or self.path == '/index.html':
            self.path = '/index.html'
        try:
            filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), self.path.lstrip('/'))
            if os.path.isfile(filepath):
                with open(filepath, 'rb') as f:
                    content = f.read()
                ct = 'text/html' if filepath.endswith('.html') else 'text/plain'
                self.send_response(200)
                self.send_header('Content-Type', ct)
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404)
        except Exception:
            self.send_error(500)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        pass  # 静默日志

class ThreadedHTTPServer(http.server.ThreadingHTTPServer):
    """多线程服务器，支持并发请求"""
    daemon_threads = True

os.chdir(os.path.dirname(os.path.abspath(__file__)))
print(f'Server: http://localhost:{PORT}')
ThreadedHTTPServer(('', PORT), ProxyHandler).serve_forever()
