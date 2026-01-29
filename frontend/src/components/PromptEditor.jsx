import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const styles = {
  container: {
    padding: '24px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a202c',
  },
  subtitle: {
    color: '#718096',
    fontSize: '14px',
    marginBottom: '24px',
  },
  promptList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  promptCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  promptHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f7fafc',
    cursor: 'pointer',
  },
  promptTitle: {
    fontWeight: '500',
    color: '#2d3748',
  },
  promptBadge: {
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: '#c6f6d5',
    color: '#276749',
  },
  promptBadgeModified: {
    backgroundColor: '#feebc8',
    color: '#c05621',
  },
  promptContent: {
    padding: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  editableLabel: {
    color: '#2b6cb0',
  },
  staticLabel: {
    color: '#718096',
  },
  lockIcon: {
    fontSize: '10px',
  },
  textarea: {
    width: '100%',
    minHeight: '150px',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '13px',
    lineHeight: '1.5',
    resize: 'vertical',
    marginBottom: '12px',
  },
  staticTextarea: {
    width: '100%',
    minHeight: '100px',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '13px',
    lineHeight: '1.5',
    resize: 'vertical',
    marginBottom: '12px',
    backgroundColor: '#f7fafc',
    color: '#718096',
    cursor: 'not-allowed',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    justifyContent: 'flex-end',
  },
  saveButton: {
    padding: '8px 16px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  resetButton: {
    padding: '8px 16px',
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
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
  success: {
    padding: '12px',
    backgroundColor: '#c6f6d5',
    color: '#276749',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  expandIcon: {
    fontSize: '12px',
    color: '#718096',
  },
  helpText: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#f7fafc',
    borderRadius: '4px',
    borderLeft: '3px solid #4299e1',
  },
};

// Parse prompt content into editable and static sections
const parsePromptSections = (content) => {
  const sections = [];
  const staticRegex = /<!-- STATIC:(\w+) -->([\s\S]*?)<!-- \/STATIC:\1 -->/g;

  let lastIndex = 0;
  let match;

  while ((match = staticRegex.exec(content)) !== null) {
    // Add editable content before this static section
    if (match.index > lastIndex) {
      const editableContent = content.slice(lastIndex, match.index);
      if (editableContent.trim()) {
        sections.push({
          type: 'editable',
          content: editableContent,
        });
      }
    }

    // Add the static section
    sections.push({
      type: 'static',
      label: match[1],
      content: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining editable content
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      sections.push({
        type: 'editable',
        content: remaining,
      });
    }
  }

  // If no static sections found, return entire content as editable
  if (sections.length === 0) {
    sections.push({
      type: 'editable',
      content: content,
    });
  }

  return sections;
};

// Rebuild prompt content from sections
const rebuildPromptContent = (sections) => {
  return sections.map(section => {
    if (section.type === 'static') {
      return `<!-- STATIC:${section.label} -->\n${section.content}\n<!-- /STATIC:${section.label} -->`;
    }
    return section.content;
  }).join('\n');
};

export default function PromptEditor() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [expandedPrompt, setExpandedPrompt] = useState(null);
  const [editedSections, setEditedSections] = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api/prompts`);
      if (!response.ok) throw new Error('Failed to fetch prompts');
      const data = await response.json();
      setPrompts(data);

      // Parse each prompt into sections
      const sections = {};
      data.forEach(p => {
        sections[p.key] = parsePromptSections(p.content);
      });
      setEditedSections(sections);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (promptKey, sectionIndex, newContent) => {
    setEditedSections(prev => {
      const sections = [...prev[promptKey]];
      sections[sectionIndex] = { ...sections[sectionIndex], content: newContent };
      return { ...prev, [promptKey]: sections };
    });
  };

  const handleSave = async (key) => {
    try {
      setSaving({ ...saving, [key]: true });
      setError(null);
      setSuccess(null);

      const content = rebuildPromptContent(editedSections[key]);

      const response = await fetch(`${API_BASE}/api/prompts/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error('Failed to save prompt');

      setSuccess(`Prompt "${key}" saved successfully`);
      await fetchPrompts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving({ ...saving, [key]: false });
    }
  };

  const handleReset = async (key) => {
    if (!confirm('Reset this prompt to default?')) return;

    try {
      setSaving({ ...saving, [key]: true });
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_BASE}/api/prompts/${key}/reset`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to reset prompt');

      setSuccess(`Prompt "${key}" reset to default`);
      await fetchPrompts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving({ ...saving, [key]: false });
    }
  };

  const toggleExpand = (key) => {
    setExpandedPrompt(expandedPrompt === key ? null : key);
  };

  const getLabelForStatic = (label) => {
    switch (label) {
      case 'OUTPUT_FORMAT':
        return 'Output Format (Read-only)';
      case 'VARIABLES':
        return 'Variable Placeholders (Read-only)';
      default:
        return `${label} (Read-only)`;
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading prompts...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Prompt Editor</h2>
      </div>

      <p style={styles.subtitle}>
        Customize the AI prompts used for diagram analysis and threat generation.
        Sections marked with a lock icon cannot be edited as they define the required output format.
      </p>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.promptList}>
        {prompts.map((prompt) => (
          <div key={prompt.key} style={styles.promptCard}>
            <div
              style={styles.promptHeader}
              onClick={() => toggleExpand(prompt.key)}
            >
              <div>
                <span style={styles.promptTitle}>{prompt.name}</span>
                <span
                  style={{
                    ...styles.promptBadge,
                    ...(prompt.is_default ? {} : styles.promptBadgeModified),
                    marginLeft: '12px',
                  }}
                >
                  {prompt.is_default ? 'Default' : 'Modified'}
                </span>
              </div>
              <span style={styles.expandIcon}>
                {expandedPrompt === prompt.key ? '[-]' : '[+]'}
              </span>
            </div>

            {expandedPrompt === prompt.key && editedSections[prompt.key] && (
              <div style={styles.promptContent}>
                {editedSections[prompt.key].map((section, idx) => (
                  <div key={idx}>
                    {section.type === 'editable' ? (
                      <>
                        <div style={{ ...styles.sectionLabel, ...styles.editableLabel }}>
                          Editable Content
                        </div>
                        <textarea
                          style={styles.textarea}
                          value={section.content}
                          onChange={(e) => handleSectionChange(prompt.key, idx, e.target.value)}
                          placeholder="Enter prompt content..."
                        />
                      </>
                    ) : (
                      <>
                        <div style={{ ...styles.sectionLabel, ...styles.staticLabel }}>
                          <span style={styles.lockIcon}>[Locked]</span>
                          {getLabelForStatic(section.label)}
                        </div>
                        <textarea
                          style={styles.staticTextarea}
                          value={section.content}
                          readOnly
                          disabled
                        />
                      </>
                    )}
                  </div>
                ))}

                <div style={styles.helpText}>
                  Locked sections ensure the AI returns data in the correct format.
                  Editing them may break the application.
                </div>

                <div style={styles.buttonGroup}>
                  <button
                    style={styles.resetButton}
                    onClick={() => handleReset(prompt.key)}
                    disabled={saving[prompt.key] || prompt.is_default}
                  >
                    Reset to Default
                  </button>
                  <button
                    style={styles.saveButton}
                    onClick={() => handleSave(prompt.key)}
                    disabled={saving[prompt.key]}
                  >
                    {saving[prompt.key] ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
