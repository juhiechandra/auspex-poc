import React, { useState, useEffect } from 'react';
import DiagramUpload from './components/DiagramUpload';
import ComponentValidator from './components/ComponentValidator';
import TemplateSelector from './components/TemplateSelector';
import ThreatMatrix from './components/ThreatMatrix';
import PromptEditor from './components/PromptEditor';

// localStorage helper functions
const STORAGE_KEY = 'auspex_session';

const saveToStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
    return null;
  }
};

const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear localStorage:', e);
  }
};

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#1a202c',
    padding: '16px 24px',
    color: 'white',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logo: {
    fontSize: '24px',
    fontWeight: '700',
  },
  tagline: {
    fontSize: '14px',
    color: '#a0aec0',
  },
  navTabs: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#2d3748',
    padding: '4px',
    borderRadius: '8px',
  },
  navTab: {
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    border: 'none',
    background: 'transparent',
    color: '#a0aec0',
  },
  navTabActive: {
    backgroundColor: '#4299e1',
    color: 'white',
  },
  sessionBadge: {
    fontSize: '12px',
    color: '#68d391',
    backgroundColor: 'rgba(104, 211, 145, 0.1)',
    padding: '4px 12px',
    borderRadius: '12px',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#2d3748',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
  },
  toggleOption: {
    padding: '4px 12px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  toggleActive: {
    backgroundColor: '#4299e1',
    color: 'white',
  },
  toggleInactive: {
    color: '#a0aec0',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },
  stepper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '32px',
    gap: '8px',
    flexWrap: 'wrap',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    backgroundColor: '#edf2f7',
    color: '#718096',
  },
  stepActive: {
    backgroundColor: '#4299e1',
    color: 'white',
  },
  stepComplete: {
    backgroundColor: '#48bb78',
    color: 'white',
  },
  stepNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
  },
};

const STEPS = [
  { id: 1, name: 'Upload Diagram' },
  { id: 2, name: 'Validate Components' },
  { id: 3, name: 'Select Template' },
  { id: 4, name: 'View Report' },
];

export default function App() {
  const [activeView, setActiveView] = useState('analyze'); // 'analyze' or 'prompts'
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [validatedData, setValidatedData] = useState(null);
  const [threats, setThreats] = useState(null);
  const [provider, setProvider] = useState('gemini'); // Default to Gemini for cloud deployment
  const [imageData, setImageData] = useState(null); // Store uploaded image

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setCurrentStep(saved.currentStep || 1);
      setSessionId(saved.sessionId || null);
      setAnalysisData(saved.analysisData || null);
      setValidatedData(saved.validatedData || null);
      setThreats(saved.threats || null);
      setProvider(saved.provider || 'gemini');
      setImageData(saved.imageData || null);
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (sessionId || analysisData || validatedData || threats) {
      saveToStorage({
        currentStep,
        sessionId,
        analysisData,
        validatedData,
        threats,
        provider,
        imageData,
      });
    }
  }, [currentStep, sessionId, analysisData, validatedData, threats, provider, imageData]);

  const handleAnalysisComplete = (data) => {
    setSessionId(data.sessionId);
    setAnalysisData(data);
    // Save image data for potential later use (stored in data.imageBase64)
    setImageData({ base64: data.imageBase64, mediaType: data.mediaType });
    setCurrentStep(2);
  };

  const handleValidationComplete = (data) => {
    setValidatedData(data);
    setCurrentStep(3);
  };

  const handleThreatsGenerated = (threatData) => {
    setThreats(threatData);
    setCurrentStep(4);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSessionId(null);
    setAnalysisData(null);
    setValidatedData(null);
    setThreats(null);
    setImageData(null);
    clearStorage();
  };

  const getStepStyle = (stepId) => {
    if (stepId === currentStep) return { ...styles.step, ...styles.stepActive };
    if (stepId < currentStep) return { ...styles.step, ...styles.stepComplete };
    return styles.step;
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <span style={styles.logo}>Auspex</span>
            <span style={styles.tagline}>AI-Powered Threat Modeling</span>
            <div style={styles.navTabs}>
              <button
                style={{
                  ...styles.navTab,
                  ...(activeView === 'analyze' ? styles.navTabActive : {})
                }}
                onClick={() => setActiveView('analyze')}
              >
                Analyze
              </button>
              <button
                style={{
                  ...styles.navTab,
                  ...(activeView === 'prompts' ? styles.navTabActive : {})
                }}
                onClick={() => setActiveView('prompts')}
              >
                Prompts
              </button>
            </div>
          </div>
          <div style={styles.headerRight}>
            {/* Provider Toggle */}
            <div style={styles.toggle}>
              <span
                style={{
                  ...styles.toggleOption,
                  ...(provider === 'gemini' ? styles.toggleActive : styles.toggleInactive)
                }}
                onClick={() => setProvider('gemini')}
              >
                Gemini API Key
              </span>
              <span
                style={{
                  ...styles.toggleOption,
                  ...(provider === 'claude' ? styles.toggleActive : styles.toggleInactive)
                }}
                onClick={() => setProvider('claude')}
              >
                Claude API Key
              </span>
              <span
                style={{
                  ...styles.toggleOption,
                  ...(provider === 'bedrock' ? styles.toggleActive : styles.toggleInactive)
                }}
                onClick={() => setProvider('bedrock')}
              >
                Bedrock
              </span>
            </div>
            {sessionId && (
              <span style={styles.sessionBadge}>Session: {sessionId}</span>
            )}
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {activeView === 'prompts' ? (
          <PromptEditor />
        ) : (
          <>
            <div style={styles.stepper}>
              {STEPS.map((step) => (
                <div key={step.id} style={getStepStyle(step.id)}>
                  <span style={styles.stepNumber}>
                    {step.id < currentStep ? '✓' : step.id}
                  </span>
                  {step.name}
                </div>
              ))}
            </div>

            {currentStep === 1 && (
              <DiagramUpload
                onAnalysisComplete={handleAnalysisComplete}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                provider={provider}
              />
            )}

            {currentStep === 2 && analysisData && (
              <ComponentValidator
                data={analysisData}
                onValidationComplete={handleValidationComplete}
                onBack={() => setCurrentStep(1)}
                provider={provider}
              />
            )}

            {currentStep === 3 && validatedData && (
              <TemplateSelector
                validatedData={validatedData}
                sessionId={sessionId}
                provider={provider}
                onThreatsGenerated={handleThreatsGenerated}
                onBack={() => setCurrentStep(2)}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}

            {currentStep === 4 && threats && (
              <ThreatMatrix threats={threats} sessionId={sessionId} onBack={handleReset} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
