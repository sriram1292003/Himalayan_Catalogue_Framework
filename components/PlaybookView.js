import { useState, useEffect, useRef } from 'react';
import { CATALOG_DATA } from '@/lib/data';
import { Search, Filter, FolderOpen } from 'lucide-react';

const cleanId = (str) => {
  if (!str) return 'unknown';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '-');
};

const platformNameClean = (str) => {
  return cleanId(str.replace(' (2)', ''));
};

const getPlaybookData = (sheetName) => {
  const rawRows = CATALOG_DATA[sheetName];
  if (!rawRows || rawRows.length === 0) return { desc: '', headers: [], rows: [] };
  
  let desc = "";
  if (rawRows[0] && rawRows[0][0]) {
    desc = rawRows[0][0];
  }
  if (rawRows[1] && rawRows[1][0] && desc.length < 50) {
    desc += " — " + rawRows[1][0];
  }
  
  let headerIdx = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row.includes("Field") || row.includes("Attribute")) {
      headerIdx = i;
      break;
    }
  }
  
  if (headerIdx === -1) return { desc, headers: [], rows: [] };
  
  const rawHeaders = rawRows[headerIdx];
  const dataRows = [];
  
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const nonAmp = row.filter(cell => cell && cell.trim() !== "");
    if (nonAmp.length === 0) continue;
    
    if (nonAmp.length === 1 && nonAmp[0].trim() === nonAmp[0].trim().toUpperCase()) {
      dataRows.push({ isSection: true, title: nonAmp[0].trim() });
      continue;
    }
    
    const rowObj = { isSection: false };
    for (let j = 0; j < rawHeaders.length; j++) {
      const headerName = rawHeaders[j];
      if (headerName && headerName.trim() !== "") {
        rowObj[headerName.trim()] = row[j] !== undefined && row[j] !== null ? String(row[j]).trim() : "";
      }
    }
    
    let category = "Common";
    if (rowObj["Cat"]) {
      const catLower = rowObj["Cat"].toLowerCase();
      if (catLower.includes("beauty")) category = "Beauty";
      else if (catLower.includes("baby")) category = "Baby";
      else if (catLower.includes("common") || catLower.includes("both")) category = "Common";
    } else {
      if (sheetName.includes("Nykaa")) category = "Beauty";
      if (sheetName.includes("FirstCry")) category = "Baby";
    }
    rowObj._category = category;
    dataRows.push(rowObj);
  }
  
  return { desc, headers: rawHeaders.filter(h => h && h.trim() !== ""), rows: dataRows };
};

