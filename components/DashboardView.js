import { Store, BookOpen, CheckCircle } from 'lucide-react';

export default function DashboardView({ onViewChange }) {
  return (
    <div className="view-section">
      {/* Banner */}
      <div className="dashboard-banner">
        <div className="banner-overlay"></div>
        <div className="banner-content">
          <span className="badge">Himalaya Catalog Playbook v2</span>
          <h1>E-Commerce Catalog Framework</h1>
          <p>Optimize search visibility, character targets, and on-page conversion formulas for Beauty and Baby portfolios across all Indian retail channels.</p>
          <div className="banner-actions">
            <button className="btn btn-primary" onClick={() => onViewChange('builder')}>
              <i className="fa-solid fa-wand-magic-sparkles"></i> Launch PDP Builder
            </button>
            <button className="btn btn-secondary" onClick={() => onViewChange('playbooks')}>
              <BookOpen style={{ width: '16px', height: '16px' }} /> Browse Guidelines
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <Store />
          </div>
          <div className="stat-details">
            <h3>9 Channels</h3>
            <p>Amazon, Flipkart, Nykaa, Myntra, FirstCry, Meesho, Zepto, Blinkit, & Swiggy Instamart</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <CheckCircle />
          </div>
          <div className="stat-details">
            <h3>Formula-Driven</h3>
            <p>Automatic title structures & length validations</p>
          </div>
        </div>
      </div>
    </div>
  );
}
