import { useState, useEffect } from 'react';
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
  HelpCircle,
  FolderOpen
} from 'lucide-react';

export default function BuilderView({ presetPlatform, presetSkuId, clearPresetSku }) {
  const [platform, setPlatform] = useState(presetPlatform || 'Amazon');
  const [skuId, setSkuId] = useState(presetSkuId || '');
  const [skus, setSkus] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  
  // Form Inputs
  const [placeholders, setPlaceholders] = useState({});
  const [description, setDescription] = useState('');
  const [bullets, setBullets] = useState('');
  const [ingredients, setIngredients] = useState('');
  
  // UI Display state
  const [titleFormula, setTitleFormula] = useState('');
  const [titleSpecs, setTitleSpecs] = useState({ limit: '', target: '', notes: '' });
  const [otherSpecs, setOtherSpecs] = useState([]);
  const [previewTab, setPreviewTab] = useState('mobile'); // 'mobile' | 'pdp'
  
  // Copy feedback toast
  const [toast, setToast] = useState({ show: false, message: '' });

  // Init list of SKUs and Definitions
  useEffect(() => {
    // Definitions
    const indexRaw = CATALOG_DATA["Index"] || [];
    const parsedDefs = [];
    let startDef = false;
    for (let i = 0; i < indexRaw.length; i++) {
      const row = indexRaw[i];
      if (row[0] && row[0].includes("TITLE FORMULA - WHAT EACH PLACEHOLDER MEANS")) {
        startDef = true;
        continue;
      }
      if (startDef && row[0] && row[0].trim() !== "" && row[0] !== "Placeholder") {
        parsedDefs.push({
          placeholder: row[0].trim(),
          definition: row[1] ? row[1].trim() : "",
          beautyEx: row[2] ? row[2].trim() : "",
          babyEx: row[3] ? row[3].trim() : ""
        });
      }
    }
    setDefinitions(parsedDefs);

    // SKUs
    const skuRaw = CATALOG_DATA["SKU"] || [];
    const parsedSkus = [];
    if (skuRaw.length > 2) {
      for (let i = 2; i < skuRaw.length; i++) {
        const row = skuRaw[i];
        if (row[0] && row[0].trim() !== "" && row[0] !== "SKU Name") {
          parsedSkus.push({
            id: `beauty-${i}`,
            portfolio: "Beauty",
            name: row[0].trim(),
            category: row[1] ? row[1].trim() : "",
            owner: row[2] ? row[2].trim() : ""
          });
        }
        if (row[7] && row[7].trim() !== "" && row[7] !== "SKU Name") {
          parsedSkus.push({
            id: `baby-${i}`,
            portfolio: "Baby",
            name: row[7].trim(),
            category: row[8] ? row[8].trim() : "",
            owner: row[9] ? row[9].trim() : "Ponnappa"
          });
        }
      }
    }
    setSkus(parsedSkus);

    // Initial SKU load
    if (parsedSkus.length > 0 && !skuId) {
      setSkuId(parsedSkus[0].id);
    }
  }, []);

  // Update builder presets if changed externally
  useEffect(() => {
    if (presetPlatform) setPlatform(presetPlatform);
    if (presetSkuId) setSkuId(presetSkuId);
  }, [presetPlatform, presetSkuId]);

  // Main Builder update logic
  useEffect(() => {
    if (skus.length === 0 || !skuId) return;

    const skuObj = skus.find(s => s.id === skuId);
    if (!skuObj) return;

    const playbook = CATALOG_DATA[platform];
    if (!playbook) return;

    // Load playbook data specifically
    const playbookData = getPlaybookData(platform);
    
    // Title rule
    const titleRule = playbookData.rows.find(r => 
      !r.isSection && (r['Field'] === 'Product Name' || r['Field'] === 'Product Title' || r['Attribute'] === 'Title')
    );

    let formula = "Brand · Product Type · Primary Promise · Hero Ingredient · Size";
    let specLimit = "200 characters";
    let specTarget = "80-120 characters";
    let specNotes = "";

    if (titleRule) {
      formula = titleRule['Best-Practice Formula'] || formula;
      specLimit = titleRule['Hard Limit'] || specLimit;
      specTarget = titleRule['Target Range'] || specTarget;
      specNotes = titleRule['Notes'] || specNotes;
    }

    setTitleFormula(formula);
    setTitleSpecs({ limit: specLimit, target: specTarget, notes: specNotes });

    // Other Content fields specs (Description, Bullets, Ingredients)
    const otherContent = playbookData.rows.filter(r => 
      !r.isSection && (
        r['Field'] === 'Description' || 
        r['Field'] === 'Key Features' || 
        r['Field'] === 'Bullet Points' || 
        r['Field'] === 'Ingredient' || 
        r['Field'] === 'Ingredients' || 
        r['Attribute'] === 'Description' ||
        r['Attribute'] === 'Bullet Points'
      )
    );
    setOtherSpecs(otherContent);

    // Setup Placeholders state dynamically
    const formulaParts = formula.split(/[·•\-\+]/).map(p => p.trim()).filter(p => p !== '');
    const detectedSize = detectSize(skuObj.name);
    const productType = skuObj.category;
    
    const newPlaceholders = {};
    formulaParts.forEach(p => {
      let defaultVal = '';
      if (p.toLowerCase() === 'brand') defaultVal = 'Himalaya';
      else if (p.toLowerCase() === 'size') defaultVal = detectedSize;
      else if (p.toLowerCase() === 'product type') defaultVal = productType;
      
      // Preserve user typed fields if valid
      if (placeholders[p] !== undefined) {
        newPlaceholders[p] = placeholders[p];
      } else {
        newPlaceholders[p] = defaultVal;
      }
    });
    setPlaceholders(newPlaceholders);

    // Load pre-populated presets for other fields (Examples from spreadsheet)
    otherContent.forEach(field => {
      const fieldName = field['Field'] || field['Attribute'] || '';
      let stateKey = '';
      if (fieldName.toLowerCase().includes('desc')) stateKey = 'desc';
      else if (fieldName.toLowerCase().includes('feat') || fieldName.toLowerCase().includes('bullet')) stateKey = 'bullets';
      else if (fieldName.toLowerCase().includes('ingred')) stateKey = 'ingred';

      const ex1 = field['Example 1'] || '';
      
      if (stateKey === 'desc' && !description) setDescription(cleanQuotes(ex1));
      if (stateKey === 'bullets' && !bullets) setBullets(cleanQuotes(ex1));
      if (stateKey === 'ingred' && !ingredients) setIngredients(cleanQuotes(ex1));
    });

  }, [platform, skuId, skus]);

  // Helpers
  const getPlaybookData = (sheetName) => {
    const rawRows = CATALOG_DATA[sheetName] || [];
    let headerIdx = -1;
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (row.includes("Field") || row.includes("Attribute")) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return { rows: [] };
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
      dataRows.push(rowObj);
    }
    return { rows: dataRows };
  };

  const detectSize = (skuName) => {
    const regex = /\b\d+\s*(?:ml|g|ML|G|oz|wipes|s|S|N|kg|KG)\b|\b\d+'s\b/i;
    const match = skuName.match(regex);
    return match ? match[0] : '';
  };

  const cleanQuotes = (str) => {
    if (!str) return '';
    return str.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
  };

  const cleanId = (str) => {
    if (!str) return 'unknown';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '-');
  };

  const parseNumberLimit = (limitStr) => {
    if (!limitStr) return null;
    const cleanStr = limitStr.replace(/,/g, '');
    const match = cleanStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  const parseRangeLimit = (rangeStr) => {
    if (!rangeStr || rangeStr.toLowerCase() === 'none') return null;
    const cleanStr = rangeStr.replace(/,/g, '');
    const minMaxMatch = cleanStr.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (minMaxMatch) {
      return { min: parseInt(minMaxMatch[1], 10), max: parseInt(minMaxMatch[2], 10) };
    }
    const plusMatch = cleanStr.match(/(\d+)\s*\+/);
    if (plusMatch) {
      return { min: parseInt(plusMatch[1], 10), max: 9999 };
    }
    return null;
  };

  // Compile Dynamic Title
  const compileTitle = () => {
    const formulaParts = titleFormula.split(/[·•\-\+]/).map(p => p.trim()).filter(p => p !== '');
    const values = [];
    formulaParts.forEach(p => {
      const val = placeholders[p] || '';
      if (val && val.trim() !== '') {
        values.push(val.trim());
      }
    });

    let separator = ' ';
    if (platform === 'FirstCry (2)') separator = ' - ';
    
    return values.join(separator);
  };

  const compiledTitle = compileTitle();
  const skuObj = skus.find(s => s.id === skuId) || { portfolio: '', category: '', owner: '', name: '' };

  // Character limit alerts helpers
  const getCounterClass = (length, ruleLimit, ruleRange) => {
    const hardLimit = parseNumberLimit(ruleLimit);
    const targetRange = parseRangeLimit(ruleRange);
    
    if (hardLimit && length > hardLimit) return 'char-counter limit-exceeded';
    if (targetRange && (length < targetRange.min || length > targetRange.max)) return 'char-counter limit-warning';
    return 'char-counter limit-safe';
  };

  const handleCopy = (fieldKey, value) => {
    if (!value || value.trim() === '') {
      triggerToast('Field is empty!');
      return;
    }
    navigator.clipboard.writeText(value).then(() => {
      triggerToast('Copied to clipboard!');
    }).catch(() => {
      triggerToast('Copy failed!');
    });
  };

  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 2000);
  };

  const platforms = Object.keys(CATALOG_DATA).filter(k => 
    k !== "SKU" && k !== "Index" && k !== "L1 Priority Matrix"
  );

  return (
    <div className="view-section">
      <div className="page-header">
        <div>
          <h1>Dynamic Title & PDP Content Builder</h1>
          <p>Assemble your product content fields under the target formula constraints of each platform with real-time character limit safety.</p>
        </div>
      </div>

      <div className="builder-workspace">
        {/* Left Column Inputs */}
        <div className="builder-inputs-column">
          
          {/* Panel 1: Configuration */}
          <div className="builder-card">
            <div className="card-header-icon">
              <Sliders />
              <h2>1. Configuration</h2>
            </div>
            
            <div className="form-grid-2">
              <div className="form-group">
                <label>Target Channel</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  {platforms.map(p => (
                    <option key={p} value={p}>{p.replace(' (2)', '')}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Select Himalaya SKU</label>
                <select value={skuId} onChange={(e) => setSkuId(e.target.value)}>
                  <optgroup label="Beauty Portfolio">
                    {skus.filter(s => s.portfolio === 'Beauty').map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Baby Portfolio">
                    {skus.filter(s => s.portfolio === 'Baby').map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="sku-meta-badge-row">
              <span className="meta-badge portfolio"><FolderOpen style={{ width: '12px', height: '12px', verticalAlign: 'middle', marginRight: '4px' }} /> {skuObj.portfolio} Portfolio</span>
              <span className="meta-badge category"><i className="fa-solid fa-leaf"></i> Segment: {skuObj.category}</span>
              <span className="meta-badge owner"><i className="fa-solid fa-user-circle"></i> Owner: {skuObj.owner}</span>
            </div>
          </div>

          {/* Panel 2: Title Builder */}
          <div className="builder-card">
            <div className="card-header-icon">
              <Heading />
              <h2>2. Best-Practice Title Builder</h2>
            </div>

            <div className="formula-box">
              <span className="formula-label">Best-Practice Formula:</span>
              <div className="formula-display">
                {titleFormula.split(/[·•\-\+]/).map(p => p.trim()).filter(p => p !== '').map((p, index) => {
                  const hasVal = placeholders[p] && placeholders[p].trim() !== '';
                  return (
                    <span 
                      key={index} 
                      className={`formula-pill ${hasVal ? 'filled' : 'active'}`}
                    >
                      {p}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="placeholder-inputs-container">
              {Object.keys(placeholders).map((p, index) => {
                const def = definitions.find(d => d.placeholder.toLowerCase() === p.toLowerCase());
                const helperEx = def ? (skuObj.portfolio === 'Beauty' ? def.beautyEx : def.babyEx) : '';
                const placeholderHint = helperEx ? `e.g., ${helperEx}` : `Enter ${p}`;

                return (
                  <div className="form-group field-with-limit" key={index}>
                    <label>{p}</label>
                    <input 
                      type="text" 
                      value={placeholders[p] || ''} 
                      placeholder={placeholderHint}
                      onChange={(e) => setPlaceholders({ ...placeholders, [p]: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>

            <div className="field-side-spec" style={{ gridColumn: '1 / -1', marginTop: '20px' }}>
              <p><strong>Channel Title Specification Limits:</strong></p>
              <p><i className="fa-solid fa-triangle-exclamation"></i> <strong>Hard Cap Limit:</strong> {titleSpecs.limit} | <strong>Target Optimized Range:</strong> {titleSpecs.target}</p>
              {titleSpecs.notes && <p><i className="fa-solid fa-circle-info"></i> <strong>Notes:</strong> {titleSpecs.notes}</p>}
              <div className="field-meta-row" style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <span>Current Compile Length:</span>
                <span className={getCounterClass(compiledTitle.length, titleSpecs.limit, titleSpecs.target)}>
                  {compiledTitle.length} chars
                </span>
              </div>
            </div>
          </div>

          {/* Panel 3: Other Content Fields */}
          <div className="builder-card">
            <div className="card-header-icon">
              <AlignLeft />
              <h2>3. Product Page Fields</h2>
            </div>

            {otherSpecs.map((field, index) => {
              const fieldName = field['Field'] || field['Attribute'] || '';
              const limit = field['Hard Limit'] || 'None';
              const target = field['Target Range'] || 'None';
              const formula = field['Best-Practice Formula'] || '';
              const notes = field['Notes'] || '';
              
              let stateVal = '';
              let setStateFn = null;
              if (fieldName.toLowerCase().includes('desc')) {
                stateVal = description;
                setStateFn = setDescription;
              } else if (fieldName.toLowerCase().includes('feat') || fieldName.toLowerCase().includes('bullet')) {
                stateVal = bullets;
                setStateFn = setBullets;
              } else if (fieldName.toLowerCase().includes('ingred')) {
                stateVal = ingredients;
                setStateFn = setIngredients;
              }

              return (
                <div key={index} style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px dashed var(--border-color)' }}>
                  <div className="form-group">
                    <label>{fieldName}</label>
                    <textarea 
                      value={stateVal}
                      placeholder={`Enter ${fieldName.toLowerCase()}...`}
                      onChange={(e) => setStateFn(e.target.value)}
                    />
                  </div>
                  <div className="field-side-spec">
                    <p><strong>{fieldName} Guidelines:</strong></p>
                    {formula && <p><strong>Formula:</strong> <span className="formula-text" style={{ fontSize: '11px' }}>{formula}</span></p>}
                    <p><i className="fa-solid fa-circle-info"></i> <strong>Target Range:</strong> {target} | <strong>Hard Limit:</strong> {limit}</p>
                    {notes && <p><i className="fa-solid fa-lightbulb"></i> <strong>Tip:</strong> {notes}</p>}
                    <div className="field-meta-row" style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                      <span>Current Length:</span>
                      <span className={getCounterClass(stateVal.length, limit, target)}>
                        {stateVal.length} chars
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Column Previews */}
        <div className="builder-preview-column">
          <div className="preview-card sticky-card">
            
            <div className="preview-header-tabs">
              <button 
                className={`preview-tab ${previewTab === 'mobile' ? 'active' : ''}`}
                onClick={() => setPreviewTab('mobile')}
              >
                <Smartphone style={{ width: '16px', height: '16px', display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> 
                Mobile Search Mockup
              </button>
              <button 
                className={`preview-tab ${previewTab === 'pdp' ? 'active' : ''}`}
                onClick={() => setPreviewTab('pdp')}
              >
                <Monitor style={{ width: '16px', height: '16px', display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} /> 
                PDP View
              </button>
            </div>

            <div className="preview-body">
              {previewTab === 'mobile' ? (
                <div className="preview-content-panel active">
                  <div className="mock-device-bezel">
                    <div className="mock-mobile-header">
                      <i className="fa-solid fa-chevron-left"></i>
                      <div className="mock-search-bar">himalaya {skuObj.category.toLowerCase() || 'product'}</div>
                      <i className="fa-solid fa-cart-shopping"></i>
                    </div>
                    <div className="mock-search-results">
                      <div className="mock-product-card">
                        <div className="mock-product-image-container">
                          <div className="image-placeholder-inner">
                            <i className="fa-regular fa-image placeholder-image-icon"></i>
                            <span>[Image Placeholder]</span>
                            <small>{skuObj.portfolio} - {skuObj.category}</small>
                          </div>
                        </div>
                        <div className="mock-product-info">
                          <span className="mock-brand-tag">Himalaya Wellness</span>
                          <h4 className="mock-product-title">{compiledTitle || "Himalaya Product Title Preview"}</h4>
                          <div className="mock-rating">
                            <i className="fa-solid fa-star"></i>
                            <i className="fa-solid fa-star"></i>
                            <i className="fa-solid fa-star"></i>
                            <i className="fa-solid fa-star"></i>
                            <i className="fa-solid fa-star-half-stroke"></i>
                            <span>(482)</span>
                          </div>
                          <div className="mock-price-row">
                            <span className="mock-price">₹299</span>
                            <span className="mock-mrp">₹350</span>
                            <span className="mock-discount">(15% OFF)</span>
                          </div>
                          <span className="mock-delivery">FREE delivery <strong>Tomorrow</strong></span>
                          <button className="mock-add-btn">Add to Cart</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="preview-disclaimer"><i className="fa-solid fa-info-circle"></i> Displays how title length truncates in mobile search grids. Keep critical keywords within the first 60 characters.</p>
                </div>
              ) : (
                <div className="preview-content-panel active">
                  <div className="mock-pdp-container">
                    <div className="mock-pdp-layout">
                      <div className="mock-pdp-images">
                        <div className="mock-pdp-main-image">
                          <i className="fa-regular fa-image"></i>
                          <span>Product Image</span>
                        </div>
                        <div className="mock-pdp-thumbs">
                          <span>Thumb 1</span>
                          <span>Thumb 2</span>
                          <span>Thumb 3</span>
                        </div>
                      </div>
                      
                      <div className="mock-pdp-info">
                        <h1 className="mock-pdp-title-text">{compiledTitle || "Himalaya Product Title Preview"}</h1>
                        <div className="mock-rating-badge">4.5 ★ | 1,284 ratings</div>
                        <hr />
                        
                        <div className="mock-pdp-bullets-section">
                          <h3>Key Product Features</h3>
                          <ul className="mock-pdp-bullets-list">
                            {bullets ? bullets.split('\n').filter(b => b.trim() !== '').map((bullet, i) => (
                              <li key={i}>{bullet.trim().replace(/^[\-\•\*]\s*/, '')}</li>
                            )) : (
                              <li>Enter key features (one per line) to preview.</li>
                            )}
                          </ul>
                        </div>
                        
                        <hr />
                        <div className="mock-pdp-description-section">
                          <h3>Product Description</h3>
                          <p className="mock-pdp-desc-text">{description || 'Enter product description to preview.'}</p>
                        </div>

                        <hr />
                        <div className="mock-pdp-ingredients-section">
                          <h3>Ingredients</h3>
                          <p className="mock-pdp-ingredients-text">{ingredients || 'Enter ingredient list to preview.'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Consolidated Export Console */}
            <div className="export-console">
              <h3>Export Consolidated PDP Content</h3>
              <div className="copy-buttons-row">
                <button className="btn btn-primary btn-copy" onClick={() => handleCopy('Title', compiledTitle)}>
                  <Copy /> Copy Title
                </button>
                <button className="btn btn-primary btn-copy" onClick={() => handleCopy('Description', description)}>
                  <Copy /> Copy Description
                </button>
                <button className="btn btn-primary btn-copy" onClick={() => handleCopy('Bullets', bullets)}>
                  <Copy /> Copy Bullets
                </button>
                <button className="btn btn-primary btn-copy" onClick={() => handleCopy('Ingredients', ingredients)}>
                  <Copy /> Copy Ingredients
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Toast popup */}
      <div className={`toast-notification ${toast.show ? 'show' : ''}`}>
        {toast.message}
      </div>
    </div>
  );
}
