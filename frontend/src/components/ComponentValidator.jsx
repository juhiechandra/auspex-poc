import React, { useState, useEffect } from 'react';
import { extractComponents } from '../api.js';

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
  section: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
    marginBottom: '8px',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    minHeight: '100px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  chipsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '8px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#edf2f7',
    borderRadius: '16px',
    fontSize: '14px',
  },
  chipCategory: {
    fontSize: '11px',
    color: '#718096',
    marginLeft: '4px',
    backgroundColor: '#e2e8f0',
    padding: '2px 6px',
    borderRadius: '8px',
  },
  chipRemove: {
    marginLeft: '8px',
    cursor: 'pointer',
    color: '#718096',
    fontWeight: 'bold',
  },
  addInput: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  button: {
    marginTop: '16px',
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
  analysisPreview: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    fontSize: '14px',
  },
  analysisTitle: {
    fontWeight: '600',
    marginBottom: '8px',
    color: '#2d3748',
  },
  analysisList: {
    marginLeft: '16px',
    color: '#4a5568',
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: '#718096',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fed7d7',
    color: '#c53030',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  status: {
    padding: '12px',
    backgroundColor: '#e6fffa',
    color: '#234e52',
    borderRadius: '6px',
    marginBottom: '16px',
  },
};

const CATEGORIES = ['compute', 'storage', 'database', 'network', 'security', 'cdn', 'dns', 'monitoring', 'other'];

export default function ComponentValidator({ data, onValidationComplete, onBack, provider }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Extracting application components...');

  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState([]);
  const [components, setComponents] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentCategory, setNewComponentCategory] = useState('compute');

  useEffect(() => {
    const fetchComponents = async () => {
      try {
        setLoading(true);
        setError(null);
        setStatus(`Extracting application components (${provider})...`);

        const result = await extractComponents(
          data.imageBase64,
          data.mediaType,
          data.sessionId,
          provider
        );

        setDescription(result.application_description || '');
        setFeatures(result.key_features || []);
        setComponents(result.in_scope_components || []);
        setStatus(null);
      } catch (err) {
        console.error('[ComponentValidator] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchComponents();
  }, [data, provider]);

  const addFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const addComponent = () => {
    if (newComponentName.trim()) {
      setComponents([...components, { name: newComponentName.trim(), category: newComponentCategory }]);
      setNewComponentName('');
    }
  };

  const removeComponent = (index) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    onValidationComplete({
      application_description: description,
      key_features: features,
      in_scope_components: components,
    });
  };

  const getComponentName = (comp) => {
    if (typeof comp === 'string') return comp;
    return comp.name || JSON.stringify(comp);
  };

  const getComponentCategory = (comp) => {
    if (typeof comp === 'string') return null;
    return comp.category;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Step 2: Extract Components</h2>
        <div style={styles.loading}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>...</div>
          <p>{status}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Step 2: Validate Components</h2>

      {error && <div style={styles.error}>{error}</div>}

      {/* Architecture Summary (read-only) */}
      <div style={styles.analysisPreview}>
        <div style={styles.analysisTitle}>Architecture Summary (from Step 1)</div>

        {(data.analysis?.entry_points || []).length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <strong>Entry Points:</strong> {data.analysis.entry_points.length} items
          </div>
        )}

        {(data.analysis?.data_flows || []).length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <strong>Data Flows:</strong> {data.analysis.data_flows.length} items
          </div>
        )}

        {(data.analysis?.security_boundaries || []).length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <strong>Security Boundaries:</strong> {data.analysis.security_boundaries.length} items
          </div>
        )}

        {(data.analysis?.public_resources || []).length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <strong>Public Resources:</strong> {data.analysis.public_resources.length} items
          </div>
        )}

        {(data.analysis?.private_resources || []).length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <strong>Private Resources:</strong> {data.analysis.private_resources.length} items
          </div>
        )}
      </div>

      {/* Application Description */}
      <div style={styles.section}>
        <label style={styles.label}>Application Description</label>
        <textarea
          style={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter application description..."
        />
      </div>

      {/* Key Features */}
      <div style={styles.section}>
        <label style={styles.label}>Key Features ({features.length})</label>
        <div style={styles.chipsContainer}>
          {features.map((feature, index) => (
            <span key={index} style={styles.chip}>
              {feature}
              <span style={styles.chipRemove} onClick={() => removeFeature(index)}>
                x
              </span>
            </span>
          ))}
        </div>
        <div style={styles.addInput}>
          <input
            style={styles.input}
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            placeholder="Add a feature..."
            onKeyPress={(e) => e.key === 'Enter' && addFeature()}
          />
          <button style={styles.addButton} onClick={addFeature}>
            Add
          </button>
        </div>
      </div>

      {/* In-Scope Components */}
      <div style={styles.section}>
        <label style={styles.label}>In-Scope Components ({components.length})</label>
        <div style={styles.chipsContainer}>
          {components.map((component, index) => (
            <span key={index} style={styles.chip}>
              {getComponentName(component)}
              {getComponentCategory(component) && (
                <span style={styles.chipCategory}>{getComponentCategory(component)}</span>
              )}
              <span style={styles.chipRemove} onClick={() => removeComponent(index)}>
                x
              </span>
            </span>
          ))}
        </div>
        <div style={styles.addInput}>
          <input
            style={{ ...styles.input, flex: 2 }}
            value={newComponentName}
            onChange={(e) => setNewComponentName(e.target.value)}
            placeholder="Add a component..."
            onKeyPress={(e) => e.key === 'Enter' && addComponent()}
          />
          <select
            style={styles.select}
            value={newComponentCategory}
            onChange={(e) => setNewComponentCategory(e.target.value)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button style={styles.addButton} onClick={addComponent}>
            Add
          </button>
        </div>
      </div>

      <button style={styles.button} onClick={handleContinue}>
        Continue to Threat Generation
      </button>
      <button style={styles.backButton} onClick={onBack}>
        Back
      </button>
    </div>
  );
}
