import joblib
from pathlib import Path

model_path = Path(__file__).resolve().parents[1] / 'ai-model' / 'model.pkl'
vectorizer_path = Path(__file__).resolve().parents[1] / 'ai-model' / 'vectorizer.pkl'
try:
    model = joblib.load(model_path)
    vectorizer = joblib.load(vectorizer_path)
    print("Model classes:", model.classes_)
    print("Vectorizer:", type(vectorizer).__name__)
    print("Features:", len(vectorizer.vocabulary_))
except Exception as e:
    print("Error:", e)
