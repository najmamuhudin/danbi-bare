from pathlib import Path
from urllib.parse import urlparse
import csv
import io
import logging
import os
import re

from bs4 import BeautifulSoup
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

from preprocessing import preprocess_text
from utils.model_io import artifact_info, load_model_artifacts


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.environ.get("MODEL_PATH", BASE_DIR / "model.pkl"))
VECTORIZER_PATH = Path(os.environ.get("VECTORIZER_PATH", BASE_DIR / "vectorizer.pkl"))
CRIME_PROBABILITY_THRESHOLD = float(os.environ.get("CRIME_PROBABILITY_THRESHOLD", "0.70"))

CRIME_LABELS = {"1", "crime", "crime-related", "crime_related", "true"}
SAFE_LABELS = {"0", "safe", "not crime", "not-crime", "not crime-related", "not_crime_related", "false"}
app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

model = None
vectorizer = None
model_error = None


class ModelUnavailableError(RuntimeError):
    pass


def load_runtime_model():
    global model, vectorizer, model_error

    try:
        model, vectorizer = load_model_artifacts(MODEL_PATH, VECTORIZER_PATH)
        model_error = None
        logger.info("Loaded model from %s", MODEL_PATH)
        logger.info("Loaded vectorizer from %s", VECTORIZER_PATH)
    except Exception as exc:
        model = None
        vectorizer = None
        model_error = str(exc)
        logger.exception("Failed to load ML model artifacts")


def is_crime_label(label):
    normalized = str(label).strip().lower()
    if normalized in CRIME_LABELS:
        return True
    if normalized in SAFE_LABELS:
        return False
    try:
        return int(label) == 1
    except (TypeError, ValueError):
        return False


def class_probability(probabilities, classes, matcher):
    for index, label in enumerate(classes):
        if matcher(label):
            return float(probabilities[index])
    return None


def classify_text_value(text):
    processed = preprocess_text(text)

    if model is None or vectorizer is None:
        raise ModelUnavailableError(
            "ML model is not loaded. Prediction is disabled until model.pkl and "
            "vectorizer.pkl are available and compatible."
        )

    features = vectorizer.transform([processed])
    raw_prediction = model.predict(features)[0]
    is_crime = is_crime_label(raw_prediction)
    prediction = "crime-related" if is_crime else "not crime-related"
    confidence = 0.85
    crime_probability = None

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(features)[0]
        classes = list(getattr(model, "classes_", []))
        crime_probability = class_probability(probabilities, classes, is_crime_label)
        try:
            class_index = classes.index(raw_prediction)
        except ValueError:
            class_index = int(probabilities.argmax())

        if crime_probability is not None and crime_probability < CRIME_PROBABILITY_THRESHOLD:
            is_crime = False
            prediction = "not crime-related"
            safe_probability = class_probability(probabilities, classes, lambda label: not is_crime_label(label))
            confidence = safe_probability if safe_probability is not None else 1 - crime_probability
        else:
            confidence = float(probabilities[class_index])

    return {
        "prediction": prediction,
        "is_crime": bool(is_crime),
        "confidence": round(confidence * 100, 1),
        "crime_probability": round(crime_probability * 100, 1) if crime_probability is not None else None,
        "crime_threshold": round(CRIME_PROBABILITY_THRESHOLD * 100, 1),
        "processed_text": processed,
        "model_loaded": True,
    }


@app.errorhandler(ModelUnavailableError)
def handle_model_unavailable(exc):
    return jsonify({
        "error": str(exc),
        "model_loaded": False,
        "model_error": model_error,
    }), 503


def scrape_url(url):
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
        )
    }
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()

    soup = BeautifulSoup(response.content, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        tag.decompose()

    title = soup.find("title")
    title_text = title.get_text(" ", strip=True) if title else ""
    content_nodes = soup.find_all(
        ["article", "main", "section", "div"],
        class_=re.compile(r"content|article|post|story|text|body", re.I),
    )
    if content_nodes:
        text = " ".join(node.get_text(" ", strip=True) for node in content_nodes[:4])
    else:
        text = soup.get_text(" ", strip=True)

    text = re.sub(r"\s+", " ", text).strip()
    return {
        "title": title_text,
        "content": text[:2000],
        "full_content": text,
    }


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None,
        "model_error": model_error,
    })


