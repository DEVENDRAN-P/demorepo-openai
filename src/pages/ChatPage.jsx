import React from 'react';
import Navbar from '../components/Navbar';
import AIAssistant from '../components/AIAssistant';

function ChatPage({ user, setUser }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--neutral-50)' }}>
      <Navbar user={user} setUser={setUser} />

      <div className="container section">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              AI GST Assistant
            </h1>
            <p style={{ color: 'var(--neutral-600)' }}>
              Get instant answers to your GST compliance questions
            </p>
          </div>
          
          <AIAssistant />
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
