import { useState, useEffect } from 'react';
import { CATALOG_DATA } from '@/lib/data';
import { Search, Sparkles, User } from 'lucide-react';

export default function SkuView({ onLoadSku }) {
  const [skus, setSkus] = useState([]);
  const [portfolioFilter, setPortfolioFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const skuRaw = CATALOG_DATA["SKU"] || [];
    const parsedSkus = [];
    if (skuRaw.length > 2) {
      for (let i = 2; i < skuRaw.length; i++) {
        const row = skuRaw[i];
        
        // Beauty
        if (row[0] && row[0].trim() !== "" && row[0] !== "SKU Name") {
          parsedSkus.push({
            id: `beauty-${i}`,
            portfolio: "Beauty",
            name: row[0].trim(),
            category: row[1] ? row[1].trim() : "",
            owner: row[2] ? row[2].trim() : ""
          });
        }
        
        // Baby
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
  }, []);

  // Filtered SKUs
  let filteredSkus = skus;
  if (portfolioFilter !== 'all') {
    filteredSkus = filteredSkus.filter(s => s.portfolio === portfolioFilter);
  }
  if (searchQuery && searchQuery.trim() !== '') {
    const query = searchQuery.toLowerCase().trim();
    filteredSkus = filteredSkus.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.category.toLowerCase().includes(query) || 
      s.owner.toLowerCase().includes(query)
    );
  }

  return (
    <div className="view-section">
      <div className="page-header">
        <div>
          <h1>SKU Directory</h1>
          <p>Official SKU listings from the catalog playbook. Select any item to directly load its attributes and category formula inside the builder.</p>
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="portfolio-toggle">
        <button 
          className={`btn btn-toggle ${portfolioFilter === 'all' ? 'active' : ''}`}
          onClick={() => setPortfolioFilter('all')}
        >
          All Products ({skus.length})
        </button>
        <button 
          className={`btn btn-toggle pink ${portfolioFilter === 'Beauty' ? 'active' : ''}`}
          onClick={() => setPortfolioFilter('Beauty')}
        >
          Beauty Portfolio ({skus.filter(s => s.portfolio === 'Beauty').length})
        </button>
        <button 
          className={`btn btn-toggle blue ${portfolioFilter === 'Baby' ? 'active' : ''}`}
          onClick={() => setPortfolioFilter('Baby')}
        >
          Baby Portfolio ({skus.filter(s => s.portfolio === 'Baby').length})
        </button>
      </div>

      {/* Search and Table */}
      <div className="playbook-card">
        <div className="sku-table-actions">
          <div className="search-wrapper" style={{ width: '300px' }}>
            <Search />
            <input 
              type="text" 
              placeholder="Search SKU name, category, or owner..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="table-scroll-container">
          <table className="sku-table">
            <thead>
              <tr>
                <th>Portfolio</th>
                <th>SKU Product Name</th>
                <th>Segment Category</th>
                <th>Formula Group</th>
                <th>Category Owner</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkus.map((sku, index) => {
                const badgeColor = sku.portfolio === 'Beauty' ? 'pink' : 'blue';
                return (
                  <tr key={index}>
                    <td data-label="Portfolio"><span className={`badge-cat ${badgeColor}`}>{sku.portfolio}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{sku.name}</td>
                    <td data-label="Segment Category">{sku.category}</td>
                    <td data-label="Formula Group"><span className="formula-text">{sku.category} Title Rules</span></td>
                    <td data-label="Category Owner">
                      <span className="meta-badge owner">
                        <User style={{ width: '12px', height: '12px', display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> 
                        {sku.owner}
                      </span>
                    </td>
                    <td>
                      <button className="btn-table-action" onClick={() => onLoadSku(sku.id)}>
                        <Sparkles /> Load in Builder
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredSkus.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    No SKUs found matching the search criteria.
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
