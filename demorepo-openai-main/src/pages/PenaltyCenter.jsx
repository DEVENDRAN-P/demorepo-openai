import React, { useState } from 'react';

function PenaltyCenter() {
  // Calculator States
  const [returnType, setReturnType] = useState('normal'); // 'nil' or 'normal'
  const [daysDelayed, setDaysDelayed] = useState(0);
  const [netTaxPayable, setNetTaxPayable] = useState(0);
  
  // Calculated outputs
  const [lateFees, setLateFees] = useState(0);
  const [interestCharged, setInterestCharged] = useState(0);
  const [totalPenalty, setTotalPenalty] = useState(0);
  const [hasCalculated, setHasCalculated] = useState(false);

  const calculatePenalties = () => {
    // 1. Calculate Late Fees
    // Section 47 of CGST Act:
    // Nil return late fee: Rs 20 per day (Rs 10 CGST + Rs 10 SGST) capped at Rs 500
    // Normal return late fee: Rs 50 per day (Rs 25 CGST + Rs 25 SGST) capped at Rs 5,000 (standard limit)
    let perDayFee = returnType === 'nil' ? 20 : 50;
    let maxCap = returnType === 'nil' ? 500 : 5000;
    let computedLateFee = Math.min(daysDelayed * perDayFee, maxCap);

    // 2. Calculate Interest under Section 50:
    // Interest is charged at 18% per annum on the net tax liability paid delayed.
    // Formula: Net Tax * (18 / 100) * (Days / 365)
    let computedInterest = 0;
    if (netTaxPayable > 0 && daysDelayed > 0) {
      computedInterest = Math.round(netTaxPayable * 0.18 * (daysDelayed / 365));
    }

    setLateFees(computedLateFee);
    setInterestCharged(computedInterest);
    setTotalPenalty(computedLateFee + computedInterest);
    setHasCalculated(true);
  };

  const penaltyHistory = [
    { period: 'May 2026', type: 'GSTR-3B', delayedDays: 4, feePaid: '₹200', interestPaid: '₹0', status: 'Settled' },
    { period: 'March 2026', type: 'GSTR-1', delayedDays: 12, feePaid: '₹600', interestPaid: '₹148', status: 'Settled' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>GST Penalty Avoidance Center</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Evaluate late filing fees, calculate statutory Section 50 interest, and follow AI suggestions to mitigate compliance penalties.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1.6fr', gap: '2rem' }}>
        
        {/* Interactive Calculator Panel */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🧮 Penalty & Interest Estimator
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Filing Classification</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => setReturnType('nil')} 
                  className={`btn ${returnType === 'nil' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                >
                  Nil Return (GSTR-1/3B)
                </button>
                <button 
                  onClick={() => setReturnType('normal')} 
                  className={`btn ${returnType === 'normal' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                >
                  Normal Return (Taxable)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Days Delayed</label>
                <input 
                  type="number" 
                  value={daysDelayed}
                  onChange={(e) => setDaysDelayed(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Net GST Liability (₹)</label>
                <input 
                  type="number" 
                  value={netTaxPayable}
                  onChange={(e) => setNetTaxPayable(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
                  disabled={returnType === 'nil'}
                />
              </div>
            </div>

            <button onClick={calculatePenalties} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 700 }}>
              Calculate Penalty Liability
            </button>

            {hasCalculated && (
              <div style={{ 
                marginTop: '1rem', 
                borderTop: '1px solid var(--border-color)', 
                paddingTop: '1.25rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.85rem' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Late Filing Fee (CGST+SGST):</span>
                  <strong>₹{lateFees.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Delay Interest (Section 50 @18% p.a.):</span>
                  <strong>₹{interestCharged.toLocaleString()}</strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '1.15rem', 
                  fontWeight: 800, 
                  borderTop: '1px solid var(--border-color)', 
                  paddingTop: '0.75rem',
                  color: totalPenalty > 0 ? 'var(--error)' : 'var(--success)'
                }}>
                  <span>Estimated Total Penalty:</span>
                  <span>₹{totalPenalty.toLocaleString()}</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* AI Penalty Prevention Recommendations & Deadlines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Upcoming Deadline Widget */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', borderLeft: '4px solid var(--error)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>Filing Deadlines Warning</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 1rem 0' }}>
              Statutory filing deadlines for GSTR-1 and GSTR-3B are approaching. Missing these triggers automated late fees.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                <span><strong>GSTR-1</strong> (Sales Outward)</span>
                <span>Due: 11th of Next Month</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>GSTR-3B</strong> (Tax Summary & Payment)</span>
                <span>Due: 20th of Next Month</span>
              </div>
            </div>
          </div>

          {/* AI Penalty Mitigation */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              💡 AI Penalty Mitigation Tips
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.8rem', lineHeight: '1.4' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--success)' }}>✔</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>Verify Nil Status early</strong>: Nil returns still trigger a Rs 20/day penalty. File them via SMS or one-click before due date.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--success)' }}>✔</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>Leverage Net Cash Rule</strong>: Section 50 interest is calculated <em>only</em> on the tax portion paid via Cash Ledger, not via ITC ledger. Utilize input credits to reduce cash payments.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--success)' }}>✔</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>Register automatic email alerts</strong>: Enable GSTR filing notifications in Settings to dispatch reminders 5, 3, and 1 day prior to the deadlines.
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Historical Penalties */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>Historical Late Fee Settlement Log</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Filing Period</th>
              <th style={{ padding: '0.75rem' }}>Form Type</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Days Delayed</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Late Fees Paid</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Interest Paid</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Filing Status</th>
            </tr>
          </thead>
          <tbody>
            {penaltyHistory.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{item.period}</td>
                <td style={{ padding: '0.75rem' }}>{item.type}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.delayedDays} Days</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.feePaid}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.interestPaid}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <span className="badge-premium badge-excellent" style={{ fontSize: '0.65rem' }}>{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default PenaltyCenter;
