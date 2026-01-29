import React, { useState } from 'react';

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
};

const CATEGORIES = ['compute', 'storage', 'database', 'network', 'security', 'cdn', 'dns', 'monitoring', 'other'];

export default function ComponentValidator({ data, onValidationComplete, onBack }) {
  const [description, setDescription] = useState(data.components.application_description || '');
  const [features, setFeatures] = useState([...(data.components.key_features || [])]);
  const [components, setComponents] = useState([...(data.components.in_scope_components || [])]);
  const [newFeature, setNewFeature] = useState('');
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentCategory, setNewComponentCategory] = useState('compute');

  console.log('[ComponentValidator] Loaded with data:', data);

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
    console.log('[ComponentValidator] Submitting validated data');
    onValidationComplete({
      application_description: description,
      key_features: features,
      in_scope_components: components,
    });
  };

  // Helper to get component display name
  const getComponentName = (comp) => {
    if (typeof comp === 'string') return comp;
    return comp.name || JSON.stringify(comp);
  };

  const getComponentCategory = (comp) => {
    if (typeof comp === 'string') return null;
    return comp.category;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Step 2: Validate Components</h2>

      {/* Analysis Preview */}
      <div style={styles.analysisPreview}>
        <div style={styles.analysisTitle}>Architecture Analysis Summary</div>

        {(data.analysis?.entry_points || []).length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <strong>Entry Points ({data.analysis.entry_points.length}):</strong>
            <ul style={styles.analysisList}>
              {data.analysis.entry_points.map((item, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {(data.analysis?.data_flows || []).length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <strong>Data Flows ({data.analysis.data_flows.length}):</strong>
            <ul style={styles.analysisList}>
              {data.analysis.data_flows.map((item, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {(data.analysis?.security_boundaries || []).length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <strong>Security Boundaries ({data.analysis.security_boundaries.length}):</strong>
            <ul style={styles.analysisList}>
              {data.analysis.security_boundaries.map((item, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {(data.analysis?.public_resources || []).length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <strong>Public Resources ({data.analysis.public_resources.length}):</strong>
            <ul style={styles.analysisList}>
              {data.analysis.public_resources.map((item, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {(data.analysis?.private_resources || []).length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <strong>Private Resources ({data.analysis.private_resources.length}):</strong>
            <ul style={styles.analysisList}>
              {data.analysis.private_resources.map((item, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{item}</li>
              ))}
            </ul>
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
                ×
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
                ×
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
