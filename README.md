# Auspex - AI-Powered Threat Modeling

A POC application that uses AWS Bedrock (Claude) to analyze architecture diagrams and generate comprehensive threat models.

## Architecture

```
Frontend (React) → Backend (FastAPI) → AWS Bedrock (Claude 3.5 Sonnet)
```

## Prerequisites

- Python 3.9+
- Node.js 18+
- AWS credentials configured with Bedrock access
- Access to `anthropic.claude-3-5-sonnet-20241022-v2:0` model

## Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The UI will be available at `http://localhost:3000`

## Usage

1. **Upload Diagram**: Upload your architecture diagram (PNG, JPEG, GIF, or WebP)
2. **Validate Components**: Review and edit the extracted components, features, and description
3. **Select Template**: Choose a threat template focus:
   - **STRIDE Baseline**: General threat analysis
   - **Network Security**: Network-layer threats
   - **AWS Cloud Security**: AWS-specific misconfigurations
4. **View Report**: Review, filter, and export the generated threat matrix

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze-diagram` | POST | Analyze architecture diagram |
| `/api/extract-components` | POST | Extract components from analysis |
| `/api/generate-threats` | POST | Generate threat scenarios |

## Project Structure

```
auspex-poc/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── bedrock_client.py    # AWS Bedrock wrapper
│   ├── prompts/             # Prompt templates
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── components/
│   └── package.json
└── README.md
```

## AWS Configuration

Ensure your AWS credentials are configured:

```bash
aws configure
```

Or set environment variables:

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```
