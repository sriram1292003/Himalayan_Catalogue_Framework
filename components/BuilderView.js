'use client';
import { useState, useEffect, useRef } from 'react';
import { CATALOG_DATA } from '@/lib/data';
import {
  Sparkles,
  Smartphone,
  Monitor,
  Sliders,
  Heading,
  AlignLeft,
  Copy,
  CheckCircle,
  FolderOpen,
  Zap,
  Star,
  BarChart2,
  Info,
  ChevronRight,
  Search,
  ShoppingCart,
  Package,
  Lightbulb,
  Target,
  Award,
  Beaker,
  Flame,
  Tag
} from 'lucide-react';

// ─── helpers ───────────────────────────────────────────────
const detectSize = (skuName) => {
  const regex = /\b\d+\s*(?:ml|g|ML|G|oz|wipes|s|S|N|kg|KG)\b|\b\d+'s\b/i;
  const m = skuName ? skuName.match(regex) : null;
  return m ? m[0] : '';
};

const cleanQuotes = (str) => {
  if (!str) return '';
  return str.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
};

const parseHardLimit = (s) => {
  if (!s) return null;
  const n = s.replace(/,/g, '').match(/\d+/);
  return n ? parseInt(n[0], 10) : null;
};

const parseTargetRange = (s) => {
  if (!s || s.toLowerCase() === 'none') return null;
  const mm = s.replace(/,/g, '').match(/(\d+)\s*[-–]\s*(\d+)/);
  if (mm) return { min: parseInt(mm[1]), max: parseInt(mm[2]) };
  const pm = s.replace(/,/g, '').match(/(\d+)\s*\+/);
  if (pm) return { min: parseInt(pm[1]), max: 9999 };
  return null;
};

const counterClass = (len, limitStr, rangeStr) => {
  const hard = parseHardLimit(limitStr);
  const range = parseTargetRange(rangeStr);
  if (hard && len > hard) return 'bld-counter exceeded';
  if (range && (len < range.min || len > range.max)) return 'bld-counter warning';
  if (len > 0) return 'bld-counter good';
  return 'bld-counter empty';
};

const getPlaybookData = (sheetName) => {
  const rawRows = CATALOG_DATA[sheetName] || [];
  let headerIdx = -1;
  for (let i = 0; i < rawRows.length; i++) {
    if (rawRows[i].includes('Field') || rawRows[i].includes('Attribute')) { headerIdx = i; break; }
  }
  if (headerIdx === -1) return { rows: [] };
  const rawHeaders = rawRows[headerIdx];
  const dataRows = [];
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const nonEmpty = row.filter(c => c && c.trim() !== '');
    if (nonEmpty.length === 0) continue;
    if (nonEmpty.length === 1 && nonEmpty[0].trim() === nonEmpty[0].trim().toUpperCase()) {
      dataRows.push({ isSection: true, title: nonEmpty[0].trim() }); continue;
    }
    const obj = { isSection: false };
    for (let j = 0; j < rawHeaders.length; j++) {
      const h = rawHeaders[j];
      if (h && h.trim()) obj[h.trim()] = row[j] != null ? String(row[j]).trim() : '';
    }
    dataRows.push(obj);
  }
  return { rows: dataRows };
};

// Quality score calculator
const calcQualityScore = (title, description, bullets) => {
  let score = 0;
  const t = title.trim();
  const d = description.trim();
  const b = bullets.trim();

  // Title scoring (50 pts)
  if (t.length >= 60) score += 15;
  else if (t.length >= 30) score += 8;
  if (t.length >= 80 && t.length <= 200) score += 20;
  else if (t.length > 0 && t.length < 200) score += 10;
  if (/\d+(ml|g|oz|kg)/i.test(t)) score += 8;  // has size
  if (t.split(' ').length >= 6) score += 7;

  // Description scoring (25 pts)
  if (d.length >= 100) score += 10;
  if (d.length >= 200) score += 10;
  if (d.length >= 400) score += 5;

  // Bullets scoring (25 pts)
  const bulletLines = b.split('\n').filter(l => l.trim() !== '');
  if (bulletLines.length >= 3) score += 10;
  if (bulletLines.length >= 5) score += 10;
  if (b.length >= 100) score += 5;

  return Math.min(score, 100);
};

