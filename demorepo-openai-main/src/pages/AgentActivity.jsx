import React from 'react';
import AgentActivity from '../components/AgentActivity';

export default function AgentActivityPage({ user }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <AgentActivity userId={user?.uid} />
    </div>
  );
}
