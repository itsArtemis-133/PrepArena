# scripts/extractor_wsgi.py
from extract_answers import app

@app.get("/healthz")
def healthz():
    return {"ok": True}
