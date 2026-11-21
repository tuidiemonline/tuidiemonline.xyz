from http.server import BaseHTTPRequestHandler, HTTPServer
import json

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, obj):
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(obj).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200); self._cors(); self.end_headers()

    def do_GET(self):
        self._json({"status": "ok", "brevo": "mock"})

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if self.path.startswith("/api/verify-otp"):
            self._json({"ok": True, "msg": "Xac thuc thanh cong (TEST)"})
        else:
            self._json({"ok": True, "msg": "Da gui ma OTP (TEST LOCAL)"})

if __name__ == "__main__":
    print("Mock OTP 3000 · tra {ok:true}")
    HTTPServer(("0.0.0.0", 3000), H).serve_forever()
