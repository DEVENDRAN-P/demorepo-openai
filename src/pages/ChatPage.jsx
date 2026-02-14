import React from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import AIAssistant from '../components/AIAssistant';

function ChatPage({ user }) {
  const { t } = useTranslation();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Navbar user={user} />

      <div className="container section">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              {t('gst_buddy_assistant')}
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {t('Get instant answers to your GST compliance questions')}
            </p>
          </div>

          <AIAssistant user={user} />
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
