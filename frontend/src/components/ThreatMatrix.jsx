import React, { useState } from 'react';
import * as XLSX from 'xlsx';

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
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a202c',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '8px 16px',
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  exportButton: {
    padding: '8px 16px',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    backgroundColor: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: '600',
    color: '#4a5568',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e2e8f0',
    verticalAlign: 'top',
  },
  scenarioCell: {
    maxWidth: '300px',
  },
  mitigationCell: {
    maxWidth: '250px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  badgeConfidentiality: {
    backgroundColor: '#fed7d7',
    color: '#c53030',
  },
  badgeIntegrity: {
    backgroundColor: '#feebc8',
    color: '#c05621',
  },
  badgeAvailability: {
    backgroundColor: '#c6f6d5',
    color: '#276749',
  },
  deleteButton: {
    padding: '4px 8px',
    backgroundColor: '#fc8181',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  backButton: {
    marginTop: '24px',
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  stats: {
    display: 'flex',
    gap: '24px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  stat: {
    padding: '16px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    minWidth: '120px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
  },
  statLabel: {
    fontSize: '12px',
    color: '#718096',
    textTransform: 'uppercase',
  },
};

export default function ThreatMatrix({ threats: initialThreats, onBack }) {
  const [threats, setThreats] = useState(initialThreats);
  const [strideFilter, setStrideFilter] = useState('all');
  const [ciaFilter, setCiaFilter] = useState('all');

  const filteredThreats = threats.filter((threat) => {
    if (strideFilter !== 'all' && threat.stride !== strideFilter) return false;
    if (ciaFilter !== 'all' && threat.cia_triad !== ciaFilter) return false;
    return true;
  });

  const strideCategories = [...new Set(threats.map((t) => t.stride))];
  const ciaCategories = [...new Set(threats.map((t) => t.cia_triad))];

  const deleteThreat = (id) => {
    setThreats(threats.filter((t) => t.id !== id));
  };

  const exportToExcel = () => {
    // Prepare data for Excel
    const headers = ['ID', 'Threat Scenario', 'CIA Triad', 'STRIDE Category', 'MITRE Tactic', 'MITRE Technique', 'Mitigations'];

    const data = filteredThreats.map((t) => ({
      'ID': t.id,
      'Threat Scenario': t.scenario,
      'CIA Triad': t.cia_triad,
      'STRIDE Category': t.stride,
      'MITRE Tactic': t.mitre_tactic,
      'MITRE Technique': t.mitre_technique,
      'Mitigations': t.mitigations,
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 8 },   // ID
      { wch: 50 },  // Scenario
      { wch: 15 },  // CIA Triad
      { wch: 20 },  // STRIDE
      { wch: 20 },  // MITRE Tactic
      { wch: 25 },  // MITRE Technique
      { wch: 60 },  // Mitigations
    ];

    // Add summary sheet
    const summaryData = [
      { 'Metric': 'Total Threats', 'Count': stats.total },
      { 'Metric': 'Confidentiality Threats', 'Count': stats.confidentiality },
      { 'Metric': 'Integrity Threats', 'Count': stats.integrity },
      { 'Metric': 'Availability Threats', 'Count': stats.availability },
      { 'Metric': '', 'Count': '' },
      { 'Metric': 'Report Generated', 'Count': new Date().toLocaleString() },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 25 }, { wch: 20 }];

    // Add STRIDE breakdown sheet
    const strideBreakdown = strideCategories.map(cat => ({
      'STRIDE Category': cat,
      'Count': threats.filter(t => t.stride === cat).length
    }));
    const strideWs = XLSX.utils.json_to_sheet(strideBreakdown);
    strideWs['!cols'] = [{ wch: 25 }, { wch: 10 }];

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    XLSX.utils.book_append_sheet(wb, ws, 'Threat Details');
    XLSX.utils.book_append_sheet(wb, strideWs, 'STRIDE Breakdown');

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `Auspex_Threat_Report_${date}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
  };

  const getCiaBadgeStyle = (cia) => {
    switch (cia) {
      case 'Confidentiality':
        return { ...styles.badge, ...styles.badgeConfidentiality };
      case 'Integrity':
        return { ...styles.badge, ...styles.badgeIntegrity };
      case 'Availability':
        return { ...styles.badge, ...styles.badgeAvailability };
      default:
        return styles.badge;
    }
  };

  // Stats
  const stats = {
    total: threats.length,
    confidentiality: threats.filter((t) => t.cia_triad === 'Confidentiality').length,
    integrity: threats.filter((t) => t.cia_triad === 'Integrity').length,
    availability: threats.filter((t) => t.cia_triad === 'Availability').length,
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Threat Report</h2>
        <div style={styles.actions}>
          <button style={styles.exportButton} onClick={exportToExcel}>
            Export Excel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total Threats</div>
        </div>
        <div style={styles.stat}>
          <div style={{ ...styles.statValue, color: '#c53030' }}>{stats.confidentiality}</div>
          <div style={styles.statLabel}>Confidentiality</div>
        </div>
        <div style={styles.stat}>
          <div style={{ ...styles.statValue, color: '#c05621' }}>{stats.integrity}</div>
          <div style={styles.statLabel}>Integrity</div>
        </div>
        <div style={styles.stat}>
          <div style={{ ...styles.statValue, color: '#276749' }}>{stats.availability}</div>
          <div style={styles.statLabel}>Availability</div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          style={styles.filterSelect}
          value={strideFilter}
          onChange={(e) => setStrideFilter(e.target.value)}
        >
          <option value="all">All STRIDE Categories</option>
          {strideCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          style={styles.filterSelect}
          value={ciaFilter}
          onChange={(e) => setCiaFilter(e.target.value)}
        >
          <option value="all">All CIA Triad</option>
          {ciaCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Scenario</th>
              <th style={styles.th}>CIA</th>
              <th style={styles.th}>STRIDE</th>
              <th style={styles.th}>MITRE Tactic</th>
              <th style={styles.th}>MITRE Technique</th>
              <th style={styles.th}>Mitigations</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredThreats.map((threat) => (
              <tr key={threat.id}>
                <td style={styles.td}>{threat.id}</td>
                <td style={{ ...styles.td, ...styles.scenarioCell }}>{threat.scenario}</td>
                <td style={styles.td}>
                  <span style={getCiaBadgeStyle(threat.cia_triad)}>{threat.cia_triad}</span>
                </td>
                <td style={styles.td}>{threat.stride}</td>
                <td style={styles.td}>{threat.mitre_tactic}</td>
                <td style={styles.td}>{threat.mitre_technique}</td>
                <td style={{ ...styles.td, ...styles.mitigationCell }}>{threat.mitigations}</td>
                <td style={styles.td}>
                  <button style={styles.deleteButton} onClick={() => deleteThreat(threat.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button style={styles.backButton} onClick={onBack}>
        Start New Analysis
      </button>
    </div>
  );
}
