import boto3
import json
import re
from pathlib import Path
from datetime import datetime

PROMPTS_DIR = Path(__file__).parent / "prompts"


def log(step: str, message: str, data: any = None):
    """Log a message with timestamp and step info."""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"\n{'='*60}")
    print(f"[{timestamp}] STEP: {step}")
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
    log("PROMPT", f"Loading prompt: {filepath}")
    with open(filepath, "r") as f:
        content = f.read()
    log("PROMPT", f"Loaded {len(content)} chars from {filename}")
    return content


class BedrockClient:
    def __init__(self, region_name: str = "us-east-1"):
        log("INIT", f"Initializing Bedrock client in region: {region_name}")
        self.client = boto3.client("bedrock-runtime", region_name=region_name)
        self.model_id = "us.anthropic.claude-opus-4-5-20251101-v1:0"
        log("INIT", f"Using model: {self.model_id}")

    def _invoke(self, messages: list, max_tokens: int = 4096, step_name: str = "INVOKE") -> dict:
        """Invoke the Bedrock model with messages."""
        log(step_name, f"Sending request to Bedrock (max_tokens: {max_tokens})")

        response = self.client.invoke_model(
            modelId=self.model_id,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "messages": messages
            })
        )
        result = json.loads(response["body"].read())

        log(step_name, "Received response from Bedrock", {
            "stop_reason": result.get("stop_reason"),
            "usage": result.get("usage"),
            "response_length": len(result["content"][0]["text"]) if result.get("content") else 0
        })

        return result

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
        log("STEP-1", "="*40)
        log("STEP-1", "STARTING ARCHITECTURE DIAGRAM ANALYSIS")
        log("STEP-1", "="*40)
        log("STEP-1", f"Image type: {media_type}, Base64 length: {len(image_base64)} chars")

        prompt = load_prompt("step1_analyze.txt")

        messages = [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_base64
                    }
                },
                {"type": "text", "text": prompt}
            ]
        }]

        result = self._invoke(messages, step_name="STEP-1")
        response_text = result["content"][0]["text"]

        log("STEP-1", "Raw response from Claude:", response_text[:2000])

        parsed = self._extract_json(response_text, step_name="STEP-1")

        log("STEP-1", "ARCHITECTURE ANALYSIS COMPLETE", {
            "entry_points_count": len(parsed.get("entry_points", [])),
            "data_flows_count": len(parsed.get("data_flows", [])),
            "security_boundaries_count": len(parsed.get("security_boundaries", [])),
            "public_resources_count": len(parsed.get("public_resources", [])),
            "private_resources_count": len(parsed.get("private_resources", []))
        })

        return parsed

    def extract_components(self, image_base64: str, media_type: str = "image/png") -> dict:
        """Step 2: Extract components directly from image using 3 specialized prompts."""
        log("STEP-2", "="*40)
        log("STEP-2", "STARTING COMPONENT EXTRACTION")
        log("STEP-2", "="*40)
        log("STEP-2", f"Image type: {media_type}, Base64 length: {len(image_base64)} chars")

        results = {}

        # PROMPT 2A: Application Description
        log("STEP-2A", "-"*40)
        log("STEP-2A", "EXTRACTING APPLICATION DESCRIPTION")
        log("STEP-2A", "-"*40)

        prompt1 = load_prompt("step2_application_description.txt")
        messages1 = [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": media_type, "data": image_base64}
                },
                {"type": "text", "text": prompt1}
            ]
        }]

        result1 = self._invoke(messages1, step_name="STEP-2A")
        response1 = result1["content"][0]["text"]
        log("STEP-2A", "Raw response:", response1[:1500])
        parsed1 = self._extract_json(response1, step_name="STEP-2A")
        results["application_description"] = parsed1.get("application_description", "")
        log("STEP-2A", f"Extracted description: {results['application_description'][:200]}...")

        # PROMPT 2B: Key Features
        log("STEP-2B", "-"*40)
        log("STEP-2B", "EXTRACTING KEY FEATURES")
        log("STEP-2B", "-"*40)

        prompt2 = load_prompt("step2_key_features.txt")
        messages2 = [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": media_type, "data": image_base64}
                },
                {"type": "text", "text": prompt2}
            ]
        }]

        result2 = self._invoke(messages2, step_name="STEP-2B")
        response2 = result2["content"][0]["text"]
        log("STEP-2B", "Raw response:", response2[:1500])
        parsed2 = self._extract_json(response2, step_name="STEP-2B")
        results["key_features"] = parsed2.get("key_features", [])
        log("STEP-2B", f"Extracted {len(results['key_features'])} features")

        # PROMPT 2C: In-Scope Components
        log("STEP-2C", "-"*40)
        log("STEP-2C", "EXTRACTING IN-SCOPE COMPONENTS")
        log("STEP-2C", "-"*40)

        prompt3 = load_prompt("step2_in_scope_components.txt")
        messages3 = [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": media_type, "data": image_base64}
                },
                {"type": "text", "text": prompt3}
            ]
        }]

        result3 = self._invoke(messages3, step_name="STEP-2C")
        response3 = result3["content"][0]["text"]
        log("STEP-2C", "Raw response:", response3[:1500])
        parsed3 = self._extract_json(response3, step_name="STEP-2C")

        # Handle both formats: array of strings or array of objects
        components = parsed3.get("in_scope_components", [])
        if components and isinstance(components[0], dict):
            # Keep full component objects with name and category
            results["in_scope_components"] = components
            log("STEP-2C", f"Extracted {len(components)} components (with categories)")
        else:
            results["in_scope_components"] = [{"name": c, "category": "other"} for c in components]
            log("STEP-2C", f"Extracted {len(components)} components (names only)")

        log("STEP-2", "="*40)
        log("STEP-2", "COMPONENT EXTRACTION COMPLETE", {
            "description_length": len(results.get("application_description", "")),
            "features_count": len(results.get("key_features", [])),
            "components_count": len(results.get("in_scope_components", []))
        })
        log("STEP-2", "="*40)

        return results

    def generate_threats(
        self,
        application_description: str,
        in_scope_components: list,
        key_features: list,
        template: str = "baseline"
    ) -> dict:
        """Step 3: Generate threat scenarios."""
        log("STEP-3", "="*40)
        log("STEP-3", f"STARTING THREAT GENERATION (template: {template})")
        log("STEP-3", "="*40)
        log("STEP-3", "Input data:", {
            "application_description": application_description[:300] + "...",
            "components_count": len(in_scope_components),
            "features_count": len(key_features),
            "template": template
        })

        template_file = f"step3_{template}.txt"
        prompt_template = load_prompt(template_file)

        # Convert components to string format if they're objects
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

        log("STEP-3", "Generated prompt length:", len(prompt))

        messages = [{
            "role": "user",
            "content": [{"type": "text", "text": prompt}]
        }]

        result = self._invoke(messages, max_tokens=8192, step_name="STEP-3")
        response_text = result["content"][0]["text"]

        log("STEP-3", "Raw response:", response_text[:2000])

        parsed = self._extract_json(response_text, step_name="STEP-3")

        log("STEP-3", "="*40)
        log("STEP-3", "THREAT GENERATION COMPLETE", {
            "threats_count": len(parsed.get("threats", []))
        })
        log("STEP-3", "="*40)

        return parsed
