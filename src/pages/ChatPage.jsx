import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import AIAssistant from '../components/AIAssistant';

function ChatPage({ user }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar user={user} />

      <div className="container section">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              AI GST Assistant
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Get instant answers to your GST compliance questions
            </p>
          </div>

          <AIAssistant user={user} />
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
