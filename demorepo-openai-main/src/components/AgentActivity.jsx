/**
 * AgentActivity — displays the real-time execution history of AI agents.
 *
 * Shows:
 * - Agent run timeline (when each agent ran, status, duration)
 * - Decisions made by each agent
 * - Actions executed (alerts created, invoices stored, etc.)
 * - Chain execution flow (which agents ran in sequence)
 */

import { useState, useEffect } from 'react';
import { getAgentRuns } from '../services/agentService';

const STATUS_COLORS = {
  completed: '#10b981',
  running: '#f59e0b',
  error: '#ef4444',
  requires_approval: '#8b5cf6',
};

const AGENT_ICONS = {
  'Invoice Intelligence Agent': '📄',
  'Compliance Monitor Agent': '✅',
  'AI Tax Forecast Agent': '📊',
  'AI Business Intelligence Agent': '💡',
  'Reminder Scheduler Agent': '⏰',
  'Agent Orchestrator': '🔗',
  'Scheduled Compliance Agent': '🔄',
};

function formatDuration(startedAt, completedAt) {
  if (!completedAt) return 'running...';
  const ms = new Date(completedAt) - new Date(startedAt);
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function AgentRunCard({ run }) {
  const [expanded, setExpanded] = useState(false);
  const icon = AGENT_ICONS[run.agent] || '🤖';
  const color = STATUS_COLORS[run.status] || '#6b7280';

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: `1px solid ${color}33`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.25rem',
        marginBottom: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <span style={{ fontSize: '1.25rem' }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{run.agent}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
              {run.trigger?.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {formatDuration(run.startedAt, run.completedAt)}
          </span>
          <span
            style={{
              background: `${color}22`,
              color,
              padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {run.status}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
          {/* Timing */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>Started: {formatTime(run.startedAt)}</span>
            <span>Completed: {formatTime(run.completedAt)}</span>
          </div>

          {/* Decisions */}
          {run.decisions && run.decisions.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                Decisions
              </div>
              {run.decisions.map((d, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.375rem 0.5rem',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '0.25rem',
                    borderLeft: '2px solid var(--theme-primary)',
                  }}
                >
                  {typeof d === 'string' ? d : JSON.stringify(d)}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {run.actions && run.actions.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                Actions Executed
              </div>
              {run.actions.map((a, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.375rem 0.5rem',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '0.25rem',
                    borderLeft: '2px solid #10b981',
                  }}
                >
                  {typeof a === 'string' ? a : JSON.stringify(a)}
                </div>
              ))}
            </div>
          )}

          {/* Result */}
          {run.result && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Result: {run.result}
            </div>
          )}

          {/* Error */}
          {run.error && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: 500 }}>
              Error: {run.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentActivity({ userId }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchRuns() {
      try {
        setLoading(true);
        const data = await getAgentRuns(50);
        if (!cancelled) {
          setRuns(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRuns();

    // Poll every 10 seconds for new runs
    const interval = setInterval(fetchRuns, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshKey]);

  // Group runs by chain (using chainRunId)
  const chains = [];
  const chainMap = new Map();
  for (const run of runs) {
    // Check if this is a chain-level run (has "Agent Orchestrator" agent)
    if (run.agent === 'Agent Orchestrator') {
      chains.push({ ...run, children: [] });
      chainMap.set(run.id, chains[chains.length - 1]);
    }
  }

  // Assign child runs to their parent chain
  for (const run of runs) {
    if (run.agent !== 'Agent Orchestrator') {
      // Find the most recent chain that started before this run
      const parent = chains.find(
        (c) => c.startedAt <= run.startedAt && (!c.completedAt || c.completedAt >= run.startedAt)
      );
      if (parent) {
        parent.children.push(run);
      } else {
        // Standalone agent run — show as its own entry
        chains.push({ ...run, children: [] });
      }
    }
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>AI Agent Activity</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Real-time execution history of all AI agents. Every decision and action is recorded.
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading && runs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Loading agent activity...
        </div>
      )}

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          color: '#dc2626',
          fontSize: '0.85rem',
          marginBottom: '1rem',
        }}>
          Failed to load agent activity: {error}
        </div>
      )}

      {!loading && !error && chains.length === 0 && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '3rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤖</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>No Agent Activity Yet</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
            Upload an invoice to trigger the AI agent chain. Each agent will analyze your data, make decisions, and record its execution here.
          </div>
        </div>
      )}

      {/* Chain timeline */}
      {chains.map((chain) => (
        <div key={chain.id} style={{ marginBottom: '1.5rem' }}>
          {/* Chain header (orchestrator) */}
          <AgentRunCard run={chain} />

          {/* Child agent runs */}
          {chain.children.length > 0 && (
            <div style={{ marginLeft: '2rem', borderLeft: '2px dashed var(--border-color)', paddingLeft: '0.75rem' }}>
              {chain.children.map((child) => (
                <AgentRunCard key={child.id} run={child} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
