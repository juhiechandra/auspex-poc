const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function analyzeDiagram(imageBase64, mediaType = 'image/png', sessionId = null, provider = 'bedrock') {
  console.log(`[API] Step 1: Analyzing diagram (provider: ${provider})...`);
  const body = { image: imageBase64, media_type: mediaType, provider };
  if (sessionId) body.session_id = sessionId;

  const response = await fetch(`${API_BASE}/api/analyze-diagram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to analyze diagram');
  }
  return response.json();
}

export async function extractComponents(imageBase64, mediaType = 'image/png', sessionId = null, provider = 'bedrock') {
  console.log(`[API] Step 2: Extracting components (provider: ${provider})...`);
  const body = { image: imageBase64, media_type: mediaType, provider };
  if (sessionId) body.session_id = sessionId;

  const response = await fetch(`${API_BASE}/api/extract-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to extract components');
  }
  return response.json();
}

export async function generateThreats(applicationDescription, inScopeComponents, keyFeatures, template, sessionId = null, provider = 'bedrock') {
  console.log(`[API] Step 3: Generating threats (provider: ${provider}, template: ${template})...`);
  const body = {
    application_description: applicationDescription,
    in_scope_components: inScopeComponents,
    key_features: keyFeatures,
    template,
    provider
  };
  if (sessionId) body.session_id = sessionId;

  const response = await fetch(`${API_BASE}/api/generate-threats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate threats');
  }
  return response.json();
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}