@app.get("/api/model/info")
def model_info():
    info = {
        "model_loaded": model is not None,
        "model_error": model_error,
        "model_path": str(MODEL_PATH),
        "vectorizer_path": str(VECTORIZER_PATH),
        "crime_probability_threshold": round(CRIME_PROBABILITY_THRESHOLD * 100, 1),
        "features": [
            "TF-IDF vectorization",
            "Somali text normalization",
            "URL and email cleanup",
            "Text normalization",
        ],
    }
    if model is not None and vectorizer is not None:
        info.update(artifact_info(model, vectorizer))
    return jsonify(info)


@app.post("/api/classify/text")
def classify_text_endpoint():
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()
    if not text:
        return jsonify({"error": "Text is required"}), 400
    return jsonify(classify_text_value(text))


@app.post("/api/classify/batch")
def classify_batch_endpoint():
    data = request.get_json(silent=True) or {}
    texts = data.get("texts")
    if not isinstance(texts, list) or not texts:
        return jsonify({"error": "Texts array is required"}), 400

    results = []
    for text in texts:
        text = str(text).strip()
        if text:
            results.append({
                "text": text,
                **classify_text_value(text),
            })

    crime_count = sum(1 for item in results if item["is_crime"])
    return jsonify({
        "results": results,
        "summary": {
            "total": len(results),
            "crime_count": crime_count,
            "not_crime_count": len(results) - crime_count,
            "crime_percentage": round((crime_count / len(results)) * 100, 1) if results else 0,
        },
    })


def extract_file_rows(content, filename):
    extension = Path(filename).suffix.lower()

    if extension == ".csv":
        rows = []
        reader = csv.reader(io.StringIO(content))
        for row in reader:
            row_text = " ".join(str(cell).strip() for cell in row if str(cell).strip())
            if row_text:
                rows.append(row_text)
        return rows

    return [
        line.strip()
        for line in content.splitlines()
        if line.strip()
    ]


@app.post("/api/classify/file")
def classify_file_endpoint():
    uploaded = request.files.get("file")
    if uploaded is None or not uploaded.filename:
        return jsonify({"error": "File is required"}), 400

    content = uploaded.read().decode("utf-8", errors="ignore")
    segments = extract_file_rows(content, uploaded.filename)

    if not segments:
        overall = classify_text_value(content)
        return jsonify({
            "filename": uploaded.filename,
            "overall": overall,
            "segments": [],
            "summary": {
                "total_segments": 1,
                "total_rows": 1,
                "crime_count": 1 if overall["is_crime"] else 0,
                "not_crime_count": 0 if overall["is_crime"] else 1,
                "crime_percentage": 100 if overall["is_crime"] else 0,
            },
        })

    segment_results = []
    for index, segment in enumerate(segments, start=1):
        segment_results.append({
            "segment_id": index,
            "row_number": index,
            "text": segment,
            **classify_text_value(segment),
        })

    overall = classify_text_value(content[:3000])
    crime_count = sum(1 for item in segment_results if item["is_crime"])
    return jsonify({
        "filename": uploaded.filename,
        "overall": overall,
        "segments": segment_results,
        "summary": {
            "total_segments": len(segment_results),
            "total_rows": len(segment_results),
            "crime_count": crime_count,
            "not_crime_count": len(segment_results) - crime_count,
            "crime_percentage": round((crime_count / len(segment_results)) * 100, 1),
        },
    })


@app.post("/api/classify/url")
def classify_url_endpoint():
    data = request.get_json(silent=True) or {}
    url = str(data.get("url", "")).strip()
    if not url:
        return jsonify({"error": "URL is required"}), 400

    parsed = urlparse(url)
    if not parsed.scheme:
        url = "https://" + url
        parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return jsonify({"error": "Only http and https URLs are supported"}), 400

    try:
        scraped = scrape_url(url)
    except Exception as exc:
        return jsonify({"error": f"Failed to scrape URL: {exc}"}), 400

    result = classify_text_value(f"{scraped['title']} {scraped['content']}")
    return jsonify({
        **result,
        "url": url,
        "scraped_title": scraped["title"],
        "scraped_content": scraped["full_content"],
    })


load_runtime_model()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
