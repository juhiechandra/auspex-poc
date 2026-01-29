import boto3
import json
import re
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict

PROMPTS_DIR = Path(__file__).parent / "prompts"


def log(step: str, message: str, data: any = None):
    """Log a message with timestamp and step info."""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"\n{'='*60}")
    print(f"[{timestamp}] BEDROCK - {step}")
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


class BedrockClient:
    def __init__(self, region_name: str = "us-east-1"):
        log("INIT", f"Initializing Bedrock client in region: {region_name}")
        self.client = boto3.client("bedrock-runtime", region_name=region_name)
        self.model_id = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
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

    def _fix_json(self, text: str) -> str:
        """Fix common JSON issues from LLM responses."""
        text = re.sub(r',(\s*[}\]])', r'\1', text)
        text = re.sub(r'(?<!\\)\n(?=.*")', '\\n', text)
        text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
        return text

    def _extract_json(self, text: str, step_name: str = "PARSE") -> dict:
        """Extract JSON from model response text."""
        log(step_name, "Extracting JSON from response...")

        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if json_match:
            log(step_name, "Found JSON in code block")
            text = json_match.group(1)

        try:
            parsed = json.loads(text)
            log(step_name, "Successfully parsed JSON", parsed)
            return parsed
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                json_str = text[start:end]
                try:
                    parsed = json.loads(json_str)
                    log(step_name, "Extracted JSON from text", parsed)
                    return parsed
                except json.JSONDecodeError:
                    fixed = self._fix_json(json_str)
                    try:
                        parsed = json.loads(fixed)
                        log(step_name, "Parsed JSON after fixing", parsed)
                        return parsed
                    except json.JSONDecodeError as e:
                        log(step_name, f"FAILED to parse JSON: {e}")
            log(step_name, f"FAILED to extract JSON. Raw text: {text[:500]}")
            raise ValueError(f"Could not extract JSON from response: {text[:500]}")

    def analyze_diagram(self, image_base64: str, media_type: str = "image/png", custom_prompt: Optional[str] = None) -> dict:
        """Step 1: Analyze the architecture diagram."""
        log("STEP-1", "STARTING ARCHITECTURE DIAGRAM ANALYSIS")

        prompt = custom_prompt if custom_prompt else load_prompt("step1_analyze.txt")

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

        result = self._invoke(messages, max_tokens=8192, step_name="STEP-1")
        response_text = result["content"][0]["text"]

        log("STEP-1", "Raw response:", response_text[:2000])
        parsed = self._extract_json(response_text, step_name="STEP-1")

        log("STEP-1", "ARCHITECTURE ANALYSIS COMPLETE", {
            "entry_points_count": len(parsed.get("entry_points", [])),
            "data_flows_count": len(parsed.get("data_flows", [])),
        })

        return parsed

    def extract_components(self, image_base64: str, media_type: str = "image/png", custom_prompts: Optional[Dict[str, str]] = None) -> dict:
        """Step 2: Extract components directly from image using 3 specialized prompts."""
        log("STEP-2", "STARTING COMPONENT EXTRACTION")

        results = {}
        prompts = custom_prompts or {}

        # PROMPT 2A: Application Description
        log("STEP-2A", "EXTRACTING APPLICATION DESCRIPTION")
        prompt1 = prompts.get("app_desc") or load_prompt("step2_A_application_description.txt")
        messages1 = [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_base64}},
                {"type": "text", "text": prompt1}
            ]
        }]
        result1 = self._invoke(messages1, max_tokens=8192, step_name="STEP-2A")
        parsed1 = self._extract_json(result1["content"][0]["text"], step_name="STEP-2A")
        results["application_description"] = parsed1.get("application_description", "")

        # PROMPT 2B: Key Features
        log("STEP-2B", "EXTRACTING KEY FEATURES")
        prompt2 = prompts.get("features") or load_prompt("step2_B_key_features.txt")
        messages2 = [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_base64}},
                {"type": "text", "text": prompt2}
            ]
        }]
        result2 = self._invoke(messages2, max_tokens=8192, step_name="STEP-2B")
        parsed2 = self._extract_json(result2["content"][0]["text"], step_name="STEP-2B")
        results["key_features"] = parsed2.get("key_features", [])

        # PROMPT 2C: In-Scope Components
        log("STEP-2C", "EXTRACTING IN-SCOPE COMPONENTS")
        prompt3 = prompts.get("components") or load_prompt("step2_C_in_scope_components.txt")
        messages3 = [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_base64}},
                {"type": "text", "text": prompt3}
            ]
        }]
        result3 = self._invoke(messages3, max_tokens=8192, step_name="STEP-2C")
        parsed3 = self._extract_json(result3["content"][0]["text"], step_name="STEP-2C")

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
        template: str = "baseline",
        custom_prompt: Optional[str] = None
    ) -> dict:
        """Step 3: Generate threat scenarios."""
        log("STEP-3", f"STARTING THREAT GENERATION (template: {template})")

        if custom_prompt:
            prompt_template = custom_prompt
        else:
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

        messages = [{
            "role": "user",
            "content": [{"type": "text", "text": prompt}]
        }]

        result = self._invoke(messages, max_tokens=8192, step_name="STEP-3")
        response_text = result["content"][0]["text"]

        log("STEP-3", "Raw response:", response_text[:2000])
        parsed = self._extract_json(response_text, step_name="STEP-3")

        # Normalize threats
        if "threats" in parsed:
            for threat in parsed["threats"]:
                if isinstance(threat.get("mitigations"), list):
                    threat["mitigations"] = " ".join(threat["mitigations"])
                if isinstance(threat.get("mitre_technique"), list):
                    threat["mitre_technique"] = ", ".join(threat["mitre_technique"])

        log("STEP-3", "THREAT GENERATION COMPLETE", {"threats_count": len(parsed.get("threats", []))})

        return parsed
