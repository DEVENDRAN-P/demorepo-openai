import React, { useState, useEffect } from 'react';
import { getUserBills } from '../services/firebaseDataService';

const BUSINESSES = [
  { id: 'apex_retailers', name: 'Apex Retailers', gstin: '29ABCDE1234F2Z5', state: 'Karnataka', type: 'Retail & Distribution' },
  { id: 'nexgen_solutions', name: 'NexGen Software Solutions', gstin: '27XYZAB5678C1Z0', state: 'Maharashtra', type: 'IT Services & Consulting' },
  { id: 'phoenix_logistics', name: 'Phoenix Logistics', gstin: '07AAACP1234A1Z9', state: 'Delhi', type: 'Transport & Warehouse' }
];

function AIFinanceAgent({ user }) {
  const [bills, setBills] = useState([]);
  const [activeBusiness, setActiveBusiness] = useState(() => {
    const saved = localStorage.getItem('activeBusinessId') || 'apex_retailers';
    return BUSINESSES.find(b => b.id === saved) || BUSINESSES[0];
  });

  const [agentInput, setAgentInput] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [actionLogs, setActionLogs] = useState([
    { title: "System Initialized", desc: "AI Accountant Agent loaded and linked to Firebase.", type: "success", time: "Just now" }
  ]);

  const [activePlan, setActivePlan] = useState(() => {
    return localStorage.getItem('saas_active_plan') || 'free';
  });

  const [reconciliationStatus, setReconciliationStatus] = useState('pending');

  useEffect(() => {
    const handlePlanChanged = () => {
      setActivePlan(localStorage.getItem('saas_active_plan') || 'free');
    };
    window.addEventListener('planChanged', handlePlanChanged);
    return () => window.removeEventListener('planChanged', handlePlanChanged);
  }, []);

  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || '';

  // Synchronize entity switcher
  useEffect(() => {
    const handleBusinessChanged = (e) => {
      if (e.detail?.businessId) {
        const match = BUSINESSES.find(b => b.id === e.detail.businessId);
        if (match) {
          setActiveBusiness(match);
          setAgentResponse('');
          setActionLogs(prev => [
            { title: "Workspace Switched", desc: `Switched focus to ${match.name}. Loading ledger...`, type: "info", time: "Just now" },
            ...prev
          ]);
        }
      }
    };
    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => window.removeEventListener('businessChanged', handleBusinessChanged);
  }, []);

  // Fetch bills
  useEffect(() => {
    if (!user?.uid) return;
    getUserBills(user.uid)
      .then(fetched => {
        const filtered = fetched.filter(b => {
          if (!b.businessId) return activeBusiness.id === 'apex_retailers';
          return b.businessId === activeBusiness.id;
        });
        setBills(filtered);
      })
      .catch(e => console.error(e));
  }, [user?.uid, activeBusiness]);

  const totalBillsUploaded = bills.length;
  const pendingFilings = bills.filter(b => !b.filed).length;
  const totalGSTAmount = bills.reduce((sum, b) => sum + (b.taxAmount || 0), 0);
  const totalInvoiceAmount = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const revenue = totalInvoiceAmount * 1.5;
  const expenses = totalInvoiceAmount;
  const gstPayable = totalGSTAmount * 1.5;
  const inputTaxCredit = totalGSTAmount;
  const netPayable = Math.max(0, gstPayable - inputTaxCredit);

  const handleAgentSubmit = async (e, customPrompt) => {
    if (e) e.preventDefault();
    const promptText = customPrompt || agentInput;
    if (!promptText.trim()) return;

    // Feature gating checks for AI Queries
    const queryLower = promptText.toLowerCase();
    if (activePlan === 'free') {
      if (queryLower.includes('forecast') || queryLower.includes('audit') || queryLower.includes('duplicate') || queryLower.includes('risk') || queryLower.includes('reconcile') || queryLower.includes('prepare') || queryLower.includes('saving')) {
        alert("⚠️ Premium Feature: Detailed financial forecasting, tax auditing, returns preparation, and recommendations are reserved for the Pro and Business Tiers. Please upgrade to run this accounting command.");
        return;
      }
    }

    setAgentLoading(true);
    setAgentResponse('');
    
    // Add to activity logs
    setActionLogs(prev => [
      { title: "Query Submitted", desc: `Executing: "${promptText}"`, type: "info", time: "Just now" },
      ...prev
    ]);

    try {
      // Compile real invoice context for LLM prompt inject
      const invoiceSummaries = bills.map((b, idx) => 
        `Invoice #${b.invoiceNumber || 'N/A'}: Date=${b.invoiceDate?.split('T')[0]}, Supplier=${b.supplierName}, GSTIN=${b.gstin}, Amount=₹${b.amount}, Tax=₹${b.taxAmount} (${b.taxPercent}%), Total=₹${b.totalAmount}, Category=${b.expenseType || b.category}, Filed=${b.filed ? 'Yes' : 'No'}`
      ).join('\n');

      let systemPrompt = "";
      if (activePlan === 'free') {
        systemPrompt = `You are "GST Buddy AI Assistant", the basic conversational query bot for "${activeBusiness.name}" (GSTIN: ${activeBusiness.gstin}, State: ${activeBusiness.state}, Business Type: ${activeBusiness.type}).
You are in Level 1 — AI Assistant Mode. You can ONLY answer basic questions about the current data and transactions.
Do NOT output proactive accounting advice, category audits, duplicate invoice warnings, or next action checklists.
Keep answers concise, direct, and polite.

Current Data Summary:
- Transactions: ${totalBillsUploaded}
- Outstanding returns: ${pendingFilings}
- Outward revenue: ₹${revenue.toLocaleString()}
- Inward expenses: ₹${expenses.toLocaleString()}
- GST Paid: ₹${totalGSTAmount.toLocaleString()}
- ITC: ₹${inputTaxCredit.toLocaleString()}
- Net GST Payable: ₹${netPayable.toLocaleString()}

Transactions list:
${invoiceSummaries || "No transactions recorded."}`;
      } else if (activePlan === 'pro') {
        systemPrompt = `You are "GST Buddy AI Accountant", the senior CFO consultant for "${activeBusiness.name}" (GSTIN: ${activeBusiness.gstin}, State: ${activeBusiness.state}, Business Type: ${activeBusiness.type}).
You are in Level 2 — AI Accountant Mode (Pro Plan). You perform detailed revenue/expense auditing, explain GST categories, detect anomalies, and suggest optimizations.
Provide structured data-driven analysis and next actions.

Current Data:
- Transactions: ${totalBillsUploaded}
- Outstanding returns: ${pendingFilings}
- Revenue: ₹${revenue.toLocaleString()}
- Expenses: ₹${expenses.toLocaleString()}
- GST Paid: ₹${totalGSTAmount.toLocaleString()}
- ITC: ₹${inputTaxCredit.toLocaleString()}
- Net GST Payable: ₹${netPayable.toLocaleString()}

Transactions:
${invoiceSummaries || "No transactions."}

Structure your response with:
- **Executive Summary**
- **Data-Driven Analysis & Breakdown**
- **Suggested Next Actions**`;
      } else {
        systemPrompt = `You are "GST Buddy AI Operations Agent", the autonomous financial compliance monitor for "${activeBusiness.name}" (GSTIN: ${activeBusiness.gstin}, State: ${activeBusiness.state}, Business Type: ${activeBusiness.type}).
You are in Level 3 — AI Operations Mode (Business Plan). You continuously monitor records, detect compliance risks, suggest automated workflows, and outline step-by-step resolution tasks.

Current Data:
- Transactions: ${totalBillsUploaded}
- Outstanding returns: ${pendingFilings}
- Revenue: ₹${revenue.toLocaleString()}
- Expenses: ₹${expenses.toLocaleString()}
- GST Paid: ₹${totalGSTAmount.toLocaleString()}
- ITC: ₹${inputTaxCredit.toLocaleString()}
- Net GST Payable: ₹${netPayable.toLocaleString()}

Transactions:
${invoiceSummaries || "No transactions."}

If a transaction has issues (e.g. missing GSTIN, mismatching sums, non-filed status), highlight it and outline a reconciliation workflow.
Structure your response with:
- **Operations & Risk Alert**
- **Detailed Compliance Breakdown**
- **Initiated / Recommended Automated Workflows**`;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: promptText }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 1400,
        }),
      });

      if (!response.ok) throw new Error('Groq connection failed');
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from API. This usually happens if the request is blocked by a corporate firewall, a captive network login page, or an active Service Worker from another app on localhost. Please try using an Incognito window or clearing your browser cache and site data.');
      }
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      setAgentResponse(content);
      setAgentInput('');
      
      setActionLogs(prev => [
        { title: "Query Completed", desc: "AI Accountant generated reports successfully.", type: "success", time: "Just now" },
        ...prev
      ]);
    } catch (err) {
      console.error(err);
      setAgentResponse('⚠️ The AI Accountant encountered a connection issue. Verification steps:\n1. Verify your network connection.\n2. Ensure a valid REACT_APP_GROQ_API_KEY is configured in Settings.');
      setActionLogs(prev => [
        { title: "Execution Failed", desc: "API connection timeout or key error.", type: "error", time: "Just now" },
        ...prev
      ]);
    } finally {
      setAgentLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>AI Accountant Agent</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Consult your Senior AI CFO. Execute real-time financial task queries, check tax compliance liabilities, and draft reports instantly.
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
            {activePlan === 'free' && "Answers direct questions using current data. Upgrade to Pro to unlock proactive audit suggestions."}
            {activePlan === 'pro' && "Proactively audits transactions, explains tax anomalies, and drafts GSTR returns."}
            {activePlan === 'business' && "Continuous compliance monitoring, automated risk detection, and one-click reconciliation workflows."}
          </span>
        </div>
      </div>

      {/* Suggested Quick Commands */}
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Quick Executive Queries</span>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', whiteSpace: 'nowrap' }}>
          <button onClick={(e) => handleAgentSubmit(e, "Prepare this month's GST")} className="chip-interactive">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            Prepare GST Return</button>
          <button onClick={(e) => handleAgentSubmit(e, "Show current tax liability and ITC credit available")} className="chip-interactive">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            Show Tax Liability</button>
          <button onClick={(e) => handleAgentSubmit(e, "Analyze expenses by categories and supplier concentrations")} className="chip-interactive">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Analyze Expenses</button>
          <button onClick={(e) => handleAgentSubmit(e, "Check for duplicate invoices or missing GSTIN numbers")} className="chip-interactive">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Find Duplicate Invoices</button>
          <button onClick={(e) => handleAgentSubmit(e, "Generate executive report summary of business health")} className="chip-interactive">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
            Generate Executive Report</button>
          <button onClick={(e) => handleAgentSubmit(e, "Forecast next month's GST filing liability based on current trend")} className="chip-interactive">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            Forecast Next Month's GST</button>
        </div>
      </div>

      {/* Agent Terminal Workspace */}
      <div className="grid" style={{ gridTemplateColumns: '1.75fr 1.25fr', gap: '2rem' }}>
        
        {/* Terminal Input & Output */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '0.25rem' }}>Accountant Terminal</h3>
          
          <form onSubmit={handleAgentSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
            <input 
              type="text" 
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              placeholder="Enter accounting task or question (e.g. 'Analyze our electricity bills tax component')..."
              style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', fontSize: '0.85rem', outline: 'none' }}
              disabled={agentLoading}
            />
            <button type="submit" disabled={agentLoading} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.85rem' }}>
              {agentLoading ? 'Executing...' : 'Run Query'}
            </button>
          </form>

          {agentLoading && (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mb-3"></div>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Executing Accounting Commands...</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Querying invoice ledgers, checking compliance rule-base, and drafting summaries.</span>
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
              <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--theme-secondary-light)', display: 'inline-flex' }}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>CFO Audit & Executive Analysis</span>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(agentResponse);
                    alert('Analysis copied to clipboard!');
                  }}
                  className="btn btn-outline" 
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', marginLeft: 'auto' }}
                >
                  Copy Report
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Real-Time Business Context</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.775rem' }}>
              <div style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Linked Entity</span>
                <strong>{activeBusiness.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ledger Invoices</span>
                <strong>{totalBillsUploaded} Invoices</strong>
              </div>
              <div style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Calculated Outward GST</span>
                <strong>₹{gstPayable.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Claimable ITC</span>
                <strong>₹{inputTaxCredit.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyBetween: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Net GST Payable</span>
                <strong style={{ color: netPayable > 0 ? 'var(--warning)' : 'var(--success)' }}>₹{netPayable.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Autonomous Operations Agent Widget */}
          <div className="glass-panel" style={{ 
            borderRadius: 'var(--radius-xl)', 
            padding: '1.5rem', 
            border: activePlan === 'business' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {activePlan !== 'business' && (
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
                <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>Autonomous Operations Agent</strong>
                <p style={{ fontSize: '0.7rem', color: '#cbd5e1', margin: '0.25rem 0 0.75rem 0', maxWidth: '85%', lineHeight: '1.4' }}>
                  Enable background compliance monitoring audits, risk alerts, and automated vendor reconciliation workflows.
                </p>
                <button 
                  onClick={() => {
                    localStorage.setItem('selectedPlan', 'business');
                    window.location.href = '/pricing';
                  }}
                  className="btn btn-primary" 
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.7rem', background: 'var(--primary-600)' }}
                >
                  Upgrade to Business
                </button>
              </div>
            )}
            
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--success)' }}>⚡</span> Autonomous Compliance Alerts
            </h3>
            
            <div style={{ background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.775rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 700 }}>
                <span style={{ color: 'var(--error)' }}><span style={{ color: 'var(--error)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> GSTIN Mismatch Anomaly</span></span>
                <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem' }}>High Risk</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0.5rem 0', lineHeight: '1.4' }}>
                Invoice <strong>INV-1056</strong> (Supplier: Phoenix Supplies) contains a mismatch between billing GSTIN and GSTR-2B.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>ITC Exposure</span>
                <strong>₹4,820</strong>
              </div>
              
              {reconciliationStatus === 'pending' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button 
                    onClick={() => {
                      setReconciliationStatus('approved');
                      setActionLogs(prev => [
                        { title: "Compliance Action Initiated", desc: "Approved autonomous reconciliation task for INV-1056. Automated compliance agent contacting Phoenix Supplies.", type: "success", time: "Just now" },
                        ...prev
                      ]);
                      setTimeout(() => {
                        setReconciliationStatus('processing');
                        setActionLogs(prev => [
                          { title: "Sending Notification", desc: "Emailed invoice warning letter and discrepancy details to Phoenix Supplies registry.", type: "info", time: "Just now" },
                          ...prev
                        ]);
                        setTimeout(() => {
                          setReconciliationStatus('resolved');
                          setActionLogs(prev => [
                            { title: "Reconciliation Active", desc: "Vendor warning confirmed. Monitoring status logged in Audit Center ledger.", type: "success", time: "Just now" },
                            ...prev
                          ]);
                        }, 2500);
                      }, 1500);
                    }}
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '0.4rem', fontSize: '0.725rem', background: 'var(--success)' }}
                  >
                    Approve Workflow
                  </button>
                  <button 
                    onClick={() => {
                      setReconciliationStatus('ignored');
                      setActionLogs(prev => [
                        { title: "Alert Ignored", desc: "Reconciliation alert for INV-1056 dismissed by operator.", type: "info", time: "Just now" },
                        ...prev
                      ]);
                    }}
                    className="btn btn-outline" 
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.725rem' }}
                  >
                    Ignore
                  </button>
                </div>
              )}
              {reconciliationStatus === 'approved' && (
                <div style={{ color: 'var(--success)', fontStyle: 'italic', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="animate-pulse">⏳</span> Queuing supplier warning letter...
                </div>
              )}
              {reconciliationStatus === 'processing' && (
                <div style={{ color: 'var(--theme-primary-light)', fontStyle: 'italic', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="animate-pulse">⏳</span> Despatching warning email to Phoenix Supplies...
                </div>
              )}
              {reconciliationStatus === 'resolved' && (
                <div style={{ color: 'var(--success)', fontWeight: 700, marginTop: '0.5rem' }}>
                  ✓ Reconciliation task created. Vendor notified.
                </div>
              )}
              {reconciliationStatus === 'ignored' && (
                <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                  Alert dismissed.
                </div>
              )}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', flex: 1 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 1.25rem 0' }}>Agent Audit Logs</h3>
            
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
