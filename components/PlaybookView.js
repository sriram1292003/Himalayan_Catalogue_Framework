'use client';
import { useState, useEffect, useRef, Fragment } from 'react';
import { CATALOG_DATA } from '@/lib/data';
import { Search, Filter, FolderOpen, ChevronDown, ChevronUp, BookOpen, Lightbulb, FileText, AlertCircle, Beaker, X } from 'lucide-react';

const cleanId = (str) => {
  if (!str) return 'unknown';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '-');
};

const platformNameClean = (str) => {
  return cleanId(str.replace(' (2)', ''));
};

const getPlaybookData = (sheetName) => {
  const rawRows = CATALOG_DATA[sheetName];
  if (!rawRows || rawRows.length === 0) return { desc: '', subtitle: '', headers: [], rows: [] };

  let desc = '';
  let subtitle = '';
  if (rawRows[0] && rawRows[0][0]) desc = rawRows[0][0];
  if (rawRows[1] && rawRows[1][0]) subtitle = rawRows[1][0];

  let headerIdx = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row.includes('Field') || row.includes('Attribute')) { headerIdx = i; break; }
  }

  if (headerIdx === -1) return { desc, subtitle, headers: [], rows: [] };

  const rawHeaders = rawRows[headerIdx];
  const dataRows = [];

  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const nonAmp = row.filter(cell => cell && cell.trim() !== '');
    if (nonAmp.length === 0) continue;

    if (nonAmp.length === 1 && nonAmp[0].trim() === nonAmp[0].trim().toUpperCase()) {
      dataRows.push({ isSection: true, title: nonAmp[0].trim() });
      continue;
    }

    const rowObj = { isSection: false };
    for (let j = 0; j < rawHeaders.length; j++) {
      const headerName = rawHeaders[j];
      if (headerName && headerName.trim() !== '') {
        rowObj[headerName.trim()] = row[j] !== undefined && row[j] !== null ? String(row[j]).trim() : '';
      }
    }

    let category = 'Common';
    if (rowObj['Cat']) {
      const catLower = rowObj['Cat'].toLowerCase();
      if (catLower.includes('beauty')) category = 'Beauty';
      else if (catLower.includes('baby')) category = 'Baby';
      else if (catLower.includes('common') || catLower.includes('both')) category = 'Common';
    } else {
      if (sheetName.includes('Nykaa')) category = 'Beauty';
      if (sheetName.includes('FirstCry')) category = 'Baby';
    }
    rowObj._category = category;
    dataRows.push(rowObj);
  }

  return { desc, subtitle, headers: rawHeaders.filter(h => h && h.trim() !== ''), rows: dataRows };
};

const PLATFORM_META = {
  'Amazon': { color: '#FF9900', bg: '#fff8ee', icon: '🛒', accent: '#e07b00' },
  'Flipkart': { color: '#2874F0', bg: '#edf3ff', icon: '🛍️', accent: '#1a5bbf' },
  'Quick Commerce (2)': { color: '#F7B731', bg: '#fffbea', icon: '⚡', accent: '#c9900a' },
  'Nykaa (2)': { color: '#DB3676', bg: '#fff0f6', icon: '💄', accent: '#a8255a' },
  'Myntra (2)': { color: '#FF3F6C', bg: '#fff0f2', icon: '👗', accent: '#c72d52' },
  'FirstCry (2)': { color: '#FF6B35', bg: '#fff4f0', icon: '🍼', accent: '#c74d1f' },
};

