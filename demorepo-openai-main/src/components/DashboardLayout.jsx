import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

function DashboardLayout() {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      overflowX: 'hidden'
    }}>
      
      {/* Fixed Collapsible Side Menu */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100vh',
        overflowY: 'auto'
      }}>
        {/* Sticky Header */}
        <Header />

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
