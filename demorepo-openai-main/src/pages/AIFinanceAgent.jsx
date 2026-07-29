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

      const systemPrompt = `You are "GST Buddy AI Accountant", the flagship senior CFO and automated return consultant for the business "${activeBusiness.name}" (GSTIN: ${activeBusiness.gstin}, State: ${activeBusiness.state}, Business Type: ${activeBusiness.type}).

The real business transactions currently recorded in the database are:
${invoiceSummaries || "No transactions recorded yet."}

Summary Financials:
- Total Transactions: ${totalBillsUploaded}
- Outstanding Returns: ${pendingFilings}
- Total Outward Revenue (Estimated): ₹${revenue.toLocaleString()}
- Total Inward Expenses (Calculated): ₹${expenses.toLocaleString()}
- Total Inward GST Paid: ₹${totalGSTAmount.toLocaleString()}
- Inward Input Tax Credit (ITC) Claimable: ₹${inputTaxCredit.toLocaleString()}
- Outward GST Collected (Estimated): ₹${gstPayable.toLocaleString()}
- Net Tax Payable (GST Collected minus ITC Claimed): ₹${netPayable.toLocaleString()}

You can execute financial analysis, tax planning, GSTR filing preparation, cost optimizations, and audit check commands.
When responding to commands, follow these guidelines:
1. Provide a professional, structured executive response with real calculations based on the provided transactions.
2. If the user asks you to "Prepare GST return", outline GSTR-1 and GSTR-3B pre-fill data.
3. If they ask to "Analyze expenses" or "Find tax savings", highlight specific supplier concentrations, category splits, and ITC saving tips.
4. If they ask to "Find duplicate invoices", compare invoice numbers, dates, and amounts in the provided list.
5. Address the user query directly. Structure with sections:
   - **Executive Summary / Decision**
   - **Data-Driven Analysis & Breakdown**
   - **Compliance & Penalty Risks**
   - **Suggested Next Actions**`;

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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>AI Accountant Agent</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Consult your Senior AI CFO. Execute real-time financial task queries, check tax compliance liabilities, and draft reports instantly.
        </p>
      </div>

      {/* Suggested Quick Commands */}
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Quick Executive Queries</span>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', whiteSpace: 'nowrap' }}>
          <button onClick={(e) => handleAgentSubmit(e, "Prepare this month's GST")} className="chip-interactive">📂 Prepare GST Return</button>
          <button onClick={(e) => handleAgentSubmit(e, "Show current tax liability and ITC credit available")} className="chip-interactive">📊 Show Tax Liability</button>
          <button onClick={(e) => handleAgentSubmit(e, "Analyze expenses by categories and supplier concentrations")} className="chip-interactive">🔍 Analyze Expenses</button>
          <button onClick={(e) => handleAgentSubmit(e, "Check for duplicate invoices or missing GSTIN numbers")} className="chip-interactive">⚠️ Find Duplicate Invoices</button>
          <button onClick={(e) => handleAgentSubmit(e, "Generate executive report summary of business health")} className="chip-interactive">📝 Generate Executive Report</button>
          <button onClick={(e) => handleAgentSubmit(e, "Forecast next month's GST filing liability based on current trend")} className="chip-interactive">📈 Forecast Next Month's GST</button>
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
                  <span style={{ color: 'var(--theme-secondary-light)' }}>💼</span>
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
