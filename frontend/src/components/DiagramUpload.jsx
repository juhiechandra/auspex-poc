import React, { useState, useRef } from 'react';
import { analyzeDiagram } from '../api.js';

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
  dropzone: {
    border: '2px dashed #cbd5e0',
    borderRadius: '8px',
    padding: '48px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#f7fafc',
  },
  dropzoneActive: {
    borderColor: '#4299e1',
    backgroundColor: '#ebf8ff',
  },
  preview: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '4px',
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
  buttonDisabled: {
    backgroundColor: '#a0aec0',
    cursor: 'not-allowed',
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
  section: {
    marginTop: '24px',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCount: {
    fontSize: '12px',
    color: '#718096',
    fontWeight: 'normal',
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  itemInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  removeButton: {
    padding: '8px 12px',
    backgroundColor: '#fed7d7',
    color: '#c53030',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '8px',
  },
  analysisContainer: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
};

export default function DiagramUpload({ onAnalysisComplete, isLoading, setIsLoading, provider }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageBase64, setImageBase64] = useState(null);
  const fileInputRef = useRef(null);

  // Analysis state (editable)
  const [analyzed, setAnalyzed] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [entryPoints, setEntryPoints] = useState([]);
  const [dataFlows, setDataFlows] = useState([]);
  const [securityBoundaries, setSecurityBoundaries] = useState([]);
  const [publicResources, setPublicResources] = useState([]);
  const [privateResources, setPrivateResources] = useState([]);

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a valid image file (PNG, JPEG, GIF, or WebP)');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setAnalyzed(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setImageBase64(e.target.result.split(',')[1]);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file || !imageBase64) return;

    setIsLoading(true);
    setError(null);
    setStatus(`Analyzing architecture diagram (${provider})...`);

    try {
      const analysis = await analyzeDiagram(imageBase64, file.type, null, provider);

      setSessionId(analysis.session_id);
      setEntryPoints(analysis.entry_points || []);
      setDataFlows(analysis.data_flows || []);
      setSecurityBoundaries(analysis.security_boundaries || []);
      setPublicResources(analysis.public_resources || []);
      setPrivateResources(analysis.private_resources || []);
      setAnalyzed(true);
      setStatus(null);
    } catch (err) {
      console.error('[DiagramUpload] Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    onAnalysisComplete({
      sessionId,
      analysis: {
        entry_points: entryPoints,
        data_flows: dataFlows,
        security_boundaries: securityBoundaries,
        public_resources: publicResources,
        private_resources: privateResources,
      },
      imageBase64,
      mediaType: file.type,
    });
  };

  // Helper functions for editing lists
  const updateItem = (setter, index, value) => {
    setter(prev => prev.map((item, i) => i === index ? value : item));
  };

  const removeItem = (setter, index) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const addItem = (setter) => {
    setter(prev => [...prev, '']);
  };

  const renderEditableList = (title, items, setter) => (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>
        {title}
        <span style={styles.itemCount}>{items.length} items</span>
      </div>
      <div style={styles.itemList}>
        {items.map((item, index) => (
          <div key={index} style={styles.itemRow}>
            <input
              style={styles.itemInput}
              value={item}
              onChange={(e) => updateItem(setter, index, e.target.value)}
              placeholder={`Enter ${title.toLowerCase()}...`}
            />
            <button
              style={styles.removeButton}
              onClick={() => removeItem(setter, index)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button style={styles.addButton} onClick={() => addItem(setter)}>
        + Add {title.replace(/s$/, '')}
      </button>
    </div>
  );

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Step 1: Upload & Analyze Architecture Diagram</h2>

      {!analyzed ? (
        <>
          <div
            style={{ ...styles.dropzone, ...(isDragging ? styles.dropzoneActive : {}) }}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div style={{ fontSize: '48px', marginBottom: '16px', color: '#4299e1' }}>[+]</div>
            <p style={{ color: '#4a5568', marginBottom: '8px' }}>
              Drag and drop your architecture diagram here
            </p>
            <p style={{ color: '#718096', fontSize: '14px' }}>
              or click to browse (PNG, JPEG, GIF, WebP)
            </p>
          </div>

          {preview && (
            <div style={styles.preview}>
              <img src={preview} alt="Preview" style={styles.previewImage} />
              <p style={{ marginTop: '8px', color: '#718096', fontSize: '14px' }}>{file?.name}</p>
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}
          {status && isLoading && <div style={styles.status}>{status}</div>}

          <button
            style={{ ...styles.button, ...(isLoading || !file ? styles.buttonDisabled : {}) }}
            onClick={handleAnalyze}
            disabled={isLoading || !file}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Diagram'}
          </button>
        </>
      ) : (
        <>
          {preview && (
            <div style={styles.preview}>
              <img src={preview} alt="Preview" style={styles.previewImage} />
              <p style={{ marginTop: '8px', color: '#718096', fontSize: '14px' }}>{file?.name}</p>
            </div>
          )}

          <div style={styles.analysisContainer}>
            <h3 style={{ margin: '0 0 16px 0', color: '#2d3748' }}>
              Architecture Analysis (Editable)
            </h3>
            <p style={{ color: '#718096', fontSize: '14px', marginBottom: '16px' }}>
              Review and edit the extracted architecture details before proceeding.
            </p>

            {renderEditableList('Entry Points', entryPoints, setEntryPoints)}
            {renderEditableList('Data Flows', dataFlows, setDataFlows)}
            {renderEditableList('Security Boundaries', securityBoundaries, setSecurityBoundaries)}
            {renderEditableList('Public Resources', publicResources, setPublicResources)}
            {renderEditableList('Private Resources', privateResources, setPrivateResources)}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.button} onClick={handleContinue}>
            Continue to Component Extraction
          </button>
          <button
            style={{ ...styles.button, backgroundColor: 'transparent', color: '#4a5568', border: '1px solid #e2e8f0', marginTop: '8px' }}
            onClick={() => setAnalyzed(false)}
          >
            Re-upload Diagram
          </button>
        </>
      )}
    </div>
  );
}
