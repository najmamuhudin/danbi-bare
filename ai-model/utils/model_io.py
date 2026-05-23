from pathlib import Path

import joblib


def load_model_artifacts(model_path, vectorizer_path):
    model_path = Path(model_path)
    vectorizer_path = Path(vectorizer_path)

    missing = [
        str(path)
        for path in (model_path, vectorizer_path)
        if not path.exists()
    ]
    if missing:
        raise FileNotFoundError("Missing model artifact(s): " + ", ".join(missing))

    model = joblib.load(model_path)
    vectorizer = joblib.load(vectorizer_path)

    if not hasattr(model, "predict"):
        raise TypeError("Loaded model does not implement predict().")
    if not hasattr(vectorizer, "transform"):
        raise TypeError("Loaded vectorizer does not implement transform().")

    sample = vectorizer.transform(["model health check"])
    expected_features = getattr(model, "n_features_in_", sample.shape[1])
    if expected_features != sample.shape[1]:
        raise ValueError(
            f"Model expects {expected_features} features, "
            f"but vectorizer produces {sample.shape[1]}."
        )

    return model, vectorizer


def artifact_info(model, vectorizer):
    classes = getattr(model, "classes_", [])
    return {
        "model_type": type(model).__name__,
        "vectorizer_type": type(vectorizer).__name__,
        "classes": [str(value) for value in classes],
        "feature_count": int(getattr(vectorizer, "max_features", 0) or len(getattr(vectorizer, "vocabulary_", {}))),
    }
