# Auspex - AI-Powered Threat Modeling

Analyzes architecture diagrams and generates threat reports using AI (Google Gemini / AWS Bedrock).

## Features

- Upload architecture diagrams (PNG, JPEG, WebP)
- AI-powered component extraction
- Threat generation using STRIDE methodology
- MITRE ATT&CK mapping
- Export reports to Excel

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY=your_api_key
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

## Project Structure

```
auspex-poc/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── gemini_client.py     # Google Gemini API client
│   ├── bedrock_client.py    # AWS Bedrock client
│   ├── prompts/             # Prompt templates
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── components/
│   └── package.json
└── render.yaml              # Render deployment config
```

## Tech Stack

- **Frontend**: React, Vite, ExcelJS
- **Backend**: FastAPI, Pydantic, httpx
- **AI**: Google Gemini API / AWS Bedrock
