import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const mainContainerRef = useRef(null);

  useEffect(() => {
    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      overflowX: 'hidden'
    }}>
      
      {/* Overlay backdrop for mobile when sidebar is open */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 995,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Fixed Collapsible Side Menu */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Workspace Frame */}
      <div 
        ref={mainContainerRef}
        id="main-workspace-container"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          overflowY: 'auto'
        }}
      >
        {/* Sticky Header */}
        <Header onMenuClick={() => setMobileOpen(!mobileOpen)} />

        {/* Scrollable Main Area */}
        <main style={{
          flex: 1,
          padding: '2rem 1.5rem',
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}>
          <Outlet />
        </main>
      </div>

    </div>
  );
}

export default DashboardLayout;
