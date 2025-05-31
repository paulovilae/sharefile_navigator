import os
from typing import Optional

import httpx
from app.utils.cache_utils import cache_llm_score


@cache_llm_score
async def get_llm_quality_score(text: str, system_prompt: str) -> Optional[float]:
    '''
    Connects to either Gemini or Ollama based on configuration, calls the LLM with the extracted text
    and system prompt to get a numerical quality score.

    Args:
        text: The extracted text from OCR.
        system_prompt: The system prompt to be used for assessing OCR quality.

    Returns:
        A numerical quality score (float) if successful, None otherwise.
    '''
    llm_provider = os.environ.get("LLM_PROVIDER", "Gemini").lower()

    if llm_provider == "gemini":
        return await _get_gemini_quality_score(text, system_prompt)
    elif llm_provider == "ollama":
        return await _get_ollama_quality_score(text, system_prompt)
    else:
        print(f"Error: Invalid LLM provider: {llm_provider}")
        return None


async def _get_gemini_quality_score(text: str, system_prompt: str) -> Optional[float]:
    '''
    Connects to the Gemini API, calls the LLM with the extracted text and system prompt to get a
    numerical quality score.

    Args:
        text: The extracted text from OCR.
        system_prompt: The system prompt to be used for assessing OCR quality.

    Returns:
        A numerical quality score (float) if successful, None otherwise.
    '''
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    gemini_api_endpoint = os.environ.get(
        "GEMINI_API_ENDPOINT", "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent"
    )  # Use a default endpoint

    if not gemini_api_key:
        print("Error: GEMINI_API_KEY not set")
        return None

    url = f"{gemini_api_endpoint}?key={gemini_api_key}"
    headers = {"Content-Type": "application/json"}
    data = {
        "contents": [
            {
                "parts": [
                    {"text": system_prompt + f"\\nExtracted Text: {text}"}
                ]
            }
        ]
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=data, timeout=60)
            response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
            response_json = response.json()

            # Extract the quality score from the response
            candidates = response_json.get("candidates", [])
            if candidates:
                content = candidates[0].get("content", {})
                parts = content.get("parts", [])
                if parts:
                    text_response = parts[0].get("text", "")
                    try:
                        quality_score = float(text_response)
                        return quality_score
                    except ValueError:
                        print(f"Error: Could not convert LLM response to float: {text_response}")
                        return None
                else:
                    print("Error: No parts found in Gemini response")
                    return None
            else:
                print("Error: No candidates found in Gemini response")
            return None

    except httpx.HTTPStatusError as e:
        print(f"HTTP error: {e.response.status_code} - {e.response.text}")
        return None
    except httpx.RequestError as e:
        print(f"Request error: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None


async def _get_ollama_quality_score(text: str, system_prompt: str) -> Optional[float]:
    '''
    Connects to the Ollama API, calls the LLM with the extracted text and system prompt to get a
    numerical quality score.

    Args:
        text: The extracted text from OCR.
        system_prompt: The system prompt to be used for assessing OCR quality.

    Returns:
        A numerical quality score (float) if successful, None otherwise.
    '''
    ollama_api_endpoint = os.environ.get("OLLAMA_API_ENDPOINT", "http://localhost:11434/api/generate")

    headers = {"Content-Type": "application/json"}
    data = {
        "prompt": system_prompt + f"\\nExtracted Text: {text}",
        "model": "mistral",  # You can change the model here
        "stream": False,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(ollama_api_endpoint, headers=headers, json=data, timeout=60)
            response.raise_for_status()
            response_json = response.json()
            response_text = response_json.get("response", "")

            try:
                quality_score = float(response_text)
                return quality_score
            except ValueError:
                print(f"Error: Could not convert LLM response to float: {response_text}")
                return None

    except httpx.HTTPStatusError as e:
        print(f"HTTP error: {e.response.status_code} - {e.response.text}")
        return None
    except httpx.RequestError as e:
        print(f"Request error: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None