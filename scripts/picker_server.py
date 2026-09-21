#!/usr/bin/env python3
"""Local picker server: serves the repo AND applies photo picks (writes files).

The plain `python -m http.server` can't accept writes, so the picker uses this.
  POST /pick  {"slug":..,"index":N}  -> copy candidate N to assets/actors/<slug>.jpg, mark verdict ok
  POST /none  {"slug":..}            -> mark verdict reject / needs-manual
Open  http://localhost:8090/picker.html

  python3 scripts/picker_server.py [port]
"""
import json, os, sys, shutil
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERD = f"{ROOT}/data/actor_verdicts.json"


def update_verdict(slug, verdict, issue):
    v = json.load(open(VERD)) if os.path.exists(VERD) else {}
    v[slug] = {"verdict": verdict, "issue": issue}
    json.dump(v, open(VERD, "w"), ensure_ascii=False, indent=1)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        try:
            data = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return self._json(400, {"error": "bad json"})
        slug = data.get("slug", "")
        if self.path == "/pick":
            src = f"{ROOT}/assets/candidates/{slug}/{int(data['index'])}.jpg"
            dst = f"{ROOT}/assets/actors/{slug}.jpg"
            if not os.path.exists(src):
                return self._json(404, {"error": "no such candidate"})
            shutil.copy(src, dst)
            update_verdict(slug, "ok", "user-picked")
            return self._json(200, {"ok": True, "slug": slug})
        if self.path == "/none":
            update_verdict(slug, "reject", "needs-manual")
            return self._json(200, {"ok": True, "slug": slug})
        if self.path == "/approve":  # review page: confirm photo is correct
            update_verdict(slug, "ok", "user-ok")
            return self._json(200, {"ok": True, "slug": slug})
        if self.path == "/reject":   # review page: flag photo wrong
            update_verdict(slug, "reject", "user-wrong")
            return self._json(200, {"ok": True, "slug": slug})
        self._json(404, {"error": "unknown path"})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
    print(f"picker server on http://localhost:{port}/picker.html", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
