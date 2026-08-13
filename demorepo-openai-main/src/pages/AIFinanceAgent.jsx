import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserBills } from '../services/firebaseDataService';
import { aiChat } from '../services/aiService';
import { fetchActivePlan } from '../services/subscriptionService';
import { runFullAnalysis } from '../services/agentService';
import {
  collection,
  query,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

function AIFinanceAgent({ user }) {
  const { t, i18n } = useTranslation();
  const [bills, setBills] = useState([]);
  const [activeBusiness, setActiveBusiness] = useState(() => {
    try {
      const raw = localStorage.getItem('activeBusinessProfile');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  });

  const [agentInput, setAgentInput] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);

  // Real agent execution state
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState('');

  // Entitlement is resolved from the server — never trusted from localStorage.
  const [activePlan, setActivePlan] = useState('free');

  // Logs of real events that happened in this session.
  const [actionLogs, setActionLogs] = useState([]);

  const pushLog = useCallback((title, desc, type = 'info') => {
    setActionLogs((prev) => [
      { title, desc, type, time: 'Just now' },
      ...prev,
    ].slice(0, 20));
  }, []);

  // Synchronize entity switcher — reads updated profile from localStorage
  useEffect(() => {
    const handleBusinessChanged = () => {
      try {
        const raw = localStorage.getItem('activeBusinessProfile');
        if (raw) setActiveBusiness(JSON.parse(raw));
      } catch (e) {}
      setAgentResponse('');
    };
    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => window.removeEventListener('businessChanged', handleBusinessChanged);
  }, []);

  // Fetch plan from the server (single source of truth for entitlements)
  useEffect(() => {
    fetchActivePlan().then((plan) => setActivePlan(plan));
  }, []);

  // Fetch bills
  useEffect(() => {
    if (!user?.uid) return;
    getUserBills(user.uid)
      .then((fetched) => {
        const filtered = fetched.filter((b) => {
          if (!activeBusiness?.id) return true;
          if (!b.businessId) return true;
          return b.businessId === activeBusiness.id;
        });
        setBills(filtered);
      })
      .catch((e) => console.error(e));
  }, [user?.uid, activeBusiness]);

  // Fetch real compliance alerts produced by the agent orchestrator
  const loadAlerts = useCallback(async () => {
    if (!user?.uid) return;
    setAlertsLoading(true);
    try {
      const q = query(
        collection(db, 'users', user.uid, 'alerts'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(10)
      );
      const snap = await getDocs(q);
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setAlerts(items);
    } catch (e) {
      console.warn('Could not load compliance alerts:', e);
    } finally {
      setAlertsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Resolve an alert (persisted to Firestore — real action, not simulated)
  const handleResolveAlert = async (alertId) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'alerts', alertId), {
        read: true,
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
      });
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true, status: 'resolved' } : a)));
      pushLog('Alert Resolved', 'Compliance alert marked as handled in the audit ledger.', 'success');
    } catch (e) {
      console.error('Failed to resolve alert:', e);
      pushLog('Action Failed', 'Could not update the alert. Please try again.', 'error');
    }
  };

  // Run the real agent chain (persists agentRuns server-side)
  const handleRunAgents = async () => {
    setRunningAnalysis(true);
    setAnalysisMessage('Running compliance, forecast, and intelligence agents on your invoices...');
    try {
      const businessId = activeBusiness?.id || localStorage.getItem('activeBusinessId') || null;
      const result = await runFullAnalysis(businessId);
      const executed = result.results || [];
      const ok = executed.filter((r) => r.status === 'completed').length;
      pushLog(
        'Agent Chain Executed',
        `${ok} of ${executed.length} agents completed. Results are stored in your agent activity log.`,
        ok === executed.length ? 'success' : 'warning'
      );
      setAnalysisMessage(
        ok === executed.length
          ? `All ${ok} agents completed successfully. Review decisions in Agent Activity.`
          : 'Some agents could not complete. Check Agent Activity for details.'
      );
      loadAlerts();
    } catch (err) {
      console.error('Agent chain failed:', err);
      setAnalysisMessage(err?.message || 'Agent chain failed. Please try again.');
      pushLog('Agent Chain Failed', 'The agent orchestrator could not complete the run.', 'error');
    } finally {
      setRunningAnalysis(false);
    }
  };

  const totalBillsUploaded = bills.length;
  const totalGSTAmount = bills.reduce((sum, b) => sum + (b.taxAmount || 0), 0);

  // [DETERMINISTIC] Figures from actual invoice data — no multipliers
  const inputTaxCredit = totalGSTAmount;
  const gstPayable = totalGSTAmount;
  const netPayable = Math.max(0, gstPayable - inputTaxCredit);

  const handleAgentSubmit = async (e, customPrompt) => {
    if (e) e.preventDefault();
    const promptText = customPrompt || agentInput;
    if (!promptText.trim()) return;

    setAgentLoading(true);
    setAgentResponse('');
    pushLog('Query Submitted', `Executing: "${promptText}"`, 'info');

    try {
      // Compile invoice summary for server-side context
      const invoiceSummary = bills.length === 0
        ? 'No invoices loaded.'
        : bills.slice(0, 40).map((b) =>
            `- Inv #${b.invoiceNumber || 'N/A'}: Date=${b.invoiceDate?.split('T')[0] || '?'}, Supplier=${b.supplierName || '?'}, GSTIN=${b.gstin || 'missing'}, Amount=₹${b.amount || 0}, Tax=₹${b.taxAmount || 0} (${b.taxPercent || 0}%), Total=₹${b.totalAmount || 0}, Category=${b.expenseType || b.category || '?'}, Filed=${b.filed ? 'Yes' : 'No'}`
          ).join('\n');

      // Use server-side Gemini via /api/ai - the server handles system prompts and context
      const result = await aiChat({
        messages: [{ role: 'user', content: promptText }],
        business: {
          name: activeBusiness?.name,
          gstin: activeBusiness?.gstin,
          state: activeBusiness?.state,
          type: activeBusiness?.type,
        },
        invoiceSummary,
        language: i18n.language,
      });

      setAgentResponse(result.reply || 'No response generated.');
      setAgentInput('');
      pushLog('Query Completed', 'The AI Accountant returned an analysis.', 'success');
    } catch (err) {
      console.error(err);
      setAgentResponse('⚠️ The AI Accountant encountered a connection issue. Please verify your network connection and sign-in session.');
      pushLog('Execution Failed', 'API connection timeout or authentication error.', 'error');
    } finally {
      setAgentLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{t('AI Accountant Agent')}</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            {t('Consult your Senior AI CFO. Execute real-time financial task queries, check tax compliance liabilities, and draft reports instantly.')}
          </p>
        </div>

        {/* AI Autonomy Badge */}
        <div style={{
          background: activePlan === 'free' ? 'rgba(148, 163, 184, 0.1)' : activePlan === 'pro' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: activePlan === 'free' ? '1px solid rgba(148, 163, 184, 0.2)' : activePlan === 'pro' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '350px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: activePlan === 'free' ? '#94a3b8' : activePlan === 'pro' ? 'var(--theme-primary)' : 'var(--success)' 
            }}></span>
            <strong style={{ 
              fontSize: '0.8rem', 
              color: activePlan === 'free' ? '#94a3b8' : activePlan === 'pro' ? 'var(--theme-primary-light)' : 'var(--success)' 
            }}>
              {activePlan === 'free' ? 'Level 1: AI Assistant' : activePlan === 'pro' ? 'Level 2: AI Accountant' : 'Level 3: AI Operations Agent'}
            </strong>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.3', display: 'block' }}>
            {activePlan === 'free' && t('ai_finance.free_plan_desc')}
            {activePlan === 'pro' && "Proactively audits transactions, explains tax anomalies, and drafts GSTR returns."}
            {activePlan === 'business' && "Continuous compliance monitoring, automated risk detection, and one-click reconciliation workflows."}
          </span>
        </div>
      </div>

      {/* Suggested Quick Commands */}
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{t('Quick Executive Queries')}</span>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', whiteSpace: 'nowrap' }}>
          <button onClick={(e) => handleAgentSubmit(e, "Prepare this month's GST")} className="chip-interactive">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            {t('Prepare GST Return')}</button>
          <button onClick={(e) => handleAgentSubmit(e, "Show current tax liability and ITC credit available")} className="chip-interactive">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            {t('Show Tax Liability')}</button>
          <button onClick={(e) => handleAgentSubmit(e, "Analyze expenses by categories and supplier concentrations")} className="chip-interactive">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            {t('Analyze Expenses')}</button>
          <button onClick={(e) => handleAgentSubmit(e, "Check for duplicate invoices or missing GSTIN numbers")} className="chip-interactive">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {t('Find Duplicate Invoices')}</button>
          <button onClick={(e) => handleAgentSubmit(e, "Generate executive report summary of business health")} className="chip-interactive">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
            {t('Generate Executive Report')}</button>
          <button onClick={(e) => handleAgentSubmit(e, "Forecast next month's GST filing liability based on current trend")} className="chip-interactive">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            {t("Forecast Next Month's GST")}</button>
        </div>
      </div>

      {/* Agent Terminal Workspace */}
      <div className="grid" style={{ gridTemplateColumns: '1.75fr 1.25fr', gap: '2rem' }}>
        
        {/* Terminal Input & Output */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '0.25rem' }}>{t('Accountant Terminal')}</h3>
          
          <form onSubmit={handleAgentSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
            <input 
              type="text" 
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              placeholder={t('ai_finance.input_placeholder')}
              style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', fontSize: '0.85rem', outline: 'none' }}
              disabled={agentLoading}
            />
            <button type="submit" disabled={agentLoading} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.85rem' }}>
              {agentLoading ? t('ai_finance.executing_short') : t('ai_finance.run_query')}
            </button>
          </form>

          {agentLoading && (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mb-3"></div>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{t('ai_finance.executing')}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t('ai_finance.executing_sub')}</span>
            </div>
          )}

          {agentResponse && !agentLoading && (
            <div style={{ 
              padding: '1.5rem', 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-lg)', 
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--theme-secondary-light)', display: 'inline-flex' }}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{t('ai_finance.cfo_analysis')}</span>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(agentResponse);
                    alert(t('ai_finance.copied'));
                  }}
                  className="btn btn-outline" 
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', marginLeft: 'auto' }}
                >
                  {t('ai_finance.copy_report')}
                </button>
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {agentResponse}
              </div>
            </div>
          )}
        </div>

        {/* Live Logs & Context Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Real Context Summary Widget */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 1rem 0' }}>{t('ai_finance.real_time_context')}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.775rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('ai_finance.linked_entity')}</span>
                <strong>{activeBusiness?.name || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('ai_finance.ledger_invoices')}</span>
                <strong>{totalBillsUploaded} Invoices</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('ai_finance.outward_gst')}</span>
                <strong>₹{gstPayable.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('ai_finance.claimable_itc')}</span>
                <strong>₹{inputTaxCredit.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('ai_finance.net_gst_payable')}</span>
                <strong style={{ color: netPayable > 0 ? 'var(--warning)' : 'var(--success)' }}>₹{netPayable.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Real Compliance Alerts from the Agent Orchestrator */}
          <div className="glass-panel" style={{ 
            borderRadius: 'var(--radius-xl)', 
            padding: '1.5rem', 
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--success)' }}>⚡</span> {t('ai_finance.compliance_alerts')}
            </h3>

            {activePlan !== 'business' && activePlan !== 'pro' && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(3px)',
                borderRadius: 'var(--radius-xl)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '1.25rem',
                zIndex: 10
              }}>
                <span style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>{t('ai_finance.agent_monitoring')}</strong>
                <p style={{ fontSize: '0.7rem', color: '#cbd5e1', margin: '0.25rem 0 0.75rem 0', maxWidth: '85%', lineHeight: '1.4' }}>
                  {t('ai_finance.upgrade_to_run')}
                </p>
                <button 
                  onClick={() => {
                    localStorage.setItem('selectedPlan', 'pro');
                    window.location.href = '/pricing';
                  }}
                  className="btn btn-primary" 
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.7rem' }}
                >
                  {t('ai_finance.upgrade_to_pro')}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={handleRunAgents}
                disabled={runningAnalysis}
                className="btn btn-primary"
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.75rem', width: '100%' }}
              >
                {runningAnalysis ? 'Running agents...' : '▶ Run Compliance & Forecast Agents'}
              </button>

              {analysisMessage && (
                <div style={{ fontSize: '0.7rem', color: 'var(--theme-secondary-light)', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', lineHeight: '1.4' }}>
                  {analysisMessage}
                </div>
              )}

              {alertsLoading && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.75rem' }}>
                  Loading alerts...
                </div>
              )}

              {!alertsLoading && alerts.length === 0 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.75rem' }}>
                  No compliance alerts yet. Upload invoices and run the agents to start monitoring.
                </div>
              )}

              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    background: 'var(--bg-primary)',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '8px',
                    border: `1px solid ${
                      alert.severity === 'critical' || alert.severity === 'high'
                        ? 'rgba(239, 68, 68, 0.35)'
                        : 'var(--border-color)'
                    }`,
                    fontSize: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{
                      fontWeight: 700,
                      color: alert.severity === 'critical' || alert.severity === 'high' ? 'var(--error)' : 'var(--text-primary)',
                      textTransform: 'capitalize',
                    }}>
                      {alert.type?.replace(/_/g, ' ')}
                    </span>
                    <span style={{
                      background: alert.severity === 'critical' || alert.severity === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: alert.severity === 'critical' || alert.severity === 'high' ? 'var(--error)' : 'var(--warning)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                    }}>
                      {alert.severity || 'medium'} Risk
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.35rem 0', lineHeight: '1.4' }}>
                    {alert.message}
                  </p>
                  {alert.status !== 'resolved' && (
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="btn btn-outline"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.65rem' }}
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', flex: 1 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 1.25rem 0' }}>{t('Agent Audit Logs')}</h3>
            
            {actionLogs.length === 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                Actions you run here will appear in this log. Full agent execution history is available under Agent Activity.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.75rem' }}>
              {actionLogs.map((log, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.75rem', position: 'relative' }}>
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    background: log.type === 'error' ? 'var(--error)' : log.type === 'success' ? 'var(--success)' : 'var(--theme-secondary)',
                    marginTop: '3px',
                    flexShrink: 0 
                  }}></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{log.title}</strong>
                    <span style={{ color: 'var(--text-secondary)', marginTop: '0.125rem', lineHeight: '1.4' }}>{log.desc}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem', marginTop: '0.25rem' }}>{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default AIFinanceAgent;
