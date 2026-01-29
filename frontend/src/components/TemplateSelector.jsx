import React, { useState } from 'react';
import { generateThreats } from '../api.js';

const styles = {
  container: {
    padding: '24px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#1a202c',
  },
  subtitle: {
    color: '#718096',
    marginBottom: '24px',
  },
  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  templateCard: {
    padding: '20px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  templateCardSelected: {
    borderColor: '#4299e1',
    backgroundColor: '#ebf8ff',
  },
  templateTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#2d3748',
  },
  templateDescription: {
    fontSize: '14px',
    color: '#718096',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#a0aec0',
    cursor: 'not-allowed',
  },
  backButton: {
    marginTop: '8px',
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    width: '100%',
  },
  error: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fed7d7',
    color: '#c53030',
    borderRadius: '6px',
  },
  status: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#e6fffa',
    color: '#234e52',
    borderRadius: '6px',
    fontSize: '14px',
  },
};

const templates = [
  {
    id: 'baseline',
    name: 'STRIDE Baseline',
    description: 'Comprehensive threat analysis using STRIDE methodology covering all major threat categories.',
    icon: '[S]',
  },
  {
    id: 'network',
    name: 'Network Security',
    description: 'Focus on network-layer threats including DDoS, MITM, DNS attacks, and lateral movement.',
    icon: '[N]',
  },
  {
    id: 'aws',
    name: 'AWS Cloud Security',
    description: 'AWS-specific misconfigurations, IAM issues, S3 exposures, and cloud security threats.',
    icon: '[A]',
  },
];

export default function TemplateSelector({ validatedData, sessionId, provider, onThreatsGenerated, onBack, isLoading, setIsLoading }) {
  const [selectedTemplate, setSelectedTemplate] = useState('baseline');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setStatus(`Generating threat scenarios (${provider})...`);

    console.log('[TemplateSelector] Generating threats with template:', selectedTemplate, 'provider:', provider);

    try {
      const result = await generateThreats(
        validatedData.application_description,
        validatedData.in_scope_components,
        validatedData.key_features,
        selectedTemplate,
        sessionId,
        provider
      );
      console.log('[TemplateSelector] Generated', result.threats.length, 'threats');
      setStatus('Complete!');
      onThreatsGenerated(result.threats);
    } catch (err) {
      console.error('[TemplateSelector] Error:', err);
      setError(err.message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Step 3: Select Threat Template</h2>
      <p style={styles.subtitle}>
        Choose a template focus for threat generation based on your security priorities.
      </p>

      <div style={styles.templatesGrid}>
        {templates.map((template) => (
          <div
            key={template.id}
            style={{
              ...styles.templateCard,
              ...(selectedTemplate === template.id ? styles.templateCardSelected : {}),
            }}
            onClick={() => setSelectedTemplate(template.id)}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{template.icon}</div>
            <div style={styles.templateTitle}>{template.name}</div>
            <div style={styles.templateDescription}>{template.description}</div>
          </div>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {status && isLoading && <div style={styles.status}>{status}</div>}

      <button
        style={{ ...styles.button, ...(isLoading ? styles.buttonDisabled : {}) }}
        onClick={handleGenerate}
        disabled={isLoading}
      >
        {isLoading ? 'Generating Threats...' : 'Generate Threat Report'}
      </button>
      <button style={styles.backButton} onClick={onBack} disabled={isLoading}>
        Back
      </button>
    </div>
  );
}