export default function PlaybookView({ initialPlatform, highlightField, clearHighlight }) {
  const [platform, setPlatform] = useState(initialPlatform || 'Amazon');
  const [playbook, setPlaybook] = useState(() => getPlaybookData(initialPlatform || 'Amazon'));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const rowRefs = useRef({});

  // Parse playbook data when platform changes
  useEffect(() => {
    setPlaybook(getPlaybookData(platform));
  }, [platform]);

  // Effect to scroll to and highlight a row if redirected
  useEffect(() => {
    if (highlightField && playbook.rows.length > 0) {
      // Find matching field
      let matchField = highlightField;
      if (highlightField.toLowerCase().includes('title')) matchField = 'Product Name';
      if (highlightField.toLowerCase().includes('description')) matchField = 'Description';
      if (highlightField.toLowerCase().includes('bullet') || highlightField.toLowerCase().includes('features')) matchField = 'Key Features';
      if (highlightField.toLowerCase().includes('ingredient')) matchField = 'Ingredient';

      const rowId = `${platformNameClean(platform)}-${cleanId(matchField)}`;
      const element = document.getElementById(rowId);
      
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.outline = '3px solid var(--accent-gold)';
          element.style.transition = 'outline 0.3s ease';
          
          setTimeout(() => {
            element.style.outline = 'none';
            clearHighlight();
          }, 3000);
        }, 300);
      }
    }
  }, [highlightField, playbook, platform]);

  // Filtered rows helper
  const displayHeaders = playbook.headers.filter(h => h !== "Cat" && h !== "No");
  let filteredRows = playbook.rows;
  if (categoryFilter !== 'all') {
    filteredRows = filteredRows.filter(r => r.isSection || r._category === categoryFilter);
  }
  if (searchQuery && searchQuery.trim() !== '') {
    const query = searchQuery.toLowerCase().trim();
    filteredRows = filteredRows.filter(r => {
      if (r.isSection) return false;
      return Object.values(r).some(val => typeof val === 'string' && val.toLowerCase().includes(query));
    });
  }

  const platforms = Object.keys(CATALOG_DATA).filter(k => 
    k !== "SKU" && k !== "Index" && k !== "L1 Priority Matrix"
  );

  return (
    <div className="view-section">
      <div className="page-header">
        <div>
          <h1>Platform Playbook Explorer</h1>
          <p>Detailed input specifications, limits, formulas, and examples extracted from each platform's seller playbooks.</p>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="platform-tabs-container">
        <div className="platform-tabs">
          {platforms.map(p => (
            <button 
              key={p}
              className={`platform-tab-btn ${platform === p ? 'active' : ''}`}
              onClick={() => {
                setPlatform(p);
                setSearchQuery('');
              }}
            >
              {p.replace(' (2)', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Table Box */}
      <div className="playbook-card">
        <div className="playbook-meta-header">
          <div className="playbook-title-area">
            <h2>{platform.replace(' (2)', '')} Playbook Guidelines</h2>
            <p className="playbook-desc">{playbook.desc}</p>
          </div>
          
          <div className="playbook-filters">
            <div className="filter-group">
              <span className="filter-label"><Filter style={{ width: '14px', height: '14px', verticalAlign: 'middle' }} /> Category:</span>
              <div className="filter-buttons">
                <button 
                  className={`btn btn-toggle ${categoryFilter === 'all' ? 'active' : ''}`} 
                  onClick={() => setCategoryFilter('all')}
                >All</button>
                <button 
                  className={`btn btn-toggle pink ${categoryFilter === 'Beauty' ? 'active' : ''}`} 
                  onClick={() => setCategoryFilter('Beauty')}
                >Beauty</button>
                <button 
                  className={`btn btn-toggle blue ${categoryFilter === 'Baby' ? 'active' : ''}`} 
                  onClick={() => setCategoryFilter('Baby')}
                >Baby</button>
                <button 
                  className={`btn btn-toggle grey ${categoryFilter === 'Common' ? 'active' : ''}`} 
                  onClick={() => setCategoryFilter('Common')}
                >Common</button>
              </div>
            </div>
            
            <div className="search-wrapper">
              <Search />
              <input 
                type="text" 
                placeholder="Search rules..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Specs Table */}
        <div className="table-scroll-container">
          <table className="playbook-table">
            <thead>
              <tr>
                {displayHeaders.map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                if (row.isSection) {
                  return (
                    <tr className="row-section-divider" key={index}>
                      <td 
                        colSpan={displayHeaders.length} 
                        style={{
                          backgroundColor: 'var(--primary-green-xlight)',
                          color: 'var(--primary-green)',
                          fontWeight: '700',
                          padding: '12px 16px',
                          borderBottom: '2px solid var(--border-color)'
                        }}
                      >
                        <FolderOpen style={{ width: '16px', height: '16px', marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} /> 
                        {row.title}
                      </td>
                    </tr>
                  );
                }

                const catClass = `row-${row._category.toLowerCase()}`;
                const rowId = `${platformNameClean(platform)}-${cleanId(row['Field'] || row['Attribute'])}`;

                return (
                  <tr className={catClass} id={rowId} key={index}>
                    {displayHeaders.map(h => {
                      const cellVal = row[h] || '';
                      
                      if (h === 'Field' || h === 'Attribute') {
                        return (
                          <td key={h} data-label={h}>
                            <div className="rule-header-title">{cellVal}</div>
                            <span className={`badge-cat ${row._category.toLowerCase()}`}>{row._category}</span>
                          </td>
                        );
                      } else if (h === 'Best-Practice Formula') {
                        return (
                          <td key={h} data-label={h}>
                            <span className="formula-text">{cellVal || 'N/A'}</span>
                          </td>
                        );
                      } else if (h.includes('Example')) {
                        return (
                          <td key={h} data-label={h}>
                            {cellVal ? (
                              <div className="example-box">{cellVal}</div>
                            ) : (
                              <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>None</span>
                            )}
                          </td>
                        );
                      } else if (h === 'Notes') {
                        return (
                          <td key={h} data-label={h}>
                            <div className="notes-text">{cellVal}</div>
                          </td>
                        );
                      } else if (h === 'Hard Limit' || h === 'Target Range') {
                        return (
                          <td key={h} data-label={h} style={{ fontWeight: '500', color: 'var(--text-dark)' }}>
                            {cellVal || 'N/A'}
                          </td>
                        );
                      } else {
                        return <td key={h} data-label={h}>{cellVal}</td>;
                      }
                    })}
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={displayHeaders.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    <Search style={{ width: '24px', height: '24px', margin: '0 auto 8px', display: 'block', color: 'var(--text-light)' }} />
                    No rules found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
