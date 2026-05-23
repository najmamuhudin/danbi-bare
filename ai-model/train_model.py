from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

from preprocessing import preprocess_text


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATASET_PATH = PROJECT_ROOT / "model" / "dataset.csv.csv"
MODEL_PATH = BASE_DIR / "model.pkl"
VECTORIZER_PATH = BASE_DIR / "vectorizer.pkl"


def read_dataset(path):
    last_error = None
    for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin1"):
        try:
            return pd.read_csv(path, encoding=encoding, on_bad_lines="skip")
        except UnicodeDecodeError as exc:
            last_error = exc
    raise last_error


def main():
    df = read_dataset(DATASET_PATH)
    df = df.dropna(subset=["text", "category"]).copy()
    df["text"] = df["text"].map(preprocess_text)
    df = df[df["text"].str.len() > 0]

    x_train, x_test, y_train, y_test = train_test_split(
        df["text"],
        df["category"],
        test_size=0.2,
        random_state=42,
        stratify=df["category"],
    )

    vectorizer = TfidfVectorizer(
        max_features=300,
        min_df=2,
        max_df=0.95,
        ngram_range=(1, 2),
    )
    x_train_vec = vectorizer.fit_transform(x_train)
    x_test_vec = vectorizer.transform(x_test)

    model = LogisticRegression(
        max_iter=1000,
        random_state=42,
        class_weight="balanced",
    )
    model.fit(x_train_vec, y_train)

    predictions = model.predict(x_test_vec)
    print(f"Accuracy: {accuracy_score(y_test, predictions):.4f}")
    print(classification_report(y_test, predictions))

    joblib.dump(model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    print(f"Saved model to {MODEL_PATH}")
    print(f"Saved vectorizer to {VECTORIZER_PATH}")


if __name__ == "__main__":
    main()
