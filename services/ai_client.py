import os
import requests
import json
from typing import Optional, Any

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

def generate_text(prompt: str, model: Optional[str] = None, temperature: float = 0.2) -> str:
    """Generate text using local Ollama instance."""
    model = model or OLLAMA_MODEL
    
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature
        }
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json().get("response", "")
    except Exception as e:
        print(f"Ollama error: {e}")
        return f"Error connecting to Ollama: {str(e)}"

def chat(messages: list, model: Optional[str] = None, temperature: float = 0.2) -> str:

    """Chat using local Ollama instance."""

    model = model or OLLAMA_MODEL

    

    url = f"{OLLAMA_BASE_URL}/api/chat"

    payload = {

        "model": model,

        "messages": messages,

        "stream": False,

        "options": {

            "temperature": temperature

        }

    }

    

    try:

        response = requests.post(url, json=payload)

        response.raise_for_status()

        return response.json().get("message", {}).get("content", "")

    except Exception as e:

        print(f"Ollama error: {e}")

        return f"Error connecting to Ollama: {str(e)}"



def ensure_model_available(model: Optional[str] = None):

    """Check if model exists, if not, pull it."""

    model = model or OLLAMA_MODEL

    

    # Check if model exists

    try:

        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags")

        if response.status_code == 200:

            models = response.json().get("models", [])

            if any(m.get("name") == f"{model}:latest" or m.get("name") == model for m in models):

                print(f" Model {model} is already available.")

                return True

    except Exception as e:

        print(f"Error checking models: {e}")



    # Pull model

    print(f" Pulling model {model}...")

    try:

        response = requests.post(

            f"{OLLAMA_BASE_URL}/api/pull",

            json={"model": model, "stream": False},

            timeout=600 # 10 minutes timeout for pull

        )

        response.raise_for_status()

        print(f" Model {model} pulled successfully.")

        return True

    except Exception as e:

        print(f"Error pulling model: {e}")

        return False