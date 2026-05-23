from pathlib import Path
import runpy


ROOT = Path(__file__).resolve().parents[2]
APP_PATH = ROOT / "ai-model" / "app.py"


if __name__ == "__main__":
    runpy.run_path(str(APP_PATH), run_name="__main__")
