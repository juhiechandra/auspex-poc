import os
import json
import re
import httpx
from pathlib import Path
from datetime import datetime

PROMPTS_DIR = Path(__file__).parent / "prompts"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"

# API key from environment variable
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")


def log(step: str, message: str, data: any = None):
    """Log a message with timestamp and step info."""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"\n{'='*60}")
    print(f"[{timestamp}] GEMINI - {step}")
    print(f"{'='*60}")
    print(f">> {message}")
    if data:
        if isinstance(data, dict) or isinstance(data, list):
            print(f"\n{json.dumps(data, indent=2)[:2000]}")
        else:
            print(f"\n{str(data)[:2000]}")
    print(f"{'='*60}\n")


def load_prompt(filename: str) -> str:
    """Load a prompt template from the prompts directory."""
    filepath = PROMPTS_DIR / filename
    with open(filepath, "r") as f:
        return f.read()


class GeminiClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or GEMINI_API_KEY
        self.model = "gemini-2.5-flash"  # Using 2.5 flash which has available quota
        log("INIT", f"Initialized Gemini client with model: {self.model}")

    def _invoke(self, prompt: str, image_base64: str = None, media_type: str = "image/png", max_tokens: int = 4096, step_name: str = "INVOKE") -> str:
        """Invoke the Gemini API."""
        log(step_name, f"Sending request to Gemini (model: {self.model}, max_tokens: {max_tokens})")

        url = f"{GEMINI_API_URL}/{self.model}:generateContent?key={self.api_key}"

        # Build the parts array
        parts = []

        if image_base64:
            parts.append({
                "inline_data": {
                    "mime_type": media_type,
                    "data": image_base64
                }
            })

        parts.append({"text": prompt})

        payload = {
            "contents": [{
                "parts": parts
            }],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": 0.7
            }
        }

        with httpx.Client(timeout=120.0) as client:
            response = client.post(url, json=payload)
            if response.status_code != 200:
                log(step_name, f"ERROR from Gemini API: {response.status_code}")
                log(step_name, f"Response: {response.text}")
                response.raise_for_status()
            result = response.json()

        # Extract text from response
        try:
            text = result["candidates"][0]["content"]["parts"][0]["text"]
            log(step_name, "Received response from Gemini", {
                "response_length": len(text)
            })
            return text
        except (KeyError, IndexError) as e:
            log(step_name, f"Failed to parse Gemini response: {result}")
            raise ValueError(f"Invalid Gemini response format: {e}")

    def _extract_json(self, text: str, step_name: str = "PARSE") -> dict:
        """Extract JSON from model response text."""
        log(step_name, "Extracting JSON from response...")

        # Try to find JSON in code blocks first
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if json_match:
            log(step_name, "Found JSON in code block")
            text = json_match.group(1)

        # Try to parse the text as JSON
        try:
            parsed = json.loads(text)
            log(step_name, "Successfully parsed JSON", parsed)
            return parsed
        except json.JSONDecodeError:
            # Try to find JSON object in text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                parsed = json.loads(text[start:end])
                log(step_name, "Extracted JSON from text", parsed)
                return parsed
            log(step_name, f"FAILED to extract JSON. Raw text: {text[:500]}")
            raise ValueError(f"Could not extract JSON from response: {text[:500]}")

    def analyze_diagram(self, image_base64: str, media_type: str = "image/png") -> dict:
        """Step 1: Analyze the architecture diagram."""
        log("STEP-1", "STARTING ARCHITECTURE DIAGRAM ANALYSIS")

        prompt = load_prompt("step1_analyze.txt")
        response_text = self._invoke(prompt, image_base64, media_type, max_tokens=8192, step_name="STEP-1")

        log("STEP-1", "Raw response:", response_text[:2000])
        parsed = self._extract_json(response_text, step_name="STEP-1")

        log("STEP-1", "ARCHITECTURE ANALYSIS COMPLETE", {
            "entry_points_count": len(parsed.get("entry_points", [])),
            "data_flows_count": len(parsed.get("data_flows", [])),
        })

        return parsed

    def extract_components(self, image_base64: str, media_type: str = "image/png") -> dict:
        """Step 2: Extract components directly from image using 3 specialized prompts."""
        log("STEP-2", "STARTING COMPONENT EXTRACTION")

        results = {}

        # PROMPT 2A: Application Description
        log("STEP-2A", "EXTRACTING APPLICATION DESCRIPTION")
        prompt1 = load_prompt("step2_A_application_description.txt")
        response1 = self._invoke(prompt1, image_base64, media_type, max_tokens=8192, step_name="STEP-2A")
        parsed1 = self._extract_json(response1, step_name="STEP-2A")
        results["application_description"] = parsed1.get("application_description", "")

        # PROMPT 2B: Key Features
        log("STEP-2B", "EXTRACTING KEY FEATURES")
        prompt2 = load_prompt("step2_B_key_features.txt")
        response2 = self._invoke(prompt2, image_base64, media_type, max_tokens=8192, step_name="STEP-2B")
        parsed2 = self._extract_json(response2, step_name="STEP-2B")
        results["key_features"] = parsed2.get("key_features", [])

        # PROMPT 2C: In-Scope Components
        log("STEP-2C", "EXTRACTING IN-SCOPE COMPONENTS")
        prompt3 = load_prompt("step2_C_in_scope_components.txt")
        response3 = self._invoke(prompt3, image_base64, media_type, max_tokens=8192, step_name="STEP-2C")
        parsed3 = self._extract_json(response3, step_name="STEP-2C")

        components = parsed3.get("in_scope_components", [])
        if components and isinstance(components[0], dict):
            results["in_scope_components"] = components
        else:
            results["in_scope_components"] = [{"name": c, "category": "other"} for c in components]

        log("STEP-2", "COMPONENT EXTRACTION COMPLETE", {
            "description_length": len(results.get("application_description", "")),
            "features_count": len(results.get("key_features", [])),
            "components_count": len(results.get("in_scope_components", []))
        })

        return results

    def generate_threats(
        self,
        application_description: str,
        in_scope_components: list,
        key_features: list,
        template: str = "baseline"
    ) -> dict:
        """Step 3: Generate threat scenarios."""
        log("STEP-3", f"STARTING THREAT GENERATION (template: {template})")

        template_file = f"step3_{template}.txt"
        prompt_template = load_prompt(template_file)

        if in_scope_components and isinstance(in_scope_components[0], dict):
            components_str = json.dumps([c.get("name", str(c)) for c in in_scope_components])
        else:
            components_str = json.dumps(in_scope_components)

        prompt = prompt_template.replace(
            "{application_description}", application_description
        ).replace(
            "{in_scope_components}", components_str
        ).replace(
            "{key_features}", json.dumps(key_features)
        )

        response_text = self._invoke(prompt, max_tokens=8192, step_name="STEP-3")

        log("STEP-3", "Raw response:", response_text[:2000])
        parsed = self._extract_json(response_text, step_name="STEP-3")

        # Normalize threats - convert list fields to strings
        if "threats" in parsed:
            for threat in parsed["threats"]:
                if isinstance(threat.get("mitigations"), list):
                    threat["mitigations"] = " ".join(threat["mitigations"])
                if isinstance(threat.get("mitre_technique"), list):
                    threat["mitre_technique"] = ", ".join(threat["mitre_technique"])

        log("STEP-3", "THREAT GENERATION COMPLETE", {"threats_count": len(parsed.get("threats", []))})

        return parsed
