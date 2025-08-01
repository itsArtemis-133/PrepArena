from flask import Flask, request, jsonify
import pdfplumber
import re
import os
from typing import Dict, List, Any

app = Flask(__name__)

# --- Strategy 1: For clean, well-formatted tables like in VAJIRAM_T1 ---
def _extract_strategy_table(text: str) -> Dict[int, str]:
    """Finds patterns like '1. (d)' where the number and answer are adjacent."""
    key = {}
    pattern = re.compile(r"(\d{1,3})\.\s*\(([a-d])\)", re.IGNORECASE)
    matches = pattern.findall(text)
    if matches:
        key = {int(num): ans.upper() for num, ans in matches}
    return dict(sorted(key.items()))

# --- Strategy 2: For sequential formats like in SFG-2024 ---
def _extract_strategy_sequential(text: str) -> Dict[int, str]:
    """Finds sequential patterns like 'Ans) d' and numbers them in order."""
    key = {}
    pattern = re.compile(r"Ans\)\s*([a-d])", re.IGNORECASE)
    matches = pattern.findall(text)
    if matches:
        key = {i + 1: ans.upper() for i, ans in enumerate(matches)}
    return key

# --- Strategy 3: For poorly extracted tables like in PTSGS1001 ---
def _extract_strategy_token_pairing(text: str) -> Dict[int, str]:
    """
    Handles messy text by breaking it into words ('tokens') and finding
    adjacent pairs of '1.' and '(d)'. This is robust against formatting errors.
    """
    key = {}
    # Clean up common extraction artifacts and split text into a list of words
    cleaned_text = re.sub(r'[",]', ' ', text)
    tokens = cleaned_text.split()

    if len(tokens) < 2:
        return {}

    # Iterate through the list of tokens, looking for adjacent pairs
    for i in range(len(tokens) - 1):
        current_token = tokens[i]
        next_token = tokens[i+1]
        
        # Check if the current token is a question number (e.g., "1.")
        q_match = re.fullmatch(r'(\d{1,3})\.', current_token)
        if q_match:
            # If it is, check if the NEXT token is an answer (e.g., "(d)")
            a_match = re.fullmatch(r'\(([a-d])\)', next_token, re.IGNORECASE)
            if a_match:
                q_num = int(q_match.group(1))
                answer = a_match.group(1).upper()
                key[q_num] = answer
    
    return dict(sorted(key.items()))

# --- The Main "Smart Dispatcher" Function ---
def extract_key_intelligently(pdf_path: str) -> Dict[int, str]:
    """
    The main extraction engine. It opens the PDF and tries multiple, ordered
    strategies to find the most accurate answer key.
    """
    text_by_page = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text_by_page.append(page.extract_text() or "")
    except Exception as e:
        print(f"Error reading PDF file: {e}")
        return {}

    full_text = "\n".join(text_by_page)
    first_page_text = text_by_page[0] if text_by_page else ""
    
    # --- Try strategies in order of confidence and specificity ---
    
    print("INFO: Attempting Strategy 1 (Clean Table)...")
    key = _extract_strategy_table(full_text)
    if len(key) >= 50: # Confidence threshold
        print("SUCCESS: Strategy 1 found a valid key.")
        return key

    print("INFO: Attempting Strategy 2 (Sequential 'Ans)')...")
    key = _extract_strategy_sequential(full_text)
    if len(key) >= 50:
        print("SUCCESS: Strategy 2 found a valid key.")
        return key
        
    print("INFO: Attempting Strategy 3 (Token Pairing for Messy Tables)...")
    # This strategy is best for keys summarized on the first page.
    key = _extract_strategy_token_pairing(first_page_text)
    if len(key) >= 50:
        print("SUCCESS: Strategy 3 found a valid key.")
        return key

    print("WARNING: No strategy could confidently extract the answer key.")
    return {}

@app.route('/extract', methods=['POST'])
def extract():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    max_q = int(request.form.get('max_q', 100))
    file = request.files['file']
    temp_path = os.path.join('/tmp', file.filename)
    
    try:
        file.save(temp_path)

        # Call the single, intelligent dispatcher function
        extracted_keys = extract_key_intelligently(temp_path)

        # Prepare the final response, filling in blanks
        final_answers = {qn: extracted_keys.get(qn, "") for qn in range(1, max_q + 1)}

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': 'Failed to process PDF file'}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
    return jsonify({'answers': final_answers})

if __name__ == '__main__':
    if not os.path.exists('/tmp'):
        os.makedirs('/tmp')
    app.run(port=8001, debug=True)