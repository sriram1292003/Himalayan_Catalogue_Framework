import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { CATALOG_DATA } from '@/lib/data';
import {
  ChevronRight,
  ArrowRight,
  HelpCircle,
  Search,
  Table,
  LayoutGrid,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Star,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  BookOpen,
  X
} from 'lucide-react';

// Parsers defined outside component to run identically on Server and Client
const getInitialMatrix = () => {
  const matrixRaw = CATALOG_DATA["L1 Priority Matrix"] || [];
  if (matrixRaw.length > 3) {
    const headers = matrixRaw[3].filter(h => h !== "");
    const rows = [];
    for (let i = 4; i < matrixRaw.length; i++) {
      const row = matrixRaw[i];
      if (!row[0] || row[0].trim() === "") continue;
      rows.push({
        attribute: row[0].trim(),
        Amazon: row[1] || "",
        Flipkart: row[2] || "",
        Meesho: row[3] || "",
        Nykaa: row[4] || "",
        Myntra: row[5] || "",
        Blinkit: row[6] || "",
        Zepto: row[7] || "",
        Instamart: row[8] || "",
        FirstCry: row[9] || "",
        Why: row[10] || ""
      });
    }
    return { headers, rows };
  }
  return { headers: [], rows: [] };
};

const getInitialParsedPlaybooks = () => {
  const parsed = {};
  const sheets = ['Amazon', 'Flipkart', 'Quick Commerce (2)', 'Nykaa (2)', 'Myntra (2)', 'FirstCry (2)'];
  sheets.forEach(sheetName => {
    const rawRows = CATALOG_DATA[sheetName];
    if (!rawRows || rawRows.length === 0) return;
    let headerIdx = -1;
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (row.includes("Field") || row.includes("Attribute")) { headerIdx = i; break; }
    }
    if (headerIdx === -1) return;
    const rawHeaders = rawRows[headerIdx];
    const dataRows = [];
    for (let i = headerIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      const nonAmp = row.filter(cell => cell && cell.trim() !== "");
      if (nonAmp.length === 0) continue;
      if (nonAmp.length === 1 && nonAmp[0].trim() === nonAmp[0].trim().toUpperCase()) continue;
      const rowObj = {};
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
      } else {
        if (sheetName.includes("Nykaa")) category = "Beauty";
        if (sheetName.includes("FirstCry")) category = "Baby";
      }
      rowObj._category = category;
      dataRows.push(rowObj);
    }
    parsed[sheetName] = dataRows;
  });
  return parsed;
};

