"""
Dify API 代理服务器 - 解决 CORS 跨域问题
同时提供静态文件服务，支持 SSE 流式转发（使用 requests 库）
"""
import http.server
import urllib.request
import json
import os
import threading

try:
    import requests as req_lib
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

API_BASE_URL = os.environ.get("DIFY_API_BASE", "https://api.dify.ai/v1")
API_KEY = os.environ.get("DIFY_API_KEY", "")
# ⚠️ 请设置环境变量 DIFY_API_KEY，不要在此处硬编码


class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        """处理 CORS 预检请求"""
        self.send_response(200)
        self.end_headers()

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")

    def do_GET(self):
        if self.path.startswith("/proxy/"):
            self.proxy_request("GET")
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/proxy/"):
            self.proxy_request("POST")
        else:
            super().do_POST()

    def do_DELETE(self):
        if self.path.startswith("/proxy/"):
            self.proxy_request("DELETE")
        else:
            self.send_error(405)

    def proxy_request(self, method):
        """代理请求到 Dify API"""
        target_path = self.path.replace("/proxy", "", 1)
        target_url = f"{API_BASE_URL}{target_path}"

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        is_streaming = body and b'"streaming"' in body

        try:
            if is_streaming and method == "POST" and HAS_REQUESTS:
                self.proxy_streaming_requests(target_url, body)
            elif is_streaming and method == "POST":
                self.proxy_streaming_urllib(target_url, body)
            else:
                self.proxy_normal(target_url, body, method)
        except urllib.request.HTTPError as e:
            error_body = e.read().decode(errors="replace")
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(error_body.encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def proxy_normal(self, target_url, body, method):
        """处理普通请求"""
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Dify Proxy)",
        }
        req = urllib.request.Request(target_url, data=body, headers=headers, method=method)
        resp = urllib.request.urlopen(req, timeout=60)
        self.send_response(resp.status)
        self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
        self.end_headers()
        self.wfile.write(resp.read())

    def proxy_streaming_requests(self, target_url, body):
        """使用 requests 库进行 SSE 流式代理"""
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Dify Proxy)",
        }
        body_json = json.loads(body) if isinstance(body, bytes) else json.loads(body)

        print(f"[Proxy] 开始流式请求 -> {target_url}")

        # 先请求 Dify，再用 chunked 方式转发
        r = req_lib.post(target_url, json=body_json, headers=headers, stream=True, timeout=120)
        ct = r.headers.get("Content-Type", "")

        # 如果 Dify 没有返回流式内容，当作普通响应处理
        if r.status_code != 200 or "text/event-stream" not in ct:
            print(f"[Proxy] 非流式响应 status={r.status_code} ct={ct}")
            self.send_response(r.status_code)
            self.send_header("Content-Type", ct or "application/json")
            self.end_headers()
            self.wfile.write(r.content)
            r.close()
            return

        # 发送 SSE 响应头
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()

        try:
            chunk_count = 0
            for chunk in r.iter_content(chunk_size=1024):
                if chunk:
                    self.wfile.write(chunk)
                    self.wfile.flush()
                    chunk_count += 1
            print(f"[Proxy] 流式转发完成，共 {chunk_count} 个 chunk")
        except Exception as e:
            print(f"[Proxy] 流式传输中断: {e}")
        finally:
            r.close()

    def proxy_streaming_urllib(self, target_url, body):
        """使用 urllib 进行 SSE 流式代理 (fallback)"""
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Dify Proxy)",
        }
        req = urllib.request.Request(target_url, data=body, headers=headers)
        resp = urllib.request.urlopen(req, timeout=120)

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()

        try:
            while True:
                chunk = resp.read(8192)
                if not chunk:
                    break
                self.wfile.write(chunk)
                self.wfile.flush()
        except Exception:
            pass
        finally:
            resp.close()

    def end_headers(self):
        self.send_cors_headers()
        super().end_headers()

    def log_message(self, format, *args):
        print(f"[Proxy] {self.address_string()} - {format % args}")


class ThreadedHTTPServer(http.server.HTTPServer):
    """多线程 HTTP 服务器，支持并发请求"""
    def process_request(self, request, client_address):
        thread = threading.Thread(target=self.process_request_thread,
                                   args=(request, client_address))
        thread.daemon = True
        thread.start()

    def process_request_thread(self, request, client_address):
        try:
            self.finish_request(request, client_address)
        except Exception:
            self.handle_error(request, client_address)
        finally:
            self.shutdown_request(request)


if __name__ == "__main__":
    if not API_KEY:
        print("[ERROR] 请设置环境变量 DIFY_API_KEY")
        print("        PowerShell: $env:DIFY_API_KEY='your-api-key'")
        print("        CMD:        set DIFY_API_KEY=your-api-key")
        exit(1)
    port = 8088
    server = ThreadedHTTPServer(("", port), ProxyHandler)
    print(f"[OK] Dify Proxy Server running at http://localhost:{port}")
    print(f"     Proxy path: /proxy/ -> {API_BASE_URL}")
    print(f"     Static files served from: {os.getcwd()}")
    print(f"     requests library: {'available' if HAS_REQUESTS else 'NOT available (using fallback)'}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()
