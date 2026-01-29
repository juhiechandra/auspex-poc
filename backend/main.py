from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime
from contextlib import asynccontextmanager
import traceback
import uvicorn
import os

from bedrock_client import BedrockClient, log
from gemini_client import GeminiClient
from database import init_database, get_all_prompts, get_prompt, update_prompt, reset_prompt, PROMPT_DEFINITIONS

# Valid prompt keys (whitelist)
VALID_PROMPT_KEYS = {p["key"] for p in PROMPT_DEFINITIONS}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_database()
    yield


app = FastAPI(title="Auspex - Threat Modeling API", lifespan=lifespan)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients lazily
_bedrock_client = None
_gemini_client = None


def get_client(provider: str):
    """Get the appropriate client based on provider."""
    global _bedrock_client, _gemini_client

    if provider == "bedrock":
        if _bedrock_client is None:
            _bedrock_client = BedrockClient()
        return _bedrock_client
    elif provider == "gemini":
        if _gemini_client is None:
            _gemini_client = GeminiClient()
        return _gemini_client
    else:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")


def generate_session_id() -> str:
    """Generate a simple session ID."""
    return datetime.now().strftime("%Y%m%d_%H%M%S")


# Request/Response Models
class AnalyzeDiagramRequest(BaseModel):
    image: str
    media_type: Optional[str] = "image/png"
    session_id: Optional[str] = None
    provider: Literal["bedrock", "gemini"] = "bedrock"


class AnalyzeDiagramResponse(BaseModel):
    session_id: str
    entry_points: list
    data_flows: list
    security_boundaries: list
    public_resources: list
    private_resources: list


class ExtractComponentsRequest(BaseModel):
    image: str
    media_type: Optional[str] = "image/png"
    session_id: Optional[str] = None
    provider: Literal["bedrock", "gemini"] = "bedrock"


class ComponentItem(BaseModel):
    name: str
    category: str


class ExtractComponentsResponse(BaseModel):
    session_id: str
    application_description: str
    key_features: List[str]
    in_scope_components: List[ComponentItem]


class GenerateThreatsRequest(BaseModel):
    application_description: str
    in_scope_components: list
    key_features: list
    template: Optional[str] = "baseline"
    session_id: Optional[str] = None
    provider: Literal["bedrock", "gemini"] = "bedrock"


class ThreatItem(BaseModel):
    id: str
    scenario: str
    cia_triad: str
    stride: str
    mitre_tactic: str
    mitre_technique: str
    mitigations: str


class GenerateThreatsResponse(BaseModel):
    session_id: str
    threats: List[ThreatItem]


class PromptItem(BaseModel):
    key: str
    name: str
    content: str
    is_default: bool
    updated_at: Optional[str] = None


class UpdatePromptRequest(BaseModel):
    content: str


# Endpoints
@app.get("/")
async def root():
    return {"message": "Auspex Threat Modeling API", "version": "1.0.0"}


@app.get("/health")
async def health():
    gemini_configured = bool(os.environ.get("GEMINI_API_KEY"))
    db_configured = bool(os.environ.get("DATABASE_URL"))
    return {
        "status": "healthy",
        "gemini_available": gemini_configured,
        "database_available": db_configured
    }


# Prompt Management Endpoints
@app.get("/api/prompts", response_model=List[PromptItem])
async def list_prompts():
    """Get all prompts."""
    prompts = get_all_prompts()
    return [
        PromptItem(
            key=p["key"],
            name=p["name"],
            content=p["content"],
            is_default=p["is_default"],
            updated_at=str(p["updated_at"]) if p["updated_at"] else None
        )
        for p in prompts
    ]


@app.get("/api/prompts/{key}")
async def get_single_prompt(key: str):
    """Get a single prompt by key."""
    if key not in VALID_PROMPT_KEYS:
        raise HTTPException(status_code=404, detail="Invalid prompt key")
    content = get_prompt(key)
    if not content:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"key": key, "content": content}


@app.put("/api/prompts/{key}")
async def update_single_prompt(key: str, request: UpdatePromptRequest):
    """Update a prompt."""
    if key not in VALID_PROMPT_KEYS:
        raise HTTPException(status_code=404, detail="Invalid prompt key")
    success = update_prompt(key, request.content)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update prompt")
    return {"message": "Prompt updated successfully"}


@app.post("/api/prompts/{key}/reset")
async def reset_single_prompt(key: str):
    """Reset a prompt to default."""
    if key not in VALID_PROMPT_KEYS:
        raise HTTPException(status_code=404, detail="Invalid prompt key")
    success = reset_prompt(key)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to reset prompt")
    return {"message": "Prompt reset to default"}


# Analysis Endpoints
@app.post("/api/analyze-diagram", response_model=AnalyzeDiagramResponse)
async def analyze_diagram(request: AnalyzeDiagramRequest):
    """Step 1: Analyze architecture diagram."""
    log("API", f"ENDPOINT: /api/analyze-diagram (provider: {request.provider})")

    try:
        client = get_client(request.provider)
        session_id = request.session_id or generate_session_id()

        # Get prompt from database
        custom_prompt = get_prompt("step1_analyze")
        result = client.analyze_diagram(request.image, request.media_type, custom_prompt)

        return AnalyzeDiagramResponse(session_id=session_id, **result)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/extract-components", response_model=ExtractComponentsResponse)
async def extract_components(request: ExtractComponentsRequest):
    """Step 2: Extract application components."""
    log("API", f"ENDPOINT: /api/extract-components (provider: {request.provider})")

    try:
        client = get_client(request.provider)
        session_id = request.session_id or generate_session_id()

        # Get prompts from database
        prompts = {
            "app_desc": get_prompt("step2_app_desc"),
            "features": get_prompt("step2_features"),
            "components": get_prompt("step2_components"),
        }
        result = client.extract_components(request.image, request.media_type, prompts)

        return ExtractComponentsResponse(session_id=session_id, **result)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-threats", response_model=GenerateThreatsResponse)
async def generate_threats(request: GenerateThreatsRequest):
    """Step 3: Generate threat scenarios."""
    log("API", f"ENDPOINT: /api/generate-threats (provider: {request.provider}, template: {request.template})")

    try:
        if request.template not in ["baseline", "network", "aws"]:
            raise HTTPException(status_code=400, detail="Invalid template")

        client = get_client(request.provider)
        session_id = request.session_id or generate_session_id()

        # Get prompt from database
        prompt_key = f"step3_{request.template}"
        custom_prompt = get_prompt(prompt_key)

        result = client.generate_threats(
            application_description=request.application_description,
            in_scope_components=request.in_scope_components,
            key_features=request.key_features,
            template=request.template,
            custom_prompt=custom_prompt
        )

        return GenerateThreatsResponse(session_id=session_id, **result)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    log("API", "Starting Auspex API server on port 8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
