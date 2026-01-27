import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import ReminderPanel from '../components/ReminderPanel';

// SVG Icons - matching navbar style
const IconUploadCloud = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconDocuments = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="4" rx="1" />
    <path d="M9 4H5a2 2 0 0 0-2 2v13a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6a2 2 0 0 0-2-2h-4" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="15" y2="16" />
  </svg>
);

const IconBarChart = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="3" x2="3" y2="21" />
    <line x1="3" y1="21" x2="21" y2="21" />
    <rect x="7" y="10" width="3" height="7" />
    <rect x="12" y="6" width="3" height="11" />
    <rect x="17" y="13" width="3" height="4" />
  </svg>
);

const IconRobot = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2" ry="2" />
    <line x1="3" y1="11" x2="21" y2="11" />
    <circle cx="8" cy="14.5" r="1" fill="white" />
    <circle cx="12" cy="14.5" r="1" fill="white" />
    <circle cx="16" cy="14.5" r="1" fill="white" />
    <path d="M7 7V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3" />
  </svg>
);

function Dashboard({ user, setUser }) {
  const { t } = useTranslation();
  const [filingStatus, setFilingStatus] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [stats, setStats] = useState({ totalBills: 0, pendingFiling: 0, totalGST: 0, costSavings: 0 });

  // Calculate cost savings from bills
  const calculateCostSavings = (bills) => {
    // Cost savings = total invoice amount * automation savings rate (6%)
    const totalInvoiceAmount = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    const automationSavingsRate = 0.06; // 6% savings from automated GST calculation and filing
    return Math.round(totalInvoiceAmount * automationSavingsRate);
  };

  useEffect(() => {
    // Load real user data
    const bills = JSON.parse(localStorage.getItem('bills') || '[]');

    // Calculate stats
    const totalGST = bills.reduce((sum, bill) => sum + (bill.taxAmount || 0), 0);
    const costSavings = calculateCostSavings(bills);

    setStats({
      totalBills: bills.length,
      pendingFiling: bills.filter(b => !b.filed).length,
      totalGST: totalGST,
      costSavings: costSavings,
    });

    // Generate filing status from actual data
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const filings = [];
    for (let i = 0; i < 3; i++) {
      const month = (currentMonth - i + 12) % 12;
      const year = currentMonth - i < 0 ? currentYear - 1 : currentYear;
      const monthName = months[month];
      const monthBills = bills.filter(b => {
        const billDate = new Date(b.invoiceDate);
        return billDate.getMonth() === month && billDate.getFullYear() === year;
      });

      filings.push({
        month: `${monthName} ${year}`,
        status: i === 0 ? 'pending' : (monthBills.length > 0 ? 'filed' : 'upcoming'),
        dueDate: new Date(year, month + 1, 20).toISOString().split('T')[0],
        billCount: monthBills.length,
        amount: monthBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
      });
    }
    setFilingStatus(filings);

    // Generate reminders
    const newReminders = [];
    if (bills.filter(b => !b.filed).length > 0) {
      newReminders.push({
        type: 'warning',
        title: 'GSTR-3B Filing Due',
        message: `You have ${bills.filter(b => !b.filed).length} unconfirmed bills. File by ${new Date(currentYear, currentMonth + 1, 20).toLocaleDateString()}`,
      });
    }
    if (bills.length === 0) {
      newReminders.push({
        type: 'info',
        title: 'Upload Your First Bill',
        message: 'Start by uploading your first invoice to begin GST compliance tracking',
      });
    }
    setReminders(newReminders);

    // Listen for storage changes (bills updated in another tab or window)
    const handleStorageChange = () => {
      const updatedBills = JSON.parse(localStorage.getItem('bills') || '[]');
      const updatedTotalGST = updatedBills.reduce((sum, bill) => sum + (bill.taxAmount || 0), 0);
      const updatedCostSavings = calculateCostSavings(updatedBills);

      setStats({
        totalBills: updatedBills.length,
        pendingFiling: updatedBills.filter(b => !b.filed).length,
        totalGST: updatedTotalGST,
        costSavings: updatedCostSavings,
      });
    };

    // Listen for custom bill update event (within same window)
    const handleBillUpdated = (event) => {
      const updatedBills = event.detail?.bills || JSON.parse(localStorage.getItem('bills') || '[]');
      const updatedTotalGST = updatedBills.reduce((sum, bill) => sum + (bill.taxAmount || 0), 0);
      const updatedCostSavings = calculateCostSavings(updatedBills);

      setStats({
        totalBills: updatedBills.length,
        pendingFiling: updatedBills.filter(b => !b.filed).length,
        totalGST: updatedTotalGST,
        costSavings: updatedCostSavings,
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('billUpdated', handleBillUpdated);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('billUpdated', handleBillUpdated);
    };
  }, []);

  const getStatusBadge = (status) => {
    const badges = {
      filed: 'badge-success',
      pending: 'badge-warning',
      upcoming: 'badge-neutral',
    };
    return badges[status] || 'badge-neutral';
  };

  const getStatusIcon = (status) => {
    const icons = {
      filed: '✓',
      pending: '⏳',
      upcoming: '📅',
    };
    return icons[status] || '•';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neutral-50)' }}>
      <Navbar user={user} />

      <div className="container section">
        {/* Welcome Hero */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)',
          color: 'white',
          margin: '2rem',
          padding: '2.5rem',
          border: 'none',
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>
            {t('welcome')}, {user?.name}! 👋
          </h1>
          <p style={{ opacity: 0.95, fontSize: '1rem', color: 'white' }}>
            {t('dashboard_subtitle')}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4" style={{ margin: '2rem', gap: '1.25rem' }}>
          <div className="card" style={{ textAlign: 'center', background: 'var(--primary-50)', borderColor: 'var(--primary-200)' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-700)', marginBottom: '0.25rem' }}>
              {stats.totalBills}
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--neutral-600)' }}>
              {t('Total Bills Uploaded')}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', background: 'var(--warning-light)', borderColor: '#fbbf24' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#b45309', marginBottom: '0.25rem' }}>
              {stats.pendingFiling}
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--neutral-600)' }}>
              {t('view_reports')}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', background: 'var(--success-light)', borderColor: '#86efac' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#166534', marginBottom: '0.25rem' }}>
              ₹{stats.totalGST.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--neutral-600)' }}>
              {t('total_gst_amount')}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)', borderColor: '#22c55e', border: '2px solid #22c55e', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)', borderRadius: '50%', transform: 'translate(30px, -30px)', pointerEvents: 'none' }} />
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.25rem', position: 'relative', zIndex: 1 }}>
              ₹{stats.costSavings.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--neutral-600)', position: 'relative', zIndex: 1 }}>
              💰 Cost Savings (6%)
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#16a34a', marginTop: '0.5rem', position: 'relative', zIndex: 1, opacity: 0.8 }}>
              From Automation
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Quick Actions */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <div className="card-title-icon">⚡</div>
                  <span>{t('quick_actions')}</span>
                </h2>
              </div>

              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <Link
                  to="/bill-upload"
                  className="card"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    textAlign: 'center',
                    padding: '2rem 1.5rem',
                    border: 'none',
                    textDecoration: 'none',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <IconUploadCloud />
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>{t('upload_bill')}</span>
                </Link>

                <Link
                  to="/gst-forms"
                  className="card"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    textAlign: 'center',
                    padding: '2rem 1.5rem',
                    border: 'none',
                    textDecoration: 'none',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <IconDocuments />
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>{t('gst_forms')}</span>
                </Link>

                <Link
                  to="/reports"
                  className="card"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    textAlign: 'center',
                    padding: '2rem 1.5rem',
                    border: 'none',
                    textDecoration: 'none',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <IconBarChart />
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>{t('view_reports')}</span>
                </Link>

                <Link
                  to="/chat"
                  className="card"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    color: 'white',
                    textAlign: 'center',
                    padding: '2rem 1.5rem',
                    border: 'none',
                    textDecoration: 'none',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <IconRobot />
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>AI Assistant</span>
                </Link>
              </div>
            </div>

            {/* GST Status Section */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <div className="card-title-icon">📊</div>
                  <span>{t('gst_status')}</span>
                </h2>
              </div>

              {filingStatus.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filingStatus.map((item, idx) => (
                    <div key={idx} className="status-card">
                      <div className="status-card-icon" style={{
                        background: item.status === 'filed' ? 'var(--success-light)' :
                          item.status === 'pending' ? 'var(--warning-light)' : 'var(--neutral-100)',
                      }}>
                        {getStatusIcon(item.status)}
                      </div>
                      <div className="status-card-content">
                        <div className="status-card-title">{item.month}</div>
                        <div className="status-card-description">
                          {item.billCount} bills • ₹{item.amount.toLocaleString()} • Due: {new Date(item.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`badge ${getStatusBadge(item.status)}`}>
                        {t(item.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--neutral-400)' }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📋</span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--neutral-500)' }}>
                    No filing data yet. Upload bills to track your GST status.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <ReminderPanel />
          </div>
        </div>
      </div>

      {/* Dynamic Cost Savings Footer Section */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
        borderTop: '2px solid rgba(34, 197, 94, 0.2)',
        padding: '3rem 2rem',
        marginTop: '2rem',
      }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--neutral-900)', marginBottom: '0.5rem' }}>
              💰 Cost Savings You've Earned
            </h2>
            <p style={{ color: 'var(--neutral-600)', fontSize: '1rem' }}>
              See how much you're saving with GST Buddy vs. hiring an accountant
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem',
          }}>
            {/* Your Savings Card */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white',
              textAlign: 'center',
              padding: '2rem',
              border: 'none',
              boxShadow: '0 10px 30px rgba(34, 197, 94, 0.2)',
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.95, marginBottom: '0.75rem' }}>
                Total Savings So Far
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                ₹{stats.costSavings.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                From {stats.totalBills} bills • 6% automation rate
              </div>
            </div>

            {/* Accountant Cost Card */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              textAlign: 'center',
              padding: '2rem',
              border: 'none',
              boxShadow: '0 10px 30px rgba(239, 68, 68, 0.2)',
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.95, marginBottom: '0.75rem' }}>
                Traditional Accountant Fee
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                ₹3,000
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                Per month (typical market rate)
              </div>
            </div>

            {/* App Cost Card */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              textAlign: 'center',
              padding: '2rem',
              border: 'none',
              boxShadow: '0 10px 30px rgba(139, 92, 246, 0.2)',
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.95, marginBottom: '0.75rem' }}>
                GST Buddy Monthly Cost
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                ₹500
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                or ₹0 for free tier
              </div>
            </div>
          </div>

          {/* Monthly Savings Breakdown */}
          <div className="card" style={{
            background: 'white',
            padding: '2rem',
            border: '2px solid rgba(34, 197, 94, 0.2)',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--neutral-900)', marginBottom: '1.5rem', textAlign: 'center' }}>
              Monthly Comparison
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1.5rem',
            }}>
              <div style={{
                textAlign: 'center',
                padding: '1rem',
                background: 'var(--neutral-50)',
                borderRadius: 'var(--radius-lg)',
                borderLeft: '4px solid #ef4444',
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--neutral-600)', marginBottom: '0.5rem' }}>
                  Accountant Fee
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626' }}>
                  ₹3,000
                </div>
              </div>

              <div style={{
                textAlign: 'center',
                padding: '1rem',
                background: 'var(--neutral-50)',
                borderRadius: 'var(--radius-lg)',
                borderLeft: '4px solid #8b5cf6',
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--neutral-600)', marginBottom: '0.5rem' }}>
                  GST Buddy Cost
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7c3aed' }}>
                  ₹500
                </div>
              </div>

              <div style={{
                textAlign: 'center',
                padding: '1rem',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
                borderRadius: 'var(--radius-lg)',
                borderLeft: '4px solid #22c55e',
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--neutral-600)', marginBottom: '0.5rem' }}>
                  Monthly Savings
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a' }}>
                  ₹2,500
                </div>
              </div>
            </div>

            {/* Annual Savings */}
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid rgba(34, 197, 94, 0.2)',
              textAlign: 'center',
            }}>
              <p style={{ color: 'var(--neutral-600)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                If you use GST Buddy for a full year:
              </p>
              <div style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: '#16a34a',
                marginBottom: '0.5rem',
              }}>
                ₹30,000 saved annually
              </div>
              <p style={{ color: 'var(--neutral-600)', fontSize: '0.875rem', margin: 0 }}>
                Plus ₹{(stats.costSavings * 12).toLocaleString()} from automation efficiency based on your current upload rate
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr !important;
          }
          .grid-cols-3 {
            grid-template-columns: 1fr !important;
          }
          .card {
            padding: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
