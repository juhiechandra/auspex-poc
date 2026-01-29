# Auspex - AI Threat Modeling

## Local Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your GEMINI_API_KEY
python main.py        # http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev           # http://localhost:3000
```

### AWS Bedrock (optional)
```bash
aws configure sso
aws sso login
```

Open http://localhost:3000 and toggle Gemini/Bedrock in header.