export default function MatrixView({ onRedirect }) {
  const [matrix] = useState(() => getInitialMatrix());
  const [selectedAttribute, setSelectedAttribute] = useState('Title');
  const [viewMode, setViewMode] = useState('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState('all');
  const [expandedChannel, setExpandedChannel] = useState(null);
  const [parsedPlaybooks] = useState(() => getInitialParsedPlaybooks());
  const [tooltipRow, setTooltipRow] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipReady, setTooltipReady] = useState(false);
  const tooltipRef = useRef(null);
  const tooltipAnchorRef = useRef(null);

  // Priority chip hover tooltip (separate from Why tooltip)
  const [priorityTip, setPriorityTip] = useState(null); // { label, desc, bg, color }
  const [priorityTipPos, setPriorityTipPos] = useState({ x: 0, y: 0 });
  const [priorityTipReady, setPriorityTipReady] = useState(false);
  const priorityTipRef = useRef(null);
  const priorityTipAnchorRef = useRef(null);

  const channelKeys = [
    { label: 'Amazon', key: 'Amazon' },
    { label: 'Flipkart', key: 'Flipkart' },
    { label: 'Meesho', key: 'Meesho' },
    { label: 'Nykaa', key: 'Nykaa' },
    { label: 'Myntra', key: 'Myntra' },
    { label: 'Blinkit', key: 'Blinkit' },
    { label: 'Zepto', key: 'Zepto' },
    { label: 'Instamart', key: 'Instamart' },
    { label: 'FirstCry', key: 'FirstCry' }
  ];

  const platformToTab = {
    'Amazon': 'Amazon',
    'Flipkart': 'Flipkart',
    'Nykaa': 'Nykaa (2)',
    'Myntra': 'Myntra (2)',
    'FirstCry': 'FirstCry (2)',
    'Blinkit': 'Quick Commerce (2)',
    'Zepto': 'Quick Commerce (2)',
    'Instamart': 'Quick Commerce (2)'
  };

  useEffect(() => { setExpandedChannel(null); }, [selectedAttribute]);

  // Close tooltip on outside click or Escape key
  useEffect(() => {
    const handler = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setTooltipRow(null);
        setTooltipReady(false);
      }
    };
    const keyHandler = (e) => {
      if (e.key === 'Escape') { setTooltipRow(null); setTooltipReady(false); }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, []);

  // After tooltip mounts, measure it and clamp within viewport
  useLayoutEffect(() => {
    if (!tooltipRow || !tooltipRef.current || !tooltipAnchorRef.current) return;
    setTooltipReady(false);

    const anchor = tooltipAnchorRef.current; // {top, left, width, height} from getBoundingClientRect
    const tip = tooltipRef.current;
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    const MARGIN = 10; // px gap from viewport edges
    const GAP = 12;    // px gap between icon and tooltip

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Preferred: right of the icon
    let left = anchor.left + anchor.width + GAP;
    let top  = anchor.top  - tipH / 2 + anchor.height / 2;

    // Flip left if it overflows the right edge
    if (left + tipW + MARGIN > vw) {
      left = anchor.left - tipW - GAP;
    }
    // If it still overflows left, pin to MARGIN
    if (left < MARGIN) left = MARGIN;

    // Clamp vertically
    if (top + tipH + MARGIN > vh) top = vh - tipH - MARGIN;
    if (top < MARGIN) top = MARGIN;

    // Convert to page coordinates (add scroll)
    setTooltipPos({ x: left + window.scrollX, y: top + window.scrollY });
    setTooltipReady(true);
  }, [tooltipRow]);

  // Viewport-clamp the priority chip tooltip
  useLayoutEffect(() => {
    if (!priorityTip || !priorityTipRef.current || !priorityTipAnchorRef.current) return;
    setPriorityTipReady(false);
    const anchor = priorityTipAnchorRef.current;
    const tip = priorityTipRef.current;
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    const MARGIN = 10;
    const GAP = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Prefer: centered below the chip
    let left = anchor.left + anchor.width / 2 - tipW / 2;
    let top  = anchor.bottom + GAP;
    // Flip above if overflows bottom
    if (top + tipH + MARGIN > vh) top = anchor.top - tipH - GAP;
    // Clamp horizontal
    if (left + tipW + MARGIN > vw) left = vw - tipW - MARGIN;
    if (left < MARGIN) left = MARGIN;
    // Clamp top
    if (top < MARGIN) top = MARGIN;
    setPriorityTipPos({ x: left + window.scrollX, y: top + window.scrollY });
    setPriorityTipReady(true);
  }, [priorityTip]);

  const handleChannelClick = (channelKey, pVal) => {
    if (!pVal || pVal === 'NA') return;
    setExpandedChannel(prev => prev === channelKey ? null : channelKey);
  };

  const handleInfoHover = (row, e) => {
    if (!row.Why) return;
    // Store the anchor rect for layout effect
    tooltipAnchorRef.current = e.currentTarget.getBoundingClientRect();
    setTooltipReady(false);
    setTooltipRow(row);
  };

  const matchField = (attribute, fieldName) => {
    if (!fieldName) return false;
    const a = attribute.toLowerCase();
    const f = fieldName.toLowerCase();
    if (a.includes('title')) return f === 'title' || f === 'product name' || f === 'title (composed)' || f === 'model name';
    if (a.includes('imagery') || a.includes('image')) return f.includes('image') || f === 'gallery' || f.includes('gallery (slots');
    if (a.includes('backend') || a.includes('keyword')) return f.includes('backend search') || f.includes('search keyword') || f === 'keywords';
    if (a.includes('bullet') || a.includes('highlights')) return f.includes('bullet') || f === 'highlights' || f === 'key features';
    if (a.includes('a+ content') || a.includes('rich content')) return f.includes('a+') || f === 'showcase' || f.includes('showcase / rich') || f.includes('showcase');
    if (a.includes('description')) return f.includes('description') || f === 'product description';
    if (a.includes('video')) return f === 'video';
    return false;
  };

  const getPlaybookRules = (attribute, platformKey) => {
    const tabName = platformToTab[platformKey];
    if (!tabName || !parsedPlaybooks[tabName]) return [];
    return parsedPlaybooks[tabName].filter(row => {
      const fName = row['Field'] || row['Attribute'] || '';
      return matchField(attribute, fName);
    });
  };

  // Excel-accurate priority color + description getter
  const getPriorityCell = (pVal) => {
    if (pVal === 'P0') return {
      bg: '#c6efce', color: '#276221', label: 'P0',
      desc: 'Ranking-critical AND user-visible. Always optimised first.'
    };
    if (pVal === 'P1') return {
      bg: '#ffeb9c', color: '#9c6500', label: 'P1',
      desc: 'Either ranking-relevant OR user-visible / conversion-driving. Optimise after P0 is solid.'
    };
    if (pVal === 'P2') return {
      bg: '#ffc7ce', color: '#9c0006', label: 'P2',
      desc: 'Neither ranking-relevant nor pre-click visible, but supports on-page conversion. Optimise once P0 and P1 are clean.'
    };
    if (pVal === 'NA') return {
      bg: '#f2f2f2', color: '#888', label: 'NA',
      desc: 'Field not available, or not brand-controlled, on this platform.'
    };
    return null;
  };

  const handleChipHover = (style, e) => {
    if (!style) return;
    priorityTipAnchorRef.current = e.currentTarget.getBoundingClientRect();
    setPriorityTipReady(false);
    setPriorityTip(style);
  };
  const handleChipLeave = () => setPriorityTip(null);

  const getChannelIcon = (key) => {
    switch (key) {
      case 'Amazon': return <i className="fa-brands fa-amazon"></i>;
      case 'Flipkart': return <i className="fa-solid fa-cart-shopping"></i>;
      case 'Meesho': return <i className="fa-solid fa-bag-shopping"></i>;
      case 'Nykaa': return <i className="fa-solid fa-heart"></i>;
      case 'Myntra': return <i className="fa-solid fa-shirt"></i>;
      case 'Blinkit': return <i className="fa-solid fa-bolt"></i>;
      case 'Zepto': return <i className="fa-solid fa-stopwatch"></i>;
      case 'Instamart': return <i className="fa-solid fa-apple-whole"></i>;
      case 'FirstCry': return <i className="fa-solid fa-baby"></i>;
      default: return <i className="fa-solid fa-store"></i>;
    }
  };

  // KPI calculations
  let totalP0 = 0, totalP1 = 0, totalP2 = 0;
  matrix.rows.forEach(row => {
    channelKeys.forEach(ch => {
      const pVal = row[ch.key];
      if (pVal === 'P0') totalP0++;
      else if (pVal === 'P1') totalP1++;
      else if (pVal === 'P2') totalP2++;
    });
  });

  const filteredRows = matrix.rows.filter(row => {
    const matchesSearch = row.attribute.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = selectedPlatformFilter === 'all' || (row[selectedPlatformFilter] && row[selectedPlatformFilter] !== 'NA');
    return matchesSearch && matchesPlatform;
  });

  const activeRow = matrix.rows.find(r => r.attribute === selectedAttribute) || matrix.rows[0];

  return (
    <div className="view-section">
      {/* Why Tooltip — smart viewport-aware positioning */}
      {tooltipRow && (
        <div
          ref={tooltipRef}
          className="why-tooltip-popup"
          style={{
            top: tooltipPos.y,
            left: tooltipPos.x,
            visibility: tooltipReady ? 'visible' : 'hidden',
            opacity: tooltipReady ? 1 : 0,
          }}
        >
          <div className="why-tooltip-header">
            <HelpCircle style={{ width: 14, height: 14 }} />
            <span>Why This Priority?</span>
            <button
              className="why-tooltip-close"
              onClick={() => { setTooltipRow(null); setTooltipReady(false); }}
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          </div>
          <p className="why-tooltip-body">{tooltipRow.Why}</p>
          <div className="why-tooltip-attr">{tooltipRow.attribute}</div>
        </div>
      )}

      {/* Priority Chip Tooltip (P0 / P1 / P2 / NA hover) */}
      {priorityTip && (
        <div
          ref={priorityTipRef}
          className="pchip-tooltip"
          style={{
            top: priorityTipPos.y,
            left: priorityTipPos.x,
            visibility: priorityTipReady ? 'visible' : 'hidden',
            opacity: priorityTipReady ? 1 : 0,
            '--tip-accent': priorityTip.bg,
            '--tip-text': priorityTip.color,
          }}
        >
          <div className="pchip-tip-badge" style={{ background: priorityTip.bg, color: priorityTip.color }}>
            {priorityTip.label}
          </div>
          <p className="pchip-tip-desc">{priorityTip.desc}</p>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="matrix-page-header">
        <div className="matrix-header-left">
          <h1 className="matrix-title">L1 Attribute Priority Matrix</h1>
          <p className="matrix-subtitle">Strategic channel checklist mapping content guidelines by optimization priorities.</p>
        </div>
        <div className="view-mode-toggle">
          <button
            className={`btn-toggle ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Table View"
          >
            <Table style={{ width: 15, height: 15, marginRight: 6 }} />
            Table
          </button>
          <button
            className={`btn-toggle ${viewMode === 'inspector' ? 'active' : ''}`}
            onClick={() => setViewMode('inspector')}
            title="Card Inspector View"
          >
            <LayoutGrid style={{ width: 15, height: 15, marginRight: 6 }} />
            Cards
          </button>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div className="matrix-kpi-strip">
        <div className="mkpi-item">
          <span className="mkpi-num">{matrix.rows.length}</span>
          <span className="mkpi-label">Attributes</span>
        </div>
        <div className="mkpi-divider" />
        <div className="mkpi-item">
          <span className="mkpi-dot" style={{ background: '#276221' }} />
          <span className="mkpi-num" style={{ color: '#276221' }}>{totalP0}</span>
          <span className="mkpi-label">P0 Critical</span>
        </div>
        <div className="mkpi-divider" />
        <div className="mkpi-item">
          <span className="mkpi-dot" style={{ background: '#9c6500' }} />
          <span className="mkpi-num" style={{ color: '#9c6500' }}>{totalP1}</span>
          <span className="mkpi-label">P1 High</span>
        </div>
        <div className="mkpi-divider" />
        <div className="mkpi-item">
          <span className="mkpi-dot" style={{ background: '#9c0006' }} />
          <span className="mkpi-num" style={{ color: '#9c0006' }}>{totalP2}</span>
          <span className="mkpi-label">P2 Support</span>
        </div>
      </div>

      {/* ── CONTROLS ROW ── */}
      <div className="matrix-controls-bar">
        <div className="matrix-search-box">
          <Search className="matrix-search-icon" style={{ width: 16, height: 16 }} />
          <input
            type="text"
            className="matrix-search-input"
            placeholder="Search attributes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="matrix-search-clear" onClick={() => setSearchQuery('')}>
              <X style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>

        <div className="matrix-platform-filter">
          <span className="mpf-label">Channel</span>
          <select
            className="mpf-select"
            value={selectedPlatformFilter}
            onChange={(e) => setSelectedPlatformFilter(e.target.value)}
          >
            <option value="all">All 9 Channels</option>
            {channelKeys.map(ch => (
              <option key={ch.key} value={ch.key}>{ch.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          TABLE VIEW (Default)
      ══════════════════════════════════════════════ */}
      {viewMode === 'table' ? (
        <div className="matrix-table-card">
          {/* ── Legend strip ── */}
          <div className="plegend-strip">
            <span className="plegend-label">PRIORITY SCALE</span>
            <div className="plegend-pills">
              {[
                { label: 'P0', bg: '#c6efce', color: '#276221' },
                { label: 'P1', bg: '#ffeb9c', color: '#9c6500' },
                { label: 'P2', bg: '#ffc7ce', color: '#9c0006' },
                { label: 'NA', bg: '#f2f2f2', color: '#999'    },
              ].map(p => (
                <span
                  key={p.label}
                  className="plegend-pill-badge"
                  style={{ background: p.bg, color: p.color }}
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>

          <div className="matrix-scroll-wrap">
            <table className="mxt">
              <thead>
                <tr>
                  <th className="mxt-th mxt-attr-th">Attribute</th>
                  {channelKeys.map(ch => (
                    <th key={ch.key} className="mxt-th mxt-ch-th">{ch.label}</th>
                  ))}
                  <th className="mxt-th mxt-why-th">
                    <Info style={{ width: 13, height: 13, marginRight: 4 }} />
                    Why?
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={channelKeys.length + 2} className="mxt-empty">
                      <AlertCircle style={{ width: 22, height: 22, marginBottom: 6 }} />
                      <p>No attributes match your search.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={index} className={`mxt-row ${index % 2 === 0 ? 'mxt-even' : 'mxt-odd'}`}>
                      {/* Attribute sticky column */}
                      <td className="mxt-td mxt-attr-td">
                        <span className="mxt-attr-name">{row.attribute}</span>
                      </td>

                      {/* Priority cells */}
                      {channelKeys.map(ch => {
                        const pVal = row[ch.key] || '';
                        const style = getPriorityCell(pVal);
                        return (
                          <td
                            key={ch.key}
                            className="mxt-td mxt-p-td"
                            style={style ? { background: style.bg } : {}}
                            data-label={ch.label}
                          >
                            {style ? (
                              <span
                                className="mxt-p-chip"
                                style={{ color: style.color, fontWeight: 700 }}
                                onClick={() => onRedirect(ch.label, row.attribute)}
                                onMouseEnter={(e) => handleChipHover(style, e)}
                                onMouseLeave={handleChipLeave}
                                aria-label={`${style.label}: ${style.desc}`}
                              >
                                {style.label}
                              </span>
                            ) : (
                              <span className="mxt-empty-cell">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Why column — info icon + hover tooltip */}
                      <td className="mxt-td mxt-why-td">
                        {row.Why ? (
                          <button
                            className="mxt-info-btn"
                            onMouseEnter={(e) => handleInfoHover(row, e)}
                            onMouseLeave={() => setTooltipRow(null)}
                            onClick={(e) => handleInfoHover(row, e)}
                            aria-label={`Why ${row.attribute} has this priority`}
                          >
                            <Info style={{ width: 15, height: 15 }} />
                          </button>
                        ) : (
                          <span className="mxt-empty-cell">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      ) : (
        /* ══════════════════════════════════════════════
            INSPECTOR / CARD VIEW
        ══════════════════════════════════════════════ */
        <div className="matrix-workspace">
          {/* Left Attributes Sidebar */}
          <div className="matrix-attribute-list">
            <div className="list-title">
              <span>Catalog Attributes</span>
              <span className="badge-count">{filteredRows.length}</span>
            </div>
            {filteredRows.length === 0 ? (
              <div className="empty-search-state">
                <AlertCircle style={{ width: '32px', height: '32px', margin: '0 auto 10px', color: 'var(--text-light)' }} />
                <p>No attributes found.</p>
              </div>
            ) : (
              <div className="attribute-cards-wrapper">
                {filteredRows.map((row, idx) => {
                  let p0Count = 0, p1Count = 0, p2Count = 0, activeCount = 0;
                  channelKeys.forEach(ch => {
                    const pVal = row[ch.key];
                    if (pVal === 'P0') p0Count++;
                    else if (pVal === 'P1') p1Count++;
                    else if (pVal === 'P2') p2Count++;
                    if (pVal && pVal !== 'NA') activeCount++;
                  });
                  const isSelected = selectedAttribute === row.attribute;
                  return (
                    <div
                      key={idx}
                      className={`attribute-item-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedAttribute(row.attribute)}
                    >
                      <div className="attribute-item-header">
                        <h4>{row.attribute}</h4>
                        <ChevronRight className="arrow-icon" />
                      </div>
                      <div className="attribute-item-meta">
                        <span className="channel-coverage">{activeCount} / 9 platforms</span>
                      </div>
                      <div className="attribute-item-stats">
                        {p0Count > 0 && <span className="stat-badge p0">{p0Count} P0</span>}
                        {p1Count > 0 && <span className="stat-badge p1">{p1Count} P1</span>}
                        {p2Count > 0 && <span className="stat-badge p2">{p2Count} P2</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Inspector Panel */}
          {activeRow ? (
            <div className="matrix-details-inspector animate-fadeIn" key={activeRow.attribute}>
              <div className="inspector-header-card">
                <div className="inspector-title-row">
                  <span className="inspector-badge-label"><Sparkles style={{ width: '12px', height: '12px', display: 'inline', marginRight: '4px' }} /> Matrix Focus</span>
                  <h2>{activeRow.attribute}</h2>
                </div>
                {activeRow.Why && (
                  <div className="why-box">
                    <div className="why-title">
                      <HelpCircle style={{ width: '16px', height: '16px' }} />
                      <span>Why This Priority Strategy?</span>
                    </div>
                    <p>{activeRow.Why}</p>
                  </div>
                )}
              </div>

              <div className="inspector-channels-header">
                <h3>Channel Action Map</h3>
                <p>Click on any prioritized channel to view live playbook rules inline.</p>
              </div>

              <div className="inspector-channels-grid">
                {channelKeys.map(ch => {
                  const pVal = activeRow[ch.key] || '';
                  const lowerPVal = pVal ? pVal.toLowerCase() : 'na';
                  const isExpanded = expandedChannel === ch.key;
                  const rules = getPlaybookRules(activeRow.attribute, ch.key);
                  return (
                    <div key={ch.key} className={`inspector-channel-wrapper ${isExpanded ? 'expanded-mode' : ''}`}>
                      <div
                        className={`inspector-channel-card card-${lowerPVal} ${pVal ? 'clickable' : ''} ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => pVal && handleChannelClick(ch.key, pVal)}
                      >
                        <div className="channel-card-top">
                          <span className="channel-icon-bg">{getChannelIcon(ch.key)}</span>
                          <span className="channel-name">{ch.label}</span>
                        </div>
                        <div className="channel-card-value">
                          {pVal ? (
                            <span className={`priority-pill badge-${lowerPVal}`}>{pVal}</span>
                          ) : (
                            <span className="priority-pill badge-na">N/A</span>
                          )}
                        </div>
                        <div className="channel-card-footer">
                          {pVal ? (
                            <span className="action-hint">
                              {isExpanded
                                ? <><>Collapse Specs </><ChevronUp style={{ width: '12px', height: '12px', marginLeft: '4px' }} /></>
                                : <><>View Playbook Specs </><ChevronDown style={{ width: '12px', height: '12px', marginLeft: '4px' }} /></>
                              }
                            </span>
                          ) : (
                            <span className="action-hint na">Not Controlled</span>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="expanded-specs-panel animate-slideDown">
                          {ch.key === 'Meesho' ? (
                            <div className="meesho-fallback-box">
                              <Info style={{ width: '20px', height: '20px', color: 'var(--accent-gold)' }} />
                              <div>
                                <h4>Meesho Optimization Model</h4>
                                <p>Meesho does not enforce structured character counts or formula layouts. Ranking is optimized automatically via sales volume, customer reviews, and clear pack imagery.</p>
                              </div>
                            </div>
                          ) : rules.length === 0 ? (
                            <div className="no-rules-found-box">
                              <AlertCircle style={{ width: '18px', height: '18px', color: 'var(--text-light)' }} />
                              <p>No specific formatting matches for this field. Platform defaults apply.</p>
                            </div>
                          ) : (
                            <div className="rules-extract-list">
                              {rules.map((rule, ruleIdx) => (
                                <div key={ruleIdx} className={`rule-extract-block category-${rule._category.toLowerCase()}`}>
                                  <div className="rule-extract-header">
                                    <span className={`category-pill ${rule._category.toLowerCase()}`}>{rule._category} Portfolio</span>
                                    {rule['Field'] && <span className="rule-field-name">{rule['Field']}</span>}
                                  </div>
                                  <div className="rule-extract-grid">
                                    {rule['Target Range'] && (
                                      <div className="extract-cell">
                                        <span className="cell-label">Target Range</span>
                                        <span className="cell-value">{rule['Target Range']}</span>
                                      </div>
                                    )}
                                    {rule['Hard Limit'] && (
                                      <div className="extract-cell">
                                        <span className="cell-label">Hard Limit</span>
                                        <span className="cell-value">{rule['Hard Limit']}</span>
                                      </div>
                                    )}
                                  </div>
                                  {rule['Best-Practice Formula'] && (
                                    <div className="formula-container">
                                      <span className="cell-label">Content Formula Recipe</span>
                                      <code className="formula-code">{rule['Best-Practice Formula']}</code>
                                    </div>
                                  )}
                                  {rule['Example 1'] && (
                                    <div className="examples-container">
                                      <span className="cell-label">Playbook Practice Examples</span>
                                      <div className="example-bubble">
                                        <span className="example-label">Ex 1:</span>
                                        <span className="example-content">{rule['Example 1']}</span>
                                      </div>
                                      {rule['Example 2'] && (
                                        <div className="example-bubble">
                                          <span className="example-label">Ex 2:</span>
                                          <span className="example-content">{rule['Example 2']}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {rule['Notes'] && (
                                    <div className="notes-container">
                                      <span className="cell-label">Compliance Notes</span>
                                      <p className="notes-para">{rule['Notes']}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="specs-panel-actions">
                            <button
                              className="btn btn-primary compact-btn"
                              onClick={() => onRedirect(ch.label, activeRow.attribute)}
                            >
                              <BookOpen style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                              Open in Playbook Explorer
                              <ArrowRight style={{ width: '14px', height: '14px', marginLeft: '6px' }} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="matrix-details-inspector empty-state">
              <p>Select an attribute on the left to inspect channel priorities.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
