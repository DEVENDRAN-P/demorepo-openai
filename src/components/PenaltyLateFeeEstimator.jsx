import React, { useState, useEffect } from 'react';

function PenaltyLateFeeEstimator() {
  const [returnType, setReturnType] = useState('GSTR-3B');
  const [dueDate, setDueDate] = useState('');
  const [actualDate, setActualDate] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [results, setResults] = useState(null);

  const returnTypes = [
    { value: 'GSTR-1', label: 'GSTR-1', feePerDay: 50, maxFee: 10000 },
    { value: 'GSTR-3B', label: 'GSTR-3B', feePerDay: 50, maxFee: 10000 },
    { value: 'NIL', label: 'NIL Return', feePerDay: 20, maxFee: 5000 },
  ];

  const getSelectedReturnType = () => {
    return returnTypes.find(rt => rt.value === returnType) || returnTypes[0];
  };

  const calculatePenalty = () => {
    if (!dueDate || !actualDate || !taxAmount) {
      setResults(null);
      return;
    }

    const due = new Date(dueDate);
    const actual = new Date(actualDate);
    const amount = parseFloat(taxAmount) || 0;

    if (actual <= due) {
      setResults({
        delayDays: 0,
        lateFee: 0,
        interest: 0,
        totalPenalty: 0,
        isTimely: true,
      });
      return;
    }

    const delayMs = actual - due;
    const delayDays = Math.ceil(delayMs / (1000 * 60 * 60 * 24));
    const rt = getSelectedReturnType();

    // Late filing fee calculation
    const lateFee = Math.min(delayDays * rt.feePerDay, rt.maxFee);

    // Interest calculation (18% per annum, per day)
    // Interest = (Tax Amount × 18% × Delay Days) / 365
    const interest = (amount * 0.18 * delayDays) / 365;

    // Total penalty
    const totalPenalty = lateFee + interest;

    setResults({
      delayDays,
      lateFee,
      interest,
      totalPenalty,
      isTimely: false,
    });
  };

  useEffect(() => {
    calculatePenalty();
  }, [returnType, dueDate, actualDate, taxAmount]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const rt = getSelectedReturnType();

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <div className="card-title-icon">⚖️</div>
          <span>Penalty & Late Fee Estimator</span>
        </h2>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.25rem',
        padding: '0.5rem 0',
      }}>
        {/* Return Type Selection */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
          }}>
            GST Return Type
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
          }}>
            {returnTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setReturnType(type.value)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: returnType === type.value
                    ? '2px solid var(--primary-500)'
                    : '2px solid var(--border-color)',
                  background: returnType === type.value
                    ? 'var(--primary-50)'
                    : 'var(--bg-secondary)',
                  color: returnType === type.value
                    ? 'var(--primary-700)'
                    : 'var(--text-primary)',
                  fontWeight: returnType === type.value ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Inputs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
            }}>
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.9375rem',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
            }}>
              Actual Filing Date
            </label>
            <input
              type="date"
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.9375rem',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Tax Amount Input */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
          }}>
            Tax Amount Payable (₹)
          </label>
          <input
            type="number"
            value={taxAmount}
            onChange={(e) => setTaxAmount(e.target.value)}
            placeholder="Enter tax amount"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.9375rem',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Results Summary */}
        {results && (
          <div style={{
            marginTop: '0.5rem',
            padding: '1.25rem',
            background: results.isTimely
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
            borderRadius: 'var(--radius-lg)',
            border: `2px solid ${results.isTimely ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          }}>
            {results.isTimely ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#16a34a',
                fontWeight: 600,
                fontSize: '1.125rem',
              }}>
                <span style={{ fontSize: '1.5rem' }}>✅</span>
                <span>Filed on time - No penalty applicable</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Delay Period
                  </span>
                  <span style={{
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    color: '#dc2626',
                  }}>
                    {results.delayDays} day{results.delayDays !== 1 ? 's' : ''}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Late Filing Fee
                    <span style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      color: 'var(--text-tertiary)',
                      marginTop: '0.25rem',
                    }}>
                      ₹{rt.feePerDay}/day × {results.delayDays} days (Max: ₹{rt.maxFee})
                    </span>
                  </span>
                  <span style={{
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    color: '#dc2626',
                  }}>
                    {formatCurrency(results.lateFee)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Interest on Late Payment
                    <span style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      color: 'var(--text-tertiary)',
                      marginTop: '0.25rem',
                    }}>
                      18% per annum × {results.delayDays} days
                    </span>
                  </span>
                  <span style={{
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    color: '#dc2626',
                  }}>
                    {formatCurrency(results.interest)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.75rem',
                  borderTop: '2px solid var(--border-color)',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
                    Total Penalty Payable
                  </span>
                  <span style={{
                    fontWeight: 800,
                    fontSize: '1.5rem',
                    color: '#dc2626',
                  }}>
                    {formatCurrency(results.totalPenalty)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{
          padding: '0.75rem 1rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          borderLeft: '3px solid var(--warning-500)',
        }}>
          <p style={{
            margin: 0,
            fontSize: '0.8125rem',
            color: 'var(--text-tertiary)',
            fontStyle: 'italic',
          }}>
            ⚠️ Estimates are based on current GST rules. Actual penalties may vary. Consult a tax professional for accurate calculations.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PenaltyLateFeeEstimator;