const getScoreLabel = (score) => {
  if (score >= 85) return { label: 'Excellent', color: '#16a34a', bg: '#dcfce7' };
  if (score >= 65) return { label: 'Good', color: '#ca8a04', bg: '#fef9c3' };
  if (score >= 40) return { label: 'Fair', color: '#ea580c', bg: '#ffedd5' };
  return { label: 'Needs Work', color: '#dc2626', bg: '#fee2e2' };
};

// ─── Component ─────────────────────────────────────────────
export default function BuilderView({ presetPlatform, presetSkuId, clearPresetSku }) {
  const [platform, setPlatform] = useState(presetPlatform || 'Amazon');
  const [skuId, setSkuId] = useState(presetSkuId || '');
  const [skus, setSkus] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('Beauty');

  // Title builder — free text + ingredient inputs
  const [titleText, setTitleText] = useState('');
  const [ingredients, setIngredients] = useState({
    brand: 'Himalaya',
    heroPromise: '',
    productType: '',
    heroIngredient: '',
    skinConcern: '',
    size: '',
    qualifier: '',
    claim: '',
  });

  // Other content fields
  const [description, setDescription] = useState('');
  const [bulletText, setBulletText] = useState('');
  const [ingredientList, setIngredientList] = useState('');

  // Specs from playbook
  const [titleSpecs, setTitleSpecs] = useState({ limit: '200 chars max', target: '80–120 chars', notes: '' });
  const [otherSpecs, setOtherSpecs] = useState([]);

  // UI state
  const [previewTab, setPreviewTab] = useState('mobile');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [copiedKey, setCopiedKey] = useState(null);

  const platforms = Object.keys(CATALOG_DATA).filter(k =>
    k !== 'SKU' && k !== 'Index' && k !== 'L1 Priority Matrix'
  );

  // Load SKUs once
  useEffect(() => {
    const skuRaw = CATALOG_DATA['SKU'] || [];
    const parsed = [];
    if (skuRaw.length > 2) {
      for (let i = 2; i < skuRaw.length; i++) {
        const row = skuRaw[i];
        if (row[0] && row[0].trim() && row[0] !== 'SKU Name') {
          parsed.push({ id: `beauty-${i}`, portfolio: 'Beauty', name: row[0].trim(), category: row[1]?.trim() || '', owner: row[2]?.trim() || '' });
        }
        if (row[7] && row[7].trim() && row[7] !== 'SKU Name') {
          parsed.push({ id: `baby-${i}`, portfolio: 'Baby', name: row[7].trim(), category: row[8]?.trim() || '', owner: row[9]?.trim() || 'Ponnappa' });
        }
      }
    }
    setSkus(parsed);
    
    if (parsed.length > 0) {
      let initialSku = parsed[0];
      if (presetSkuId) {
        const found = parsed.find(s => s.id === presetSkuId);
        if (found) initialSku = found;
      }
      setSkuId(initialSku.id);
      setCategoryFilter(initialSku.portfolio);
    }
  }, []);

  // Sync external presets
  useEffect(() => {
    if (presetPlatform) setPlatform(presetPlatform);
    if (presetSkuId && skus.length > 0) {
      const found = skus.find(s => s.id === presetSkuId);
      if (found) {
        setSkuId(presetSkuId);
        setCategoryFilter(found.portfolio);
      }
    }
  }, [presetPlatform, presetSkuId, skus]);

  const handleCategoryFilterChange = (cat) => {
    setCategoryFilter(cat);
    const filtered = skus.filter(s => s.portfolio === cat);
    if (filtered.length > 0) {
      setSkuId(filtered[0].id);
    }
  };

  // When SKU changes → update ingredients defaults
  useEffect(() => {
    if (!skuId || skus.length === 0) return;
    const sku = skus.find(s => s.id === skuId);
    if (!sku) return;
    setIngredients(prev => ({
      ...prev,
      brand: 'Himalaya',
      productType: sku.category || '',
      size: detectSize(sku.name),
    }));
  }, [skuId, skus]);

  // When platform changes → load specs
  useEffect(() => {
    const pb = getPlaybookData(platform);
    const titleRule = pb.rows.find(r =>
      !r.isSection && (
        r['Field'] === 'Product Name' || r['Field'] === 'Product Title' ||
        r['Field'] === 'Title' || r['Attribute'] === 'Title' ||
        r['Field']?.toLowerCase().includes('title') || r['Field']?.toLowerCase().includes('name')
      )
    );
    if (titleRule) {
      setTitleSpecs({
        limit: titleRule['Hard Limit'] || '200 chars max',
        target: titleRule['Target Range'] || '80–120 chars',
        notes: titleRule['Notes'] || '',
      });
    }

    const other = pb.rows.filter(r =>
      !r.isSection && (
        r['Field'] === 'Description' || r['Field'] === 'Key Features' ||
        r['Field'] === 'Bullet Points' || r['Field'] === 'Highlights' ||
        r['Field'] === 'Ingredient' || r['Field'] === 'Ingredients' ||
        r['Attribute'] === 'Description' || r['Attribute'] === 'Bullet Points'
      )
    );
    setOtherSpecs(other);

    // Pre-populate examples when switching platform
    other.forEach(field => {
      const fn = (field['Field'] || field['Attribute'] || '').toLowerCase();
      const ex = field['Example 1'] || '';
      if (fn.includes('desc') && !description) setDescription(cleanQuotes(ex));
      if ((fn.includes('feat') || fn.includes('bullet') || fn.includes('highlight')) && !bulletText) setBulletText(cleanQuotes(ex));
      if (fn.includes('ingred') && !ingredientList) setIngredientList(cleanQuotes(ex));
    });
  }, [platform]);

  const skuObj = skus.find(s => s.id === skuId) || { portfolio: '', category: '', owner: '', name: '' };
  const qualityScore = calcQualityScore(titleText, description, bulletText);
  const scoreInfo = getScoreLabel(qualityScore);
  const hardLimit = parseHardLimit(titleSpecs.limit);
  const targetRange = parseTargetRange(titleSpecs.target);

  const handleCopy = (key, value) => {
    if (!value?.trim()) { triggerToast('Field is empty!'); return; }
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      triggerToast('Copied!');
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 2000);
  };

  const insertIngredient = (key, val) => {
    if (!val?.trim()) return;
    const cursor = document.getElementById('title-textarea');
    if (!cursor) { setTitleText(prev => prev + ' ' + val.trim()); return; }
    const start = cursor.selectionStart;
    const end = cursor.selectionEnd;
    const newVal = titleText.slice(0, start) + val.trim() + titleText.slice(end);
    setTitleText(newVal);
    setTimeout(() => {
      cursor.selectionStart = cursor.selectionEnd = start + val.trim().length;
      cursor.focus();
    }, 0);
  };

  const INGREDIENT_FIELDS = [
    { key: 'brand',         label: 'Brand',           icon: <Award style={{ width: 12, height: 12 }} />,      placeholder: 'e.g. Himalaya',        color: '#6366f1' },
    { key: 'heroPromise',   label: 'Hero Promise',     icon: <Flame style={{ width: 12, height: 12 }} />,      placeholder: 'e.g. Purifying',       color: '#ef4444' },
    { key: 'productType',   label: 'Product Type',     icon: <Package style={{ width: 12, height: 12 }} />,    placeholder: 'e.g. Face Wash',       color: '#0ea5e9' },
    { key: 'heroIngredient',label: 'Hero Ingredient',  icon: <Beaker style={{ width: 12, height: 12 }} />,     placeholder: 'e.g. Neem',            color: '#10b981' },
    { key: 'skinConcern',   label: 'Skin / Concern',   icon: <Target style={{ width: 12, height: 12 }} />,     placeholder: 'e.g. Oily Skin',       color: '#f59e0b' },
    { key: 'size',          label: 'Pack Size',         icon: <Tag style={{ width: 12, height: 12 }} />,        placeholder: 'e.g. 400ml',           color: '#8b5cf6' },
    { key: 'qualifier',     label: 'User Qualifier',   icon: <Star style={{ width: 12, height: 12 }} />,       placeholder: 'e.g. For Men & Women', color: '#ec4899' },
    { key: 'claim',         label: 'Free-from / Claim',icon: <CheckCircle style={{ width: 12, height: 12 }} />, placeholder: 'e.g. Paraben-Free',   color: '#14b8a6' },
  ];

  // Bullet lines for PDP
  const bulletLines = bulletText.split('\n').filter(l => l.trim() !== '');

  return (
    <div className="view-section">
      {/* ── Page Header ── */}
      <div className="bld-page-header">
        <div>
          <div className="bld-eyebrow"><Sparkles style={{ width: 13, height: 13 }} /> Title &amp; PDP Builder</div>
          <h1 className="bld-main-title">Interactive Content Builder</h1>
          <p className="bld-main-sub">Craft platform-optimised titles and PDP content with live character feedback and a real-time preview.</p>
        </div>
      </div>

      <div className="bld-workspace">
        {/* ══════════════════════ LEFT COLUMN ══════════════════════ */}
        <div className="bld-left">

          {/* ── Panel 1: Configuration ── */}
          <div className="bld-card">
            <div className="bld-card-header">
              <Sliders style={{ width: 18, height: 18 }} />
              <h2>1. Configuration</h2>
            </div>
            <div className="bld-form-grid2">
              <div className="bld-form-group">
                <label>Target Channel</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)}>
                  {platforms.map(p => <option key={p} value={p}>{p.replace(' (2)', '')}</option>)}
                </select>
              </div>
              <div className="bld-form-group">
                <label>Category</label>
                <select value={categoryFilter} onChange={e => handleCategoryFilterChange(e.target.value)}>
                  <option value="Beauty">Beauty</option>
                  <option value="Baby">Baby</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Panel 2: Title Builder ── */}
          <div className="bld-card">
            <div className="bld-card-header">
              <Heading style={{ width: 18, height: 18 }} />
              <h2>2. Title Builder</h2>
            </div>

            {/* Spec bar */}
            <div className="bld-spec-bar">
              <div className="bld-spec-item">
                <span className="bld-spec-dot red" />
                <span className="bld-spec-label">Hard Limit:</span>
                <span className="bld-spec-val">{titleSpecs.limit}</span>
              </div>
              <div className="bld-spec-sep" />
              <div className="bld-spec-item">
                <span className="bld-spec-dot green" />
                <span className="bld-spec-label">Target Range:</span>
                <span className="bld-spec-val">{titleSpecs.target}</span>
              </div>
            </div>

            {/* Title textarea */}
            <div className="bld-title-area">
              <div className="bld-title-label-row">
                <label className="bld-label">Your Title</label>
                <span className={counterClass(titleText.length, titleSpecs.limit, titleSpecs.target)}>
                  {titleText.length} / {hardLimit || 200} chars
                  {targetRange && titleText.length >= targetRange.min && titleText.length <= targetRange.max
                    ? ' ✓ In range' : ''}
                </span>
              </div>
              {/* Visual char bar */}
              <div className="bld-char-bar">
                <div
                  className={`bld-char-fill ${
                    hardLimit && titleText.length > hardLimit ? 'over' :
                    targetRange && titleText.length >= targetRange.min && titleText.length <= targetRange.max ? 'good' : 'warn'
                  }`}
                  style={{ width: `${Math.min((titleText.length / (hardLimit || 200)) * 100, 100)}%` }}
                />
                {targetRange && (
                  <>
                    <div className="bld-char-marker" style={{ left: `${(targetRange.min / (hardLimit || 200)) * 100}%` }} title={`Target start: ${targetRange.min}`} />
                    <div className="bld-char-marker" style={{ left: `${Math.min((targetRange.max / (hardLimit || 200)) * 100, 100)}%` }} title={`Target end: ${targetRange.max}`} />
                  </>
                )}
              </div>
              <textarea
                id="title-textarea"
                className="bld-title-textarea"
                value={titleText}
                onChange={e => setTitleText(e.target.value)}
                placeholder="Write your product title here… use the ingredient blocks below to craft and insert key components."
                rows={3}
              />
              {titleSpecs.notes && (
                <div className="bld-note-tip">
                  <Info style={{ width: 12, height: 12 }} />
                  <span>{titleSpecs.notes}</span>
                </div>
              )}
            </div>

            {/* Ingredient blocks */}
            <div className="bld-ing-header">
              <Lightbulb style={{ width: 14, height: 14, color: '#c39a3c' }} />
              <span>Build blocks — click <strong>Insert ↑</strong> to add any piece to your title at cursor position</span>
            </div>
            <div className="bld-ing-grid">
              {INGREDIENT_FIELDS.map(f => (
                <div key={f.key} className="bld-ing-block" style={{ '--ing-color': f.color }}>
                  <div className="bld-ing-block-label">
                    <span className="bld-ing-icon" style={{ color: f.color }}>{f.icon}</span>
                    <span>{f.label}</span>
                  </div>
                  <div className="bld-ing-input-row">
                    <input
                      type="text"
                      value={ingredients[f.key]}
                      placeholder={f.placeholder}
                      onChange={e => setIngredients(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="bld-ing-input"
                    />
                    <button
                      className="bld-ing-insert-btn"
                      title={`Insert "${f.label}" into title`}
                      onClick={() => insertIngredient(f.key, ingredients[f.key])}
                      style={{ '--btn-c': f.color }}
                    >
                      Insert ↑
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick copy title */}
            <button className="bld-copy-title-btn" onClick={() => handleCopy('title', titleText)}>
              {copiedKey === 'title' ? <CheckCircle style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
              {copiedKey === 'title' ? 'Copied!' : 'Copy Title'}
            </button>
          </div>

          {/* ── Panel 3: PDP Content ── */}
          <div className="bld-card">
            <div className="bld-card-header">
              <AlignLeft style={{ width: 18, height: 18 }} />
              <h2>3. Product Page Content</h2>
            </div>

            {otherSpecs.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Select a platform above to load PDP field specs.</p>
            )}

            {otherSpecs.map((field, idx) => {
              const fn = field['Field'] || field['Attribute'] || '';
              const isDesc = fn.toLowerCase().includes('desc');
              const isBullet = fn.toLowerCase().includes('feat') || fn.toLowerCase().includes('bullet') || fn.toLowerCase().includes('highlight');
              const isIngred = fn.toLowerCase().includes('ingred');
              const stateVal = isDesc ? description : isBullet ? bulletText : isIngred ? ingredientList : '';
              const setFn = isDesc ? setDescription : isBullet ? setBulletText : isIngred ? setIngredientList : null;
              if (!setFn) return null;

              const copyKey = isDesc ? 'desc' : isBullet ? 'bullets' : 'ingred';
              const limit = field['Hard Limit'] || 'None';
              const target = field['Target Range'] || 'None';

              return (
                <div key={idx} className="bld-field-block">
                  <div className="bld-field-block-header">
                    <div>
                      <div className="bld-label">{fn}</div>
                      <div className="bld-field-specs">
                        <span className="bld-spec-chip red">Limit: {limit}</span>
                        <span className="bld-spec-chip green">Target: {target}</span>
                        <span className={counterClass(stateVal.length, limit, target)} style={{ marginLeft: 'auto' }}>
                          {stateVal.length} chars
                        </span>
                      </div>
                    </div>
                    <button className="bld-copy-sm" onClick={() => handleCopy(copyKey, stateVal)}>
                      {copiedKey === copyKey ? <CheckCircle style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                    </button>
                  </div>
                  {/* Visual bar */}
                  <div className="bld-char-bar" style={{ marginBottom: 8 }}>
                    <div
                      className={`bld-char-fill ${
                        parseHardLimit(limit) && stateVal.length > parseHardLimit(limit) ? 'over' :
                        parseTargetRange(target) && stateVal.length >= parseTargetRange(target).min && stateVal.length <= parseTargetRange(target).max ? 'good' : 'warn'
                      }`}
                      style={{ width: `${Math.min((stateVal.length / (parseHardLimit(limit) || 500)) * 100, 100)}%` }}
                    />
                  </div>
                  <textarea
                    className="bld-textarea"
                    value={stateVal}
                    onChange={e => setFn(e.target.value)}
                    placeholder={
                      isBullet
                        ? 'One bullet per line.\ne.g. Purifying Neem extract removes excess oil\nSulphate-free, Paraben-free formula'
                        : `Enter ${fn.toLowerCase()}…`
                    }
                    rows={isBullet ? 6 : 4}
                  />
                  {field['Notes'] && (
                    <div className="bld-note-tip">
                      <Info style={{ width: 12, height: 12 }} />
                      <span>{field['Notes']}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════ RIGHT COLUMN — STICKY PREVIEW ══════════════════════ */}
        <div className="bld-right">
          <div className="bld-preview-card">

            {/* Tabs */}
            <div className="bld-preview-tabs">
              <button
                className={`bld-preview-tab ${previewTab === 'mobile' ? 'active' : ''}`}
                onClick={() => setPreviewTab('mobile')}
              >
                <Smartphone style={{ width: 14, height: 14 }} />
                Mobile Search
              </button>
              <button
                className={`bld-preview-tab ${previewTab === 'pdp' ? 'active' : ''}`}
                onClick={() => setPreviewTab('pdp')}
              >
                <Monitor style={{ width: 14, height: 14 }} />
                PDP View
              </button>
            </div>

            <div className="bld-preview-body">

              {/* ── MOBILE MOCKUP ── */}
              {previewTab === 'mobile' && (
                <div className="bld-mobile-wrap">
                  <div className="bld-phone-container">
                    {/* Side buttons */}
                    <div className="bld-phone-btn bld-btn-silent" />
                    <div className="bld-phone-btn bld-btn-volup" />
                    <div className="bld-phone-btn bld-btn-voldown" />
                    <div className="bld-phone-btn bld-btn-power" />
                    
                    <div className="bld-phone">
                      {/* Dynamic Island / Camera pill */}
                      <div className="bld-phone-island" />
                      
                      {/* Screen Wrapper */}
                      <div className="bld-phone-screen">
                        {/* Status bar */}
                        <div className="bld-phone-status">
                          <span style={{ position: 'relative', left: '10px' }}>9:41</span>
                          <div className="bld-status-icons" style={{ position: 'relative', right: '10px' }}>
                            <span>📶</span>
                            <span>WiFi</span>
                            <span>🔋</span>
                          </div>
                        </div>

                        {/* Amazon-like header */}
                        <div className="bld-phone-header">
                          <div className="bld-amz-logo">amazon</div>
                          <div className="bld-amz-search">
                            <Search style={{ width: 10, height: 10 }} />
                            <span>himalaya {(skuObj.category || 'facewash').toLowerCase()}</span>
                          </div>
                          <ShoppingCart style={{ width: 14, height: 14, color: '#fff' }} />
                        </div>

                        {/* Delivery bar */}
                        <div className="bld-amz-deliver">
                          <span>📍</span>
                          <span>Deliver to Mumbai 400001</span>
                        </div>

                        {/* Search results (scrollable) */}
                        <div className="bld-amz-results">
                          <div className="bld-amz-result-label">Results for "{(skuObj.category || 'product').toLowerCase()}"</div>

                          {/* Product card */}
                          <div className="bld-amz-card">
                            <div className="bld-amz-card-img">
                              <Package style={{ width: 28, height: 28, color: '#ccc' }} />
                              <div className="bld-amz-img-label">{skuObj.category || 'Product'}</div>
                            </div>
                            <div className="bld-amz-card-info">
                              <div className="bld-amz-brand">HIMALAYA</div>
                              <div className="bld-amz-title">{titleText || 'Your product title will appear here…'}</div>
                              <div className="bld-amz-stars">
                                {'★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
                                <span className="bld-amz-halfstar">★</span>
                                <span className="bld-amz-reviews">(2,814)</span>
                              </div>
                              <div className="bld-amz-price-row">
                                <span className="bld-amz-price">₹299</span>
                                <span className="bld-amz-mrp">₹350</span>
                                <span className="bld-amz-disc">15% off</span>
                              </div>
                              <div className="bld-amz-delivery">FREE delivery by <strong>Tomorrow</strong></div>
                              <div className="bld-amz-prime">🔵 Prime</div>
                            </div>
                          </div>

                          {/* Faded ghost second result */}
                          <div className="bld-amz-card ghost">
                            <div className="bld-amz-card-img ghost-img" />
                            <div className="bld-amz-card-info">
                              <div className="bld-ghost-line" style={{ width: '60%' }} />
                              <div className="bld-ghost-line" style={{ width: '90%' }} />
                              <div className="bld-ghost-line" style={{ width: '40%' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="bld-disclaimer">
                    <Info style={{ width: 11, height: 11 }} />
                    Amazon shows ~3 lines on mobile. Keep critical keywords in the first 60 chars.
                  </p>
                </div>
              )}

              {/* ── PDP VIEW ── */}
              {previewTab === 'pdp' && (
                <div className="bld-pdp-wrap">
                  {/* Breadcrumb */}
                  <div className="bld-pdp-breadcrumb">
                    Home <ChevronRight style={{ width: 10, height: 10 }} /> {skuObj.portfolio || 'Beauty'} <ChevronRight style={{ width: 10, height: 10 }} /> {skuObj.category || 'Face Wash'}
                  </div>

                  <div className="bld-pdp-layout">
                    {/* Left: images */}
                    <div className="bld-pdp-images">
                      <div className="bld-pdp-main-img">
                        <Package style={{ width: 32, height: 32, color: '#d1d5db' }} />
                        <span>Main Image</span>
                      </div>
                      <div className="bld-pdp-thumbs">
                        {[1,2,3,4].map(n => <div key={n} className="bld-pdp-thumb" />)}
                      </div>
                    </div>

                    {/* Right: info */}
                    <div className="bld-pdp-info">
                      <div className="bld-pdp-brand">Visit the Himalaya Store</div>
                      <h2 className="bld-pdp-title">{titleText || 'Your product title will appear here…'}</h2>

                      <div className="bld-pdp-rating-row">
                        <span className="bld-pdp-stars">★★★★☆</span>
                        <span className="bld-pdp-rcount">2,814 ratings</span>
                        <span className="bld-pdp-qanda">156 answered questions</span>
                      </div>

                      <div className="bld-pdp-divider" />

                      <div className="bld-pdp-price-section">
                        <span className="bld-pdp-price">₹299</span>
                        <span className="bld-pdp-mrp-label">M.R.P.: <s>₹350</s></span>
                        <span className="bld-pdp-saving">Save ₹51 (15%)</span>
                      </div>
                      <div className="bld-pdp-prime-badge">🔵 Prime — FREE delivery Tomorrow</div>

                      <div className="bld-pdp-divider" />

                      {/* Bullets */}
                      {bulletLines.length > 0 && (
                        <div className="bld-pdp-section">
                          <div className="bld-pdp-section-title">About this item</div>
                          <ul className="bld-pdp-bullets">
                            {bulletLines.map((b, i) => (
                              <li key={i}>{b.replace(/^[-•*]\s*/, '')}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Description */}
                      {description && (
                        <div className="bld-pdp-section">
                          <div className="bld-pdp-section-title">Product Description</div>
                          <p className="bld-pdp-desc">{description}</p>
                        </div>
                      )}

                      {/* Ingredients */}
                      {ingredientList && (
                        <div className="bld-pdp-section">
                          <div className="bld-pdp-section-title">Ingredients</div>
                          <p className="bld-pdp-ingred">{ingredientList}</p>
                        </div>
                      )}

                      {!bulletLines.length && !description && !ingredientList && (
                        <div className="bld-pdp-placeholder">
                          <AlignLeft style={{ width: 20, height: 20 }} />
                          <span>Fill in the PDP Content fields on the left to see your Amazon PDP preview.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Export Console ── */}
            <div className="bld-export">
              <div className="bld-export-title">
                <Zap style={{ width: 14, height: 14 }} />
                Export Content
              </div>
              <div className="bld-export-grid">
                {[
                  { key: 'title', label: 'Title', val: titleText },
                  { key: 'desc', label: 'Description', val: description },
                  { key: 'bullets', label: 'Bullets', val: bulletText },
                  { key: 'ingred', label: 'Ingredients', val: ingredientList },
                ].map(({ key, label, val }) => (
                  <button
                    key={key}
                    className={`bld-export-btn ${copiedKey === key ? 'copied' : ''}`}
                    onClick={() => handleCopy(key, val)}
                  >
                    {copiedKey === key
                      ? <><CheckCircle style={{ width: 13, height: 13 }} /> Copied!</>
                      : <><Copy style={{ width: 13, height: 13 }} /> {label}</>
                    }
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pro Tips card */}
          <div className="bld-tips-card">
            <div className="bld-tips-title">
              <Star style={{ width: 13, height: 13, color: '#c39a3c' }} />
              Pro Tips for {platform.replace(' (2)', '')}
            </div>
            <ul className="bld-tips-list">
              <li><span className="bld-tip-dot" />Lead with your strongest benefit in the first 60 chars</li>
              <li><span className="bld-tip-dot" />Include hero ingredient name for searchability</li>
              <li><span className="bld-tip-dot" />Add pack size — it drives Add-to-Cart confidence</li>
              <li><span className="bld-tip-dot" />Avoid ALL CAPS and excessive punctuation</li>
              {platform === 'Flipkart' && <li><span className="bld-tip-dot orange" />Flipkart auto-builds title from inputs — the Model Name field is critical</li>}
              {platform.includes('Nykaa') && <li><span className="bld-tip-dot pink" />Nykaa: skin concern + ingredient combo drives discovery</li>}
              {platform.includes('FirstCry') && <li><span className="bld-tip-dot blue" />FirstCry: stack free-from claims (paraben-free, tear-free) in the title</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Toast */}
      <div className={`bld-toast ${toast.show ? 'show' : ''}`}>{toast.message}</div>
    </div>
  );
}
