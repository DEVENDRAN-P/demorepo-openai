import React from 'react';
import { useTranslation } from 'react-i18next';
import AIAssistant from '../components/AIAssistant';

function ChatPage({ user }) {
  const { t } = useTranslation();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem', margin: 0 }}>
              {t('gst_buddy_assistant')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              {t('chat.subtitle')}
            </p>
          </div>

          <AIAssistant user={user} />
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
