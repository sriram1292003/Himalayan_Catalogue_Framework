'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Grid,
  Layers,
  Mountain,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import DashboardView from '@/components/DashboardView';
import PlaybookView from '@/components/PlaybookView';
import BuilderView from '@/components/BuilderView';
import MatrixView from '@/components/MatrixView';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Shared navigation states for redirects
  const [builderPlatform, setBuilderPlatform] = useState('Amazon');
  const [builderSkuId, setBuilderSkuId] = useState('');

  const [playbookPlatform, setPlaybookPlatform] = useState('Amazon');
  const [playbookHighlight, setPlaybookHighlight] = useState(null);

  // Helper redirects
  const loadPresetBuilder = (platform, skuId) => {
    setBuilderPlatform(platform);
    setBuilderSkuId(skuId);
    setActiveTab('builder');
    setIsMobileMenuOpen(false);
  };

  const loadSkuIntoBuilder = (skuId) => {
    setBuilderSkuId(skuId);
    setActiveTab('builder');
    setIsMobileMenuOpen(false);
  };

  const redirectToPlaybook = (platform, fieldName) => {
    setPlaybookPlatform(platform);
    setPlaybookHighlight(fieldName);
    setActiveTab('playbooks');
    setIsMobileMenuOpen(false);
  };

  const selectTab = (tabName) => {
    setActiveTab(tabName);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="app-container">
      {/* Mobile Top Header (Visible only on tablets & phones) */}
      <header className="mobile-top-header">
        <div className="logo-container">
          {!logoError ? (
            <img
              src="/icons/Himalaya-logo.png"
              alt="Himalaya Wellness"
              className="logo-img"
              onError={() => setLogoError(true)}
              style={{ height: '36px', objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <div className="logo-placeholder">
              <Mountain className="logo-icon" style={{ strokeWidth: 2.5 }} />
              <div className="logo-text">
                <span className="logo-title" style={{ fontSize: '18px' }}>Himalaya</span>
                <span className="logo-subtitle" style={{ letterSpacing: '2px' }}>WELLNESS</span>
              </div>
            </div>
          )}
        </div>
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu />
        </button>
      </header>

      {/* Backdrop overlay for mobile menu drawer */}
      <div
        className={`sidebar-overlay ${isMobileMenuOpen ? 'mobile-open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="logo-container">
            {!logoError ? (
              <>
                <img
                  src="/icons/Himalaya-logo.png"
                  alt="Himalaya Wellness"
                  className="logo-img expanded-only"
                  onError={() => setLogoError(true)}
                  style={{ height: '40px', objectFit: 'contain', display: 'block' }}
                />
                <img
                  src="/icons/H-logo.png"
                  alt="Himalaya"
                  className="logo-icon collapsed-only"
                  style={{ height: '36px', width: '36px', objectFit: 'contain', display: 'none' }}
                />
              </>
            ) : (
              <div className="logo-placeholder">
                <Mountain className="logo-icon" style={{ strokeWidth: 2.5 }} />
                <div className="logo-text">
                  <span className="logo-title">Himalaya</span>
                  <span className="logo-subtitle">WELLNESS</span>
                </div>
              </div>
            )}
          </div>

          {/* Collapse sidebar button (Desktop only) */}
          <button
            className="sidebar-toggle-btn"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight style={{ width: '18px', height: '18px' }} />
            ) : (
              <ChevronLeft style={{ width: '18px', height: '18px' }} />
            )}
          </button>

          {/* Mobile close button inside drawer */}
          <button
            className="mobile-menu-btn"
            style={{ display: isMobileMenuOpen ? 'block' : 'none' }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X style={{ width: '22px', height: '22px' }} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => selectTab('dashboard')}
            title="Dashboard"
          >
            <LayoutDashboard />
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'playbooks' ? 'active' : ''}`}
            onClick={() => {
              selectTab('playbooks');
              setPlaybookHighlight(null);
            }}
            title="Playbook Explorer"
          >
            <BookOpen />
            <span>Playbook Explorer</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'builder' ? 'active' : ''}`}
            onClick={() => selectTab('builder')}
            title="Interactive Builder"
          >
            <Sparkles />
            <span>Interactive Builder</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'matrix' ? 'active' : ''}`}
            onClick={() => selectTab('matrix')}
            title="L1 Priority Matrix"
          >
            <Grid />
            <span>L1 Priority Matrix</span>
          </button>


        </nav>

        <div className="sidebar-footer">
          <p className="owner-tag">SIP Framework</p>
          <p className="copyright">© 2026 Himalaya | Developed by Sriram - Summer Intern</p>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="main-content-inner">
          {activeTab === 'dashboard' && (
            <DashboardView
              onViewChange={selectTab}
              onPresetLoad={loadPresetBuilder}
            />
          )}

          {activeTab === 'playbooks' && (
            <PlaybookView
              initialPlatform={playbookPlatform}
              highlightField={playbookHighlight}
              clearHighlight={() => setPlaybookHighlight(null)}
            />
          )}

          {activeTab === 'builder' && (
            <BuilderView
              presetPlatform={builderPlatform}
              presetSkuId={builderSkuId}
              clearPresetSku={() => setBuilderSkuId('')}
            />
          )}

          {activeTab === 'matrix' && (
            <MatrixView
              onRedirect={redirectToPlaybook}
            />
          )}

          <footer className="main-footer">
            <p>Himalaya Wellness Catalog Playbook &copy; 2026 | Developed by <strong>Sriram - Summer Intern</strong></p>
          </footer>
        </div>
      </main>
    </div>
  );
}
