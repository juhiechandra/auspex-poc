# Auspex - AI-Powered Threat Modeling

Analyzes architecture diagrams and generates threat reports using AI (Google Gemini / AWS Bedrock).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Vite)                         │
│                         https://auspex-jpmc-poc.onrender.com                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────────┐   │
│  │   App.jsx    │───▶│  DiagramUpload   │───▶│  ComponentValidator      │   │
│  │  (Router)    │    │  (Step 1)        │    │  (Step 2)                │   │
│  └──────────────┘    └──────────────────┘    └──────────────────────────┘   │
│         │                                              │                     │
│         │            ┌──────────────────┐    ┌────────▼─────────────────┐   │
│         │            │  PromptEditor    │    │  TemplateSelector        │   │
│         └───────────▶│  (Prompts Tab)   │    │  (Step 3)                │   │
│                      └──────────────────┘    └──────────────────────────┘   │
│                                                        │                     │
│                                              ┌────────▼─────────────────┐   │
│                                              │  ThreatMatrix            │   │
│                                              │  (Step 4 - Report)       │   │
│                                              └──────────────────────────┘   │
│                                                                              │
│  localStorage: Session data (analysisData, validatedData, threats)          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (FastAPI + Python)                          │
│                          https://auspex-poc.onrender.com                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                           main.py (FastAPI)                           │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  POST /api/analyze-diagram     → Step 1: Diagram Analysis             │   │
│  │  POST /api/extract-components  → Step 2: Component Extraction         │   │
│  │  POST /api/generate-threats    → Step 3: Threat Generation            │   │
│  │  GET/PUT /api/prompts/{key}    → Prompt Management                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                      │                              │                        │
│         ┌────────────┴────────────┐    ┌───────────┴───────────┐            │
│         ▼                         ▼    ▼                       ▼            │
│  ┌──────────────┐    ┌──────────────┐  ┌─────────────────────────┐          │
│  │gemini_client │    │bedrock_client│  │     database.py         │          │
│  │    .py       │    │    .py       │  │  (PostgreSQL Client)    │          │
│  └──────┬───────┘    └──────┬───────┘  └───────────┬─────────────┘          │
│         │                   │                      │                         │
└─────────┼───────────────────┼──────────────────────┼─────────────────────────┘
          │                   │                      │
          ▼                   ▼                      ▼
   ┌──────────────┐   ┌──────────────┐      ┌──────────────────┐
   │ Google       │   │ AWS          │      │ Neon PostgreSQL  │
   │ Gemini API   │   │ Bedrock      │      │ (Prompts DB)     │
   └──────────────┘   └──────────────┘      └──────────────────┘
```

## Data Flow

```
1. USER uploads diagram (PNG/JPEG/WebP)
        │
        ▼
2. STEP 1: Analyze Diagram
   POST /api/analyze-diagram
   - Sends image to Gemini/Bedrock
   - Returns: entry_points, data_flows, security_boundaries
        │
        ▼
3. STEP 2: Extract Components
   POST /api/extract-components
   - Three parallel AI calls (2A, 2B, 2C)
   - Returns: application_description, key_features, in_scope_components
        │
        ▼
4. USER validates/edits components
        │
        ▼
5. STEP 3: Generate Threats
   POST /api/generate-threats
   - Uses selected template (baseline/network/aws)
   - Returns: threat scenarios with STRIDE, MITRE ATT&CK mappings
        │
        ▼
6. USER views/exports threat report (Excel)
```

## What's Stored Where

| Data | Storage | Description |
|------|---------|-------------|
| Session state | localStorage (browser) | Current step, analysis results, validated components, threats |
| AI Prompts | Neon PostgreSQL | 7 customizable prompts with editable/static sections |
| Default Prompts | backend/prompts/*.txt | Fallback when DB unavailable |

## Database Schema

```sql
CREATE TABLE prompts (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,    -- e.g., 'step1_analyze'
    name VARCHAR(100) NOT NULL,         -- e.g., 'Step 1: Diagram Analysis'
    content TEXT NOT NULL,              -- Full prompt with static markers
    is_default BOOLEAN DEFAULT FALSE,   -- TRUE if using original content
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Prompt Keys

| Key | Description |
|-----|-------------|
| `step1_analyze` | Analyzes architecture diagram structure |
| `step2_app_desc` | Extracts application description |
| `step2_features` | Extracts key features |
| `step2_components` | Extracts in-scope components |
| `step3_baseline` | STRIDE threat generation |
| `step3_network` | Network-focused threats |
| `step3_aws` | AWS-specific threats |

## Features

- Upload architecture diagrams (PNG, JPEG, WebP)
- AI-powered component extraction
- Threat generation using STRIDE methodology
- MITRE ATT&CK mapping
- Export reports to Excel
- Customizable prompts via dashboard (with locked output format sections)

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY=your_api_key
export DATABASE_URL=postgresql://user:pass@host/db  # Optional
python main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Deployment (Render)

### Backend (Web Service)
```
Root Directory: backend
Build Command:  pip install -r requirements.txt
Start Command:  uvicorn main:app --host 0.0.0.0 --port $PORT
Environment:    GEMINI_API_KEY=your_key
                DATABASE_URL=your_neon_connection_string
```

### Frontend (Static Site)
```
Root Directory: frontend
Build Command:  npm install && npm run build
Publish Dir:    dist
Environment:    VITE_API_URL=https://your-backend.onrender.com
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/analyze-diagram` | POST | Analyze architecture diagram |
| `/api/extract-components` | POST | Extract components |
| `/api/generate-threats` | POST | Generate threat scenarios |
| `/api/prompts` | GET | List all prompts |
| `/api/prompts/{key}` | GET | Get a single prompt |
| `/api/prompts/{key}` | PUT | Update a prompt |
| `/api/prompts/{key}/reset` | POST | Reset prompt to default |

## Project Structure

```
auspex-poc/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── gemini_client.py     # Google Gemini API client
│   ├── bedrock_client.py    # AWS Bedrock client
│   ├── database.py          # PostgreSQL operations
│   ├── prompts/             # Default prompt templates
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app with tab routing
│   │   ├── api.js           # API client
│   │   └── components/
│   │       ├── DiagramUpload.jsx
│   │       ├── ComponentValidator.jsx
│   │       ├── TemplateSelector.jsx
│   │       ├── ThreatMatrix.jsx
│   │       └── PromptEditor.jsx
│   └── package.json
└── render.yaml
```

## Tech Stack

- **Frontend**: React, Vite, ExcelJS
- **Backend**: FastAPI, Pydantic, httpx
- **Database**: PostgreSQL (Neon)
- **AI**: Google Gemini API / AWS Bedrock
