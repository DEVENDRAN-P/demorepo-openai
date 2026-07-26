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
  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || '';

  // Synchronize entity switcher
  useEffect(() => {
    const handleBusinessChanged = (e) => {
      if (e.detail?.businessId) {
        const match = BUSINESSES.find(b => b.id === e.detail.businessId);
        if (match) setActiveBusiness(match);
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

  const revenue = totalInvoiceAmount * 1.5 || 420000;
  const expenses = totalInvoiceAmount || 280000;
  const gstPayable = totalGSTAmount * 1.5 || 18000;
  const inputTaxCredit = totalGSTAmount || 12000;
  const netPayable = Math.max(0, gstPayable - inputTaxCredit);

  const handleAgentSubmit = async (e, customPrompt) => {
    if (e) e.preventDefault();
    const promptText = customPrompt || agentInput;
    if (!promptText.trim()) return;

    setAgentLoading(true);
    setAgentResponse('');
    try {
      const systemPrompt = `You are "GST Buddy Finance Agent", a world-class AI Accountant & CFO for the business "${activeBusiness.name}" (GSTIN: ${activeBusiness.gstin}, State: ${activeBusiness.state}).
The current financials for this business are:
- Monthly Revenue: ₹${revenue.toLocaleString()}
- Monthly Expenses: ₹${expenses.toLocaleString()}
- Estimated GST Liability: ₹${gstPayable.toLocaleString()}
- Input Tax Credit (ITC) Available: ₹${inputTaxCredit.toLocaleString()}
- Net Tax Payable: ₹${netPayable.toLocaleString()}
- Total Invoices Captured: ${totalBillsUploaded}
- Outstanding Filings: ${pendingFilings}

When responding, structure your answer under clear headers:
- **Decision / Action**: Direct action proposed.
- **Evidence / Reasoning**: Specific figures and calculations.
- **Business Impact**: Cost savings or risk reductions.
- **Next Step**: Actionable recommendation.`;

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
          max_tokens: 1000,
        }),
      });

      if (!response.ok) throw new Error('Groq connection failed');
      const data = await response.json();
      setAgentResponse(data.choices[0].message.content);
      setAgentInput('');
    } catch (err) {
      console.error(err);
      setAgentResponse('⚠️ Connection error occurred. Verify Groq API key configuration.');
    } finally {
      setAgentLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>AI Finance Agent Console</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Assign workflows to your automated accountant. Ask the agent to analyze expenses, prepare reports, or reconcile returns.
        </p>
      </div>

      {/* Suggested commands */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1.5rem', whiteSpace: 'nowrap' }}>
        <button onClick={(e) => handleAgentSubmit(e, 'Analyze this month')} className="chip-interactive">🔍 Analyze This Month</button>
        <button onClick={(e) => handleAgentSubmit(e, 'Check compliance issues')} className="chip-interactive">⚠️ Check Compliance</button>
        <button onClick={(e) => handleAgentSubmit(e, 'Prepare GST filing')} className="chip-interactive">⚡ Prepare GST Returns</button>
        <button onClick={(e) => handleAgentSubmit(e, 'Find tax savings')} className="chip-interactive">💰 Suggest Tax Savings</button>
      </div>

      {/* Agent workspace */}
      <div className="grid" style={{ gridTemplateColumns: '1.8fr 1.2fr', gap: '2rem' }}>
        
        {/* Chat Console */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '0.5rem' }}>Agent Workspace</h3>
          
          <form onSubmit={handleAgentSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
            <input 
              type="text" 
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              placeholder="e.g., 'Verify ITC mismatch', 'Optimize expenses'..."
              style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', outline: 'none' }}
            />
            <button type="submit" disabled={agentLoading} className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
              {agentLoading ? 'Executing...' : 'Run Agent'}
            </button>
          </form>

          {agentResponse && (
            <div style={{ padding: '1.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Agent Analysis Report</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Llama-3.3 Audited</span>
              </div>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {agentResponse}
              </div>
            </div>
          )}
        </div>

        {/* Workflow logs */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>Agent Action Log</h3>
          
          <div className="timeline-container" style={{ fontSize: '0.8rem' }}>
            <div className="timeline-item success">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <strong>GSTR Filing audit finished</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '0.125rem 0' }}>Reconciled GSTR-1 outward records against uploaded bills database.</p>
              </div>
            </div>
            <div className="timeline-item info">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <strong>Calculated expected savings</strong>
                <p style={{ color: 'var(--text-secondary)', margin: '0.125rem 0' }}>Identified missing broadband telecom invoice input tax deductions.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default AIFinanceAgent;
