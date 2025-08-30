# scripts/extractor_wsgi.py
from scripts.extract_answers import app

@app.get("/healthz")
def healthz():
    return {"ok": True}
