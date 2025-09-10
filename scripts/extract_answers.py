import re
import uuid
import os
import pdfplumber
from flask import Flask, request, jsonify

# --- UNIVERSAL EXTRACTION LOGIC ---

def extract_candidate_keys(text: str, max_q: int):
    """
    Try all extraction formats. Returns a dict of {strategy_name: {q: ans, ...}}
    """
    candidates = {}

    # --- Strategy 1: Clean Table Format: 1. (d) ---
    clean_tbl = re.findall(r'(\d{1,3})\.\s*\(([a-dA-D])\)', text)
    if clean_tbl:
        candidates['clean_table'] = {
            str(int(num)): ans.upper() for num, ans in clean_tbl
        }

    # --- Strategy 2: Sequential List Format: Ans) d ---
    seq_list = re.findall(r'Ans\)\s*([a-dA-D])', text)
    if seq_list:
        candidates['sequential_list'] = {
            str(i + 1): ans.upper() for i, ans in enumerate(seq_list)
        }

    # --- Strategy 3: Messy Token Table: 1. (d) as separate tokens ---
    tokens = re.split(r'[\s,\n]+', text)
    key3 = {}
    for i in range(len(tokens) - 1):
        if re.fullmatch(r'(\d{1,3})\.', tokens[i]):
            m = re.fullmatch(r'\(([a-dA-D])\)', tokens[i + 1])
            if m:
                num = tokens[i][:-1]
                ans = m.group(1).upper()
                key3[num] = ans
    if key3:
        candidates['token_pair'] = key3

    return candidates


def select_best_key(candidates, max_q):
    """
    Choose the candidate whose number of answers is CLOSEST to max_q.
    Use the priority order in case of a tie.
    """
    results = []
    for name, key in candidates.items():
        diff = abs(len(key) - max_q)
        results.append((diff, -len(key), name, key))
    if not results:
        return {}
    # Priority: clean_table > token_pair > sequential_list
    priority = ["clean_table", "token_pair", "sequential_list"]
    results.sort(
        key=lambda x: (
            x[0],
            x[1],
            priority.index(x[2]) if x[2] in priority else 99,
        )
    )
    return results[0][3]


def extract_answers(text: str, max_q: int):
    """
    Full extraction pipeline: tries all formats, picks the best,
    pads/ensures all questions up to max_q.
    """
    candidates = extract_candidate_keys(text, max_q)
    key = select_best_key(candidates, max_q)
    # Pad/make sure all 1...max_q included, as strings
    answers = {}
    for i in range(1, max_q + 1):
        answers[str(i)] = key.get(str(i), "")
    return answers


# --- FLASK APP + ROUTE ---

app = Flask(__name__)


@app.route("/extract", methods=["POST"])
def extract():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        max_q = int(request.form.get("max_q", 100))
    except Exception:
        max_q = 100

    file = request.files["file"]
    # unique temp filename avoids collisions
    temp_path = os.path.join("/tmp", f"{uuid.uuid4().hex}.pdf")

    try:
        file.save(temp_path)

        with pdfplumber.open(temp_path) as pdf:
            texts = [page.extract_text() or "" for page in pdf.pages]
        text = "\n".join(texts)

        # quick debug logs (only show in Railway logs, not user response)
        print(f"[Extractor] Pages: {len(texts)}, Total chars: {len(text)}")

        answers = extract_answers(text, max_q)
        return jsonify({"answers": answers})

    except Exception as e:
        print("[Extractor ERROR]", e)
        return jsonify({"error": f"Failed to process PDF: {e}"}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/healthz")
def healthz():
    return {"ok": True}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))  # Railway gives $PORT
    app.run(host="0.0.0.0", port=port, debug=True)
