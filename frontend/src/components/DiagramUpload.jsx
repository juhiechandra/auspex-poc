import React, { useState, useRef } from 'react';
import { analyzeDiagram, extractComponents } from '../api.js';

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
    maxHeight: '300px',
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
};

export default function DiagramUpload({ onAnalysisComplete, isLoading, setIsLoading, provider }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a valid image file (PNG, JPEG, GIF, or WebP)');
      return;
    }

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setStatus('Reading image file...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target.result.split(',')[1];

          // Step 1: Analyze diagram (creates session)
          setStatus(`Step 1/2: Analyzing architecture diagram (${provider})...`);
          console.log('[DiagramUpload] Starting Step 1: Analyze diagram with provider:', provider);
          const analysis = await analyzeDiagram(base64, file.type, null, provider);
          const sessionId = analysis.session_id;
          console.log('[DiagramUpload] Step 1 complete, session:', sessionId);

          // Step 2: Extract components (uses same session)
          setStatus(`Step 2/2: Extracting components (${provider})...`);
          console.log('[DiagramUpload] Starting Step 2: Extract components');
          const components = await extractComponents(base64, file.type, sessionId, provider);
          console.log('[DiagramUpload] Step 2 complete:', components);

          setStatus('Analysis complete!');
          onAnalysisComplete({
            sessionId,
            analysis,
            components,
            imageBase64: base64,
            mediaType: file.type
          });
        } catch (err) {
          console.error('[DiagramUpload] Error:', err);
          setError(err.message);
          setStatus(null);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('[DiagramUpload] Error:', err);
      setError(err.message);
      setStatus(null);
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Step 1: Upload Architecture Diagram</h2>

      <div
        style={{ ...styles.dropzone, ...(isDragging ? styles.dropzoneActive : {}) }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
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
          <p style={{ marginTop: '8px', color: '#718096', fontSize: '14px' }}>
            {file?.name}
          </p>
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
    </div>
  );
}