export default function PlaybookView({ initialPlatform, highlightField, clearHighlight }) {
  const [platform, setPlatform] = useState(initialPlatform || 'Amazon');
  const [playbook, setPlaybook] = useState(() => getPlaybookData(initialPlatform || 'Amazon'));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [isIndexOpen, setIsIndexOpen] = useState(false);

  const rowRefs = useRef({});

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsIndexOpen(false);
    };
    if (isIndexOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isIndexOpen]);

  useEffect(() => {
    setPlaybook(getPlaybookData(platform));
    setExpandedRows(new Set());
  }, [platform]);

  useEffect(() => {
    if (highlightField && playbook.rows.length > 0) {
      let matchField = highlightField;
      if (highlightField.toLowerCase().includes('title')) matchField = 'Product Name';
      if (highlightField.toLowerCase().includes('description')) matchField = 'Description';
      if (highlightField.toLowerCase().includes('bullet') || highlightField.toLowerCase().includes('features')) matchField = 'Key Features';
      if (highlightField.toLowerCase().includes('ingredient')) matchField = 'Ingredient';

      const baseId = `${platformNameClean(platform)}-${cleanId(matchField)}`;
      const element = document.getElementById(baseId) || 
                      document.getElementById(`${baseId}-beauty`) || 
                      document.getElementById(`${baseId}-baby`) || 
                      document.getElementById(`${baseId}-common`);
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

  const toggleRow = (rowId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const platforms = Object.keys(CATALOG_DATA).filter(k =>
    k !== 'SKU' && k !== 'Index' && k !== 'L1 Priority Matrix'
  );

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

  const meta = PLATFORM_META[platform] || { color: '#074735', bg: '#e6eee9', icon: '📋', accent: '#0d664d' };
  const dataRowCount = filteredRows.filter(r => !r.isSection).length;

  return (
    <div className="view-section">
      {/* ── Page Header ── */}
      <div className="pb-page-header">
        <div className="pb-header-left">
          <div className="pb-header-eyebrow">
            <BookOpen style={{ width: 14, height: 14 }} />
            <span>Content Framework</span>
          </div>
          <h1 className="pb-title">Platform Playbook Explorer</h1>
          <p className="pb-subtitle">Detailed input specifications, hard limits, formulas &amp; examples extracted from each platform's seller playbooks.</p>
        </div>
        <div className="pb-header-right">
          <button className="pb-index-btn" onClick={() => setIsIndexOpen(true)}>
            <BookOpen style={{ width: 14, height: 14 }} />
            <span>View Index</span>
          </button>
        </div>
      </div>

      {/* ── Platform Tabs ── */}
      <div className="pb-tabs-row">
        {platforms.map(p => {
          const pmeta = PLATFORM_META[p] || { color: '#074735', bg: '#e6eee9', icon: '📋' };
          const isActive = platform === p;
          return (
            <button
              key={p}
              className={`pb-tab ${isActive ? 'pb-tab-active' : ''}`}
              style={isActive ? { '--tab-color': pmeta.color, '--tab-bg': pmeta.bg } : {}}
              onClick={() => { setPlatform(p); setSearchQuery(''); setCategoryFilter('all'); }}
            >
              <span className="pb-tab-icon">{pmeta.icon}</span>
              <span>{p.replace(' (2)', '')}</span>
            </button>
          );
        })}
      </div>

      {/* ── Main Table Card ── */}
      <div className="pb-table-card" style={{ '--platform-color': meta.color, '--platform-bg': meta.bg, '--platform-accent': meta.accent }}>

        {/* Card Header with gradient accent */}
        <div className="pb-card-header">
          <div className="pb-card-header-glow" />
          <div className="pb-card-header-content">
            <div className="pb-card-title-row">
              <div className="pb-platform-badge" style={{ background: meta.bg, color: meta.color, borderColor: meta.color + '33' }}>
                <span style={{ fontSize: 20 }}>{meta.icon}</span>
                <span>{platform.replace(' (2)', '')} Playbook</span>
              </div>
              <div className="pb-row-count-badge">
                <span style={{ color: meta.color, fontWeight: 700 }}>{dataRowCount}</span>
                <span>rules</span>
              </div>
            </div>
            {playbook.desc && <p className="pb-card-desc">{playbook.desc}</p>}
            {playbook.subtitle && <p className="pb-card-subdesc">{playbook.subtitle}</p>}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="pb-filters-bar">
          <div className="pb-filters-left">
            <span className="pb-filter-label"><Filter style={{ width: 13, height: 13 }} /> Category</span>
            <div className="pb-cat-pills">
              {[
                { key: 'all', label: 'All', cls: '' },
                { key: 'Beauty', label: '💄 Beauty', cls: 'beauty' },
                { key: 'Baby', label: '🍼 Baby', cls: 'baby' },
                { key: 'Common', label: '📦 Common', cls: 'common' },
              ].map(c => (
                <button
                  key={c.key}
                  className={`pb-cat-pill ${categoryFilter === c.key ? 'active ' + c.cls : ''}`}
                  onClick={() => setCategoryFilter(c.key)}
                >{c.label}</button>
              ))}
            </div>
          </div>
          <div className="pb-search-box">
            <Search style={{ width: 15, height: 15 }} />
            <input
              type="text"
              placeholder="Search rules…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="pb-search-clear" onClick={() => setSearchQuery('')}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
        </div>

        {/* Expand All / Collapse All hint */}
        {dataRowCount > 0 && (
          <div className="pb-expand-hint">
            <span>Click any row or the</span>
            <ChevronDown style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', margin: '0 3px' }} />
            <span>arrow to reveal examples &amp; notes</span>
          </div>
        )}

        {/* Table */}
        <div className="pb-table-scroll">
          <table className="pb-table">
            <thead>
              <tr className="pb-thead-tr">
                <th className="pb-th pb-th-field">Field</th>
                <th className="pb-th pb-th-limit">Hard Limit</th>
                <th className="pb-th pb-th-range">Target Range</th>
                <th className="pb-th pb-th-formula">Best‑Practice Formula</th>
                <th className="pb-th pb-th-expand"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pb-empty-state">
                    <AlertCircle style={{ width: 28, height: 28 }} />
                    <p>No rules match your current filters.</p>
                  </td>
                </tr>
              ) : (
                (() => {
                  let lastField = '';
                  return filteredRows.map((row, index) => {
                    if (row.isSection) {
                      return (
                        <tr key={`s-${index}`} className="pb-section-row">
                          <td colSpan={5}>
                            <span className="pb-section-inner">
                              <FolderOpen style={{ width: 14, height: 14 }} />
                              {row.title}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    const fieldKey = row['Field'] || row['Attribute'] || '';
                    if (fieldKey) {
                      lastField = fieldKey;
                    }
                    const parentField = fieldKey || lastField;
                    const catSuffix = row._category ? `-${cleanId(row._category)}` : '';
                    const rowId = `${platformNameClean(platform)}-${cleanId(parentField || 'unknown')}${catSuffix}`;
                    const isExpanded = expandedRows.has(rowId);
                    const hasDetails = !!(row['Example 1'] || row['Example 2'] || row['Notes']);
                    const catClass = `pb-row-${(row._category || 'common').toLowerCase()}`;

                    return (
                      <Fragment key={rowId}>
                        <tr
                          id={rowId}
                          className={`pb-data-row ${catClass} ${isExpanded ? 'pb-row-expanded' : ''} ${hasDetails ? 'pb-row-clickable' : ''}`}
                          onClick={() => hasDetails && toggleRow(rowId)}
                        >
                        {/* Field */}
                        <td className="pb-td pb-td-field">
                          <div className="pb-field-name">{fieldKey}</div>
                          <span className={`pb-cat-badge pb-cat-${(row._category || 'common').toLowerCase()}`}>
                            {row._category || 'Common'}
                          </span>
                        </td>

                        {/* Hard Limit */}
                        <td className="pb-td pb-td-limit">
                          {row['Hard Limit'] ? (
                            <span className="pb-limit-chip">{row['Hard Limit']}</span>
                          ) : (
                            <span className="pb-na">—</span>
                          )}
                        </td>

                        {/* Target Range */}
                        <td className="pb-td pb-td-range">
                          {row['Target Range'] ? (
                            <span className="pb-range-chip">{row['Target Range']}</span>
                          ) : (
                            <span className="pb-na">—</span>
                          )}
                        </td>

                        {/* Best-Practice Formula */}
                        <td className="pb-td pb-td-formula">
                          {row['Best-Practice Formula'] ? (
                            <div className="pb-formula-block">
                              <Beaker style={{ width: 12, height: 12, flexShrink: 0, marginTop: 2 }} />
                              <span>{row['Best-Practice Formula']}</span>
                            </div>
                          ) : (
                            <span className="pb-na">—</span>
                          )}
                        </td>

                        {/* Expand Toggle */}
                        <td className="pb-td pb-td-expand">
                          {hasDetails && (
                            <button
                              className={`pb-expand-btn ${isExpanded ? 'active' : ''}`}
                              onClick={e => { e.stopPropagation(); toggleRow(rowId); }}
                              style={{ '--btn-color': meta.color }}
                              aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded
                                ? <ChevronUp style={{ width: 15, height: 15 }} />
                                : <ChevronDown style={{ width: 15, height: 15 }} />
                              }
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Detail Row */}
                      {hasDetails && isExpanded && (
                        <tr key={`${rowId}-detail`} className={`pb-detail-row ${catClass}`}>
                          <td colSpan={5} className="pb-detail-td">
                            <div className="pb-detail-panel">
                              {/* Examples */}
                              {(row['Example 1'] || row['Example 2']) && (
                                <div className="pb-detail-section">
                                  <div className="pb-detail-section-label">
                                    <Lightbulb style={{ width: 13, height: 13 }} />
                                    <span>Practice Examples</span>
                                  </div>
                                  <div className="pb-examples-grid">
                                    {row['Example 1'] && (
                                      <div className="pb-example-card pb-example-1">
                                        <div className="pb-example-num">Example 1</div>
                                        {row['Example 1'].startsWith('/images/') ? (
                                          <img
                                            src={row['Example 1']}
                                            alt="Example 1"
                                            className="pb-example-img"
                                            style={{ width: '100%', borderRadius: 8, marginTop: 8, display: 'block' }}
                                          />
                                        ) : (
                                          <p>{row['Example 1']}</p>
                                        )}
                                      </div>
                                    )}
                                    {row['Example 2'] && (
                                      <div className="pb-example-card pb-example-2">
                                        <div className="pb-example-num">Example 2</div>
                                        {row['Example 2'].startsWith('/images/') ? (
                                          <img
                                            src={row['Example 2']}
                                            alt="Example 2"
                                            className="pb-example-img"
                                            style={{ width: '100%', borderRadius: 8, marginTop: 8, display: 'block' }}
                                          />
                                        ) : (
                                          <p>{row['Example 2']}</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              {row['Notes'] && (
                                <div className="pb-detail-section">
                                  <div className="pb-detail-section-label">
                                    <FileText style={{ width: 13, height: 13 }} />
                                    <span>Compliance Notes</span>
                                  </div>
                                  <div className="pb-notes-block">
                                    <p>{row['Notes']}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Index Modal ── */}
      {isIndexOpen && (
        <div className="pb-modal-overlay" onClick={() => setIsIndexOpen(false)}>
          <div className="pb-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="pb-modal-header">
              <div>
                <h2 className="pb-modal-title">Index — Himalaya Beauty &amp; Baby Catalog Playbook</h2>
                <p className="pb-modal-subtitle">Read this first. Explains how the workbook is laid out and what every term in the title formulas means.</p>
              </div>
              <button className="pb-modal-close" onClick={() => setIsIndexOpen(false)} aria-label="Close modal">
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            
            <div className="pb-modal-body">
              {/* Section 1: How this workbook is laid out */}
              <div className="pb-modal-section">
                <h3 className="pb-modal-section-title">HOW THIS WORKBOOK IS LAID OUT</h3>
                <div className="pb-layout-cards">
                  <div className="pb-layout-card">
                    <div className="pb-layout-card-title">L1 Priority Matrix</div>
                    <div className="pb-layout-card-desc">One sheet showing which content fields matter most on each platform. Read this first to know where to spend effort.</div>
                  </div>
                  <div className="pb-layout-card">
                    <div className="pb-layout-card-title">Platform tabs</div>
                    <div className="pb-layout-card-desc">One tab per platform — Amazon, Flipkart, Quick Commerce, Nykaa, Myntra, FirstCry, Meesho. Each row is one input field on that platform's seller portal (PDP specific).</div>
                  </div>
                  <div className="pb-layout-card color-coded">
                    <div className="pb-layout-card-title">Beauty / Baby colour coding</div>
                    <div className="pb-layout-card-desc">
                      <span className="pb-color-indicator beauty">Pink rows = Beauty rules.</span>{' '}
                      <span className="pb-color-indicator baby">Blue rows = Baby rules.</span>{' '}
                      <span className="pb-color-indicator common">Grey rows = same rules for both.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: How to read a row */}
              <div className="pb-modal-section">
                <h3 className="pb-modal-section-title">HOW TO READ A ROW</h3>
                <div className="pb-read-grid">
                  <div className="pb-read-card">
                    <span className="pb-read-badge column">Column</span>
                    <span className="pb-read-name">Field</span>
                    <p className="pb-read-desc">The input box on the platform's seller portal. Match this to the box you're filling.</p>
                  </div>
                  <div className="pb-read-card">
                    <span className="pb-read-badge column">Column</span>
                    <span className="pb-read-name">Hard Limit / Target Range</span>
                    <p className="pb-read-desc">Hard Limit is the cap the platform enforces. Target Range is what to aim for.</p>
                  </div>
                  <div className="pb-read-card">
                    <span className="pb-read-badge column">Column</span>
                    <span className="pb-read-name">Best-Practice Formula</span>
                    <p className="pb-read-desc">The recipe for what to write. Each piece is a placeholder defined in Block 4 below.</p>
                  </div>
                  <div className="pb-read-card">
                    <span className="pb-read-badge column">Column</span>
                    <span className="pb-read-name">Examples 1 &amp; 2</span>
                    <p className="pb-read-desc">Real top-seller listings from the platform. Pattern-match these — don't copy them.</p>
                  </div>
                  <div className="pb-read-card">
                    <span className="pb-read-badge column">Column</span>
                    <span className="pb-read-name">Notes</span>
                    <p className="pb-read-desc">The one thing not to miss for that field.</p>
                  </div>
                </div>
              </div>

              {/* Section 3 & 4: Title Formula */}
              <div className="pb-modal-section">
                <div className="pb-formula-header-block">
                  <h3 className="pb-modal-section-title">READING THE TITLE FORMULA</h3>
                  <p className="pb-formula-header-subtitle">Each placeholder is a keyword type — fill it with the strongest keyword that fits.</p>
                </div>

                <h3 className="pb-modal-section-title" style={{ marginTop: '24px' }}>TITLE FORMULA — WHAT EACH PLACEHOLDER MEANS</h3>
                <div className="pb-formula-table-wrapper">
                  <table className="pb-formula-table">
                    <thead>
                      <tr>
                        <th>Placeholder</th>
                        <th>What it means</th>
                        <th>Beauty example</th>
                        <th>Baby example</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="pb-formula-placeholder">Brand</td>
                        <td>Always Himalaya.</td>
                        <td className="pb-example-beauty">Himalaya</td>
                        <td className="pb-example-baby">Himalaya</td>
                      </tr>
                      <tr>
                        <td className="pb-formula-placeholder">Product Type</td>
                        <td>The noun shoppers search for.</td>
                        <td className="pb-example-beauty">Face Wash, Serum, Moisturiser</td>
                        <td className="pb-example-baby">Baby Shampoo, Baby Lotion, Baby Wipes</td>
                      </tr>
                      <tr>
                        <td className="pb-formula-placeholder">Strongest Claim</td>
                        <td>Amazon-only shorthand. Combines Primary Promise + Hero Ingredient + Concentration into one slot. Pick the strongest of the three for that SKU</td>
                        <td className="pb-example-beauty">—</td>
                        <td className="pb-example-baby">—</td>
                      </tr>
                      <tr>
                        <td className="pb-formula-placeholder">Hero Ingredient</td>
                        <td>The signature ingredient the brand wants known.</td>
                        <td className="pb-example-beauty">Niacinamide, Salicylic Acid, Vitamin C</td>
                        <td className="pb-example-baby">Calendula, Almond Oil, Aloe Vera</td>
                      </tr>
                      <tr>
                        <td className="pb-formula-placeholder">Primary Promise</td>
                        <td>The single biggest outcome the product delivers.</td>
                        <td className="pb-example-beauty">Brightening, Anti-Acne, Hydrating</td>
                        <td className="pb-example-baby">Tear-Free, No More Tears, Gentle Cleansing</td>
                      </tr>
                      <tr>
                        <td className="pb-formula-placeholder">Concentration</td>
                        <td>Strength of the active ingredient. Beauty only.</td>
                        <td className="pb-example-beauty">2%, 0.1%, 5%</td>
                        <td className="pb-example-baby">—</td>
                      </tr>
                      <tr>
                        <td className="pb-formula-placeholder">Free-from Claims</td>
                        <td>What the product does NOT contain.</td>
                        <td className="pb-example-beauty">Paraben-Free, Sulfate-Free, Fragrance-Free</td>
                        <td className="pb-example-baby">Tear-Free, Mineral-Oil-Free, Paraben-Free</td>
                      </tr>
                      <tr>
                        <td className="pb-formula-placeholder">Credibility Driver</td>
                        <td>External proof point — who has tested or endorsed it.</td>
                        <td className="pb-example-beauty">Dermatologist Recommended, Clinically Tested</td>
                        <td className="pb-example-baby">Pediatrician Tested, Hypoallergenic</td>
                      </tr>
                      <tr>
                        <td className="pb-formula-placeholder">User Qualifier</td>
                        <td>Who the product is for. Beauty.</td>
                        <td className="pb-example-beauty">For Oily Skin, For Men, Unisex</td>
                        <td className="pb-example-baby">—</td>
                      </tr>
                      <tr>
                        <td className="pb-formula-placeholder">Age Qualifier</td>
                        <td>Who the product is for. Baby.</td>
                        <td className="pb-example-beauty">—</td>
                        <td className="pb-example-baby">For Newborns, 0–24 months, Toddlers</td>
                      </tr>
                      <tr>
                        <td className="pb-formula-placeholder">Skin Qualifier</td>
                        <td>Skin type within the age range. Baby, optional.</td>
                        <td className="pb-example-beauty">—</td>
                        <td className="pb-example-baby">Sensitive Skin, Delicate Skin</td>
                      </tr>
                      <tr>
                        <td className="pb-formula-placeholder">Size</td>
                        <td>Pack size, weight, or count.</td>
                        <td className="pb-example-beauty">100ml, 50g, Pack of 2</td>
                        <td className="pb-example-baby">200ml, 400ml, 72 wipes</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
