# Auspex - AI-Powered Threat Modeling

Analyzes architecture diagrams and generates threat reports using AI.

## Quick Start (Local)

### 1. Clone and Setup Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your keys
```

**.env file:**
```
GEMINI_API_KEY=your_gemini_key
DATABASE_URL=your_neon_connection_string  # optional
```

For AWS Bedrock (optional):
```bash
aws configure sso
aws sso login
```

### 3. Run Backend

```bash
cd backend
source venv/bin/activate
python main.py
# Runs on http://localhost:8000
```

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### 5. Open App

Visit http://localhost:3000 and upload a diagram.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│                    localhost:3000                            │
├─────────────────────────────────────────────────────────────┤
│  DiagramUpload → ComponentValidator → TemplateSelector       │
│       │                                      │               │
│       └──────────────────────────────────────┘               │
│                          │                                   │
│                    ThreatMatrix (Report)                     │
│                                                              │
│  PromptEditor (edit AI prompts)                              │
└─────────────────────────────────────────────────────────────┘
                           │ API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│                    localhost:8000                            │
├─────────────────────────────────────────────────────────────┤
│  /api/analyze-diagram      → Analyze architecture            │
│  /api/extract-components   → Extract app info                │
│  /api/generate-threats     → Generate threat scenarios       │
│  /api/prompts              → Manage prompts                  │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐           ┌─────────────────┐
│  Gemini API     │           │  Neon PostgreSQL│
│  (or Bedrock)   │           │  (prompts)      │
└─────────────────┘           └─────────────────┘
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/analyze-diagram` | POST | Analyze diagram |
| `/api/extract-components` | POST | Extract components |
| `/api/generate-threats` | POST | Generate threats |
| `/api/prompts` | GET | List prompts |
| `/api/prompts/{key}` | PUT | Update prompt |
| `/api/prompts/{key}/reset` | POST | Reset to default |

## Database Schema

```sql
CREATE TABLE prompts (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## Deployment (Render)

### Backend
```
Root Directory: backend
Build Command:  pip install -r requirements.txt
Start Command:  uvicorn main:app --host 0.0.0.0 --port $PORT
Environment:
  GEMINI_API_KEY=xxx
  DATABASE_URL=xxx
```

### Frontend
```
Root Directory: frontend
Build Command:  npm install && npm run build
Publish Dir:    dist
Environment:
  VITE_API_URL=https://your-backend.onrender.com
```

## Project Structure

```
auspex-poc/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── gemini_client.py  # Gemini API
│   ├── bedrock_client.py # AWS Bedrock
│   ├── database.py       # PostgreSQL
│   ├── prompts/          # Default prompts
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   └── package.json
└── README.md
```

## Tech Stack

- **Frontend**: React, Vite, ExcelJS
- **Backend**: FastAPI, Python
- **Database**: PostgreSQL (Neon)
- **AI**: Google Gemini / AWS Bedrock
