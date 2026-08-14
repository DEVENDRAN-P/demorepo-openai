import React, { useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReminderPanel from '../components/ReminderPanel';
import GSTFilingStatus from '../components/GSTFilingStatus';
import PenaltyLateFeeEstimator from '../components/PenaltyLateFeeEstimator';
import { getUserBills } from '../services/firebaseDataService';
import { aiChat } from '../services/aiService';
import { fetchActivePlan } from '../services/subscriptionService';
import { fetchEntitlements, metricCount, displayMetricLimit, invalidateUsageCache } from '../services/usageService';
import { getUserBusinesses } from '../utils/businessHelper';

const getApiUrl = (path) => {
  if (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port !== '5000') {
    return `http://localhost:5000${path}`;
  }
  return path;
};

// Removed static BUSINESSES list to enforce data isolation

// SVG Icons
const IconBriefcase = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M3 13h18" />
  </svg>
);

const IconUploadCloud = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconDocuments = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="4" rx="1" />
    <path d="M9 4H5a2 2 0 0 0-2 2v13a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6a2 2 0 0 0-2-2h-4" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="15" y2="16" />
  </svg>
);

const IconBarChart = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="3" x2="3" y2="21" />
    <line x1="3" y1="21" x2="21" y2="21" />
    <rect x="7" y="10" width="3" height="7" />
    <rect x="12" y="6" width="3" height="11" />
    <rect x="17" y="13" width="3" height="4" />
  </svg>
);

const IconRobot = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2" ry="2" />
    <line x1="3" y1="11" x2="21" y2="11" />
    <circle cx="8" cy="14.5" r="1" fill="currentColor" />
    <circle cx="12" cy="14.5" r="1" fill="currentColor" />
    <circle cx="16" cy="14.5" r="1" fill="currentColor" />
    <path d="M7 7V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3" />
  </svg>
);

function Dashboard({ user }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [bills, setBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [activePlan, setActivePlan] = useState('free');
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [entitlements, setEntitlements] = useState(null);
  const [subStatus, setSubStatus] = useState(null);

  useEffect(() => {
    if (user) {
      setUserBusinesses(getUserBusinesses(user));
    }
  }, [user]);

  const [activeBusiness, setActiveBusiness] = useState(() => {
    const list = getUserBusinesses(user);
    const saved = localStorage.getItem('activeBusinessId');
    return list.find(b => b.id === saved) || list[0] || { id: '', name: '', gstin: '', state: '', type: '' };
  });

  useEffect(() => {
    if (userBusinesses.length > 0) {
      const saved = localStorage.getItem('activeBusinessId');
      const found = userBusinesses.find(b => b.id === saved);
      if (found) {
        setActiveBusiness(found);
      } else {
        setActiveBusiness(userBusinesses[0]);
      }
    }
  }, [userBusinesses]);

  // AI Finance Agent State
  const [agentInput, setAgentInput] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch subscription tier status through the deduplicated service.
  // fetchActivePlan() resolves the plan from /api/subscription/status ONCE per
  // page load (module-level cache) and is shared with the Sidebar and every
  // other page — no duplicate requests, no forced token refresh, and it reads
  // the correct response shape (data.subscription.subscriptionPlan).
  useEffect(() => {
    let mounted = true;
    fetchActivePlan().then((plan) => {
      if (mounted) setActivePlan(plan);
    });
    // Real usage counters + entitlement snapshot (authoritative backend data).
    fetchEntitlements().then((snap) => {
      if (mounted) setEntitlements(snap);
    }).catch(() => {});
    // Subscription status (status/expiry) for the card.
    if (user?.uid && auth.currentUser) {
      auth.currentUser.getIdToken().then((token) =>
        fetch(getApiUrl('/api/subscription/status'), {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).then((res) => (res.ok ? res.json() : Promise.resolve({})))
        .then((data) => {
          if (mounted) setSubStatus(data?.subscription || null);
        })
        .catch(() => {});
    }
    const handlePlanChanged = () => {
      invalidateUsageCache();
      fetchEntitlements().then((snap) => { if (mounted) setEntitlements(snap); }).catch(() => {});
      if (user?.uid && auth.currentUser) {
        auth.currentUser.getIdToken().then((token) =>
          fetch(getApiUrl('/api/subscription/status'), {
            headers: { Authorization: `Bearer ${token}` },
          })
        ).then((res) => (res.ok ? res.json() : Promise.resolve({})))
          .then((data) => { if (mounted) setSubStatus(data?.subscription || null); })
          .catch(() => {});
      }
    };
    window.addEventListener('planChanged', handlePlanChanged);
    return () => {
      mounted = false;
      window.removeEventListener('planChanged', handlePlanChanged);
    };
  }, [user]);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState('pro');

  const handleFeatureClick = (requiredTier, e) => {
    if (activePlan === 'free' && requiredTier !== 'free') {
      e.preventDefault();
      setUpgradeTarget(requiredTier);
      setShowUpgradeModal(true);
    } else if (activePlan === 'pro' && requiredTier === 'business') {
      e.preventDefault();
      setUpgradeTarget(requiredTier);
      setShowUpgradeModal(true);
    }
  };



  // Fetch bills from Firebase
  useEffect(() => {
    if (!user?.uid) {
      setLoadingBills(false);
      return;
    }
    // Fetch bills directly — no automatic seeding
    getUserBills()
      .then(fetchedBills => {
        setBills(fetchedBills);
        setLoadingBills(false);
      })
      .catch(error => {
        console.error('Error fetching bills from Firebase:', error);
        setBills([]);
        setLoadingBills(false);
      });

    // Listen for custom bill update event
    const handleBillUpdated = () => {
      getUserBills().then(setBills);
    };
    window.addEventListener('billUpdated', handleBillUpdated);
    return () => window.removeEventListener('billUpdated', handleBillUpdated);
  }, [user?.uid]);

  // Filter bills by active business (invoices without businessId default to the first one)
  const businessBills = bills.filter(bill => {
    if (!bill.businessId) {
      return activeBusiness.id === (userBusinesses[0]?.id || '');
    }
    return bill.businessId === activeBusiness.id;
  });

  // Filter bills by intelligent search query (natural language and tags matching)
  const searchedBills = businessBills.filter(bill => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (bill.invoiceNumber && bill.invoiceNumber.toLowerCase().includes(query)) ||
      (bill.supplierName && bill.supplierName.toLowerCase().includes(query)) ||
      (bill.gstin && bill.gstin.toLowerCase().includes(query)) ||
      (bill.expenseType && bill.expenseType.toLowerCase().includes(query)) ||
      (bill.notes && bill.notes.toLowerCase().includes(query)) ||
      (bill.hsn && bill.hsn.toLowerCase().includes(query)) ||
      (bill.amount && String(bill.amount).includes(query)) ||
      (bill.totalAmount && String(bill.totalAmount).includes(query)) ||
      (bill.filed ? 'filed' : 'pending').includes(query)
    );
  });

  // Calculate statistics
  const totalBillsUploaded = businessBills.length;
  const pendingFilings = businessBills.filter(b => !b.filed).length;
  const totalGSTAmount = businessBills.reduce((sum, b) => sum + (b.taxAmount || 0), 0);
  const totalInvoiceAmount = businessBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  // Financial Metrics — computed ONLY from the user's stored invoices.
  // Purchase invoices record spend and GST (input tax credit). Sales revenue
  // and GST payable CANNOT be derived from purchase invoices, so they render
  // as "—" instead of fabricated estimates with arbitrary multipliers.
  const expenses = totalInvoiceAmount;       // recorded purchase spend (real)
  const inputTaxCredit = totalGSTAmount;     // GST on purchase invoices (ITC, real)
  // eslint-disable-next-line no-unused-vars
  const netPayable = 0;                      // requires sales/outward-supply data
  const revenue = null;                      // requires sales invoices
  const gstPayable = null;                   // requires sales data
  // eslint-disable-next-line no-unused-vars
  const costSavings = null;                  // not computed

  // Business Health Score calculations
  const totalVerified = businessBills.filter(b => b.status === 'approved' || b.filed).length;
  const accuracyRate = totalBillsUploaded ? (totalVerified / totalBillsUploaded) : 1.0;
  const healthScore = totalBillsUploaded ? Math.round(75 + accuracyRate * 20) : 100;
  const complianceScore = totalBillsUploaded ? Math.round(80 + (totalBillsUploaded - pendingFilings) / totalBillsUploaded * 18) : 100;

  const getScoreRating = (score) => {
    if (score >= 90) return { label: 'Excellent', class: 'badge-excellent' };
    if (score >= 75) return { label: 'Good', class: 'badge-good' };
    if (score >= 60) return { label: 'Average', class: 'badge-average' };
    return { label: 'Critical', class: 'badge-critical' };
  };

  const healthRating = getScoreRating(healthScore);
  const complianceRating = getScoreRating(complianceScore);

  const handleBusinessChange = (e) => {
    const businessId = e.target.value;
    const selected = userBusinesses.find(b => b.id === businessId);
    if (selected) {
      setActiveBusiness(selected);
      localStorage.setItem('activeBusinessId', selected.id);
      // Dispatch event to notify other components of context shift
      window.dispatchEvent(new CustomEvent('businessChanged', { detail: { businessId: selected.id } }));
    }
  };

  // AI Finance Agent Handler
  const handleAgentAction = async (promptText) => {
    const finalPrompt = promptText || agentInput;
    if (!finalPrompt.trim()) return;

    // Feature gating checks for AI Queries
    const queryLower = finalPrompt.toLowerCase();
    if (activePlan === 'free') {
      if (queryLower.includes('prepare') || queryLower.includes('compliance') || queryLower.includes('risk') || queryLower.includes('audit')) {
        setUpgradeTarget('pro');
        setShowUpgradeModal(true);
        return;
      }
    } else if (activePlan === 'pro') {
      if (queryLower.includes('risk') || queryLower.includes('audit')) {
        setUpgradeTarget('business');
        setShowUpgradeModal(true);
        return;
      }
    }

    setAgentLoading(true);
    setAgentResponse('');
    try {
      const invoiceSummary = businessBills.length === 0
        ? 'No invoices uploaded yet.'
        : businessBills.slice(0, 40).map((b, i) => `- Inv #${b.invoiceNumber} from ${b.supplierName} | Date: ${b.invoiceDate} | Taxable: ₹${b.amount} | GST: ₹${b.taxAmount} | Total: ₹${b.totalAmount} | Category: ${b.expenseType} | Status: ${b.filed ? 'Filed' : 'Pending'}`).join('\n');

      const result = await aiChat({
        messages: [
          {
            role: 'user',
            content: [
              `Context financials for ${activeBusiness.name} (GSTIN: ${activeBusiness.gstin}, State: ${activeBusiness.state}):`,
              `- Recorded Purchase Expenses: ₹${expenses.toLocaleString()}`,
              `- Input Tax Credit (ITC) Available: ₹${inputTaxCredit.toLocaleString()}`,
              `- GST Payable: not derivable from purchase invoices (requires sales data)`,
              `- Total Invoices Captured: ${totalBillsUploaded}`,
              `- Outstanding Filings: ${pendingFilings}`,
              `- Compliance Score: ${complianceScore}%`,
              `- Business Health Rating: ${healthScore}% (${healthRating.label})`,
              ``,
              `Respond to the user query by structuring the response explicitly under:`,
              `- **Decision/Action**: What the AI did or recommends.`,
              `- **Evidence/Reasoning**: Specific numbers, rules or invoice parameters backing this up.`,
              `- **Business Impact**: Tax savings, compliance risk reduction, or workflow hours saved.`,
              `- **Next Action**: Step-by-step recommendation for the user.`,
              ``,
              `User query: ${finalPrompt}`,
            ].join('\n'),
          },
        ],
        business: {
          name: activeBusiness.name,
          gstin: activeBusiness.gstin,
          state: activeBusiness.state,
        },
        invoiceSummary,
        language: i18n.language === 'hi' ? 'hi' : i18n.language === 'ta' ? 'ta' : 'en',
      });

      setAgentResponse(result.reply || 'No explanation generated.');
      setAgentInput('');
    } catch (error) {
      console.error('Agent execution error:', error);
      setAgentResponse('⚠️ The AI Accountant encountered a secure connection issue. Let me explain: We could not securely route your request to the compliance server. Action needed: Check your network settings and sign-in session.');
    } finally {
      setAgentLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      <div>
        {/* Executive Banner & Selector */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.75rem 2rem', margin: '0 0 2rem 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(20, 184, 166, 0.08) 100%)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <span className="pulse-dot"></span>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--theme-secondary)' }}>
                {t('AI Finance Operating System')}
              </span>
            </div>
            <h1 className="gradient-text" style={{ fontSize: '2.25rem', margin: 0, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {t('welcome_back', { name: user?.name || user?.displayName || t('user_profile') })} 👋
              <span style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: activePlan === 'free' ? 'rgba(100, 116, 139, 0.15)' : activePlan === 'pro' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                color: activePlan === 'free' ? '#94a3b8' : activePlan === 'pro' ? '#818cf8' : '#34d399',
                border: activePlan === 'free' ? '1px solid rgba(100, 116, 139, 0.3)' : activePlan === 'pro' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                letterSpacing: '0.05em',
                lineHeight: 1
              }}>
                {t(activePlan === 'free' ? 'free_tier' : activePlan === 'pro' ? 'pro_tier' : 'business_tier')} {t('tier')}
              </span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
              {t('Manage accounts, verify compliance, and audit risks with your AI accountant')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ color: 'var(--theme-primary-light)' }}><IconBriefcase /></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
                {t('Active Business Entity')}
              </span>
              <select 
                value={activeBusiness.id} 
                onChange={handleBusinessChange}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem', outline: 'none', cursor: 'pointer', paddingRight: '1rem' }}
              >
                {userBusinesses.map(b => (
                  <option key={b.id} value={b.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

        {loadingBills ? (
          <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div style={{ height: '120px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}></div>
              <div style={{ height: '120px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}></div>
              <div style={{ height: '120px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}></div>
            </div>
            <div style={{ height: '240px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}></div>
            <div style={{ height: '200px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}></div>
          </div>
        ) : (
          <>
            {/* Business Health & Compliance gauges */}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Business Health Dial */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '90px', height: '90px' }}>
              <svg width="90" height="90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-color)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--success)" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * healthScore) / 100} strokeLinecap="round" transform="rotate(-90 50 50)" />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{healthScore}%</span>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('business_health_title', 'Business Health')}</span>
                <span className={`badge-premium ${healthRating.class}`}>{healthRating.label}</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>
                {t('health_derived_desc', { count: totalVerified })}
              </p>
            </div>
          </div>

          {/* GST Compliance Dial */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '90px', height: '90px' }}>
              <svg width="90" height="90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-color)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--theme-primary)" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * complianceScore) / 100} strokeLinecap="round" transform="rotate(-90 50 50)" />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{complianceScore}%</span>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('GST Compliance')}</span>
                <span className={`badge-premium ${complianceRating.class}`}>{complianceRating.label}</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>
                {t('compliance_derived_desc', { count: pendingFilings })}
              </p>
            </div>
          </div>

          {/* Upcoming Filing Deadlines */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>{t('Filing Deadlines')}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--error)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span className="pulse-dot pulse-dot-red" style={{ width: '6px', height: '6px' }}></span>
                {t('gstr1_due_soon', 'GSTR-1 Due in 11 days')}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                 <span style={{ color: 'var(--text-secondary)' }}>{t('gstr1_sales_summary', 'GSTR-1 (Sales Summary)')}</span>
                <strong style={{ marginLeft: 'auto' }}>August 11, 2026</strong>
              </div>
              <div style={{ display: 'flex', justifyBetween: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('gstr3b_summary_return', 'GSTR-3B (Summary Return)')}</span>
                <strong style={{ marginLeft: 'auto' }}>August 20, 2026</strong>
              </div>
            </div>
          </div>
        </div>

        {/* AI Financial Dashboard Stats */}
        <div className="grid grid-cols-4" style={{ gap: '1.25rem', marginBottom: '2rem' }}>
          
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '1.25rem', borderLeft: '4px solid var(--theme-secondary-light)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{t('monthly_revenue')}</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0' }}>{revenue === null ? '—' : '₹' + revenue.toLocaleString()}</div>
            <span style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)' }}>{t('revenue_requires_sales')}</span>
          </div>

          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '1.25rem', borderLeft: '4px solid var(--theme-primary-light)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{t('monthly_expenses')}</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0' }}>₹{expenses.toLocaleString()}</div>
            <span style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)' }}>{t('expenses_receipts', { count: totalBillsUploaded })}</span>
          </div>

          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{t('gst_payable')}</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0' }}>{gstPayable === null ? '—' : '₹' + gstPayable.toLocaleString()}</div>
            <span style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)' }}>{t('gst_payable_requires_sales')}</span>
          </div>

          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{t('input_tax_credit')}</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0' }}>₹{inputTaxCredit.toLocaleString()}</div>
            <span style={{ fontSize: '0.675rem', color: '#4ade80', fontWeight: 500 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: '#4ade80' }}><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/></svg> {t('itc_valid_supplier')}</span></span>
          </div>

        </div>

        {/* AI Finance Agent Section (Interactive Console) */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(102, 126, 234, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--theme-primary-light)', padding: '0.5rem', borderRadius: 'var(--radius-md)', color: 'white' }}><IconRobot /></div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{t('agent_console_title')}</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>{t('agent_console_subtitle')}</p>
            </div>
          </div>

          <div className="ai-agent-input-wrapper">
            <input 
              type="text" 
              className="ai-agent-input" 
              placeholder={t('agent_console_placeholder')}
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAgentAction()}
              disabled={agentLoading}
            />
            <button 
              className="btn btn-primary" 
              onClick={() => handleAgentAction()}
              disabled={agentLoading}
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
            >
              {agentLoading ? t('running') : t('execute')}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <button className="chip-interactive" onClick={() => handleAgentAction('Analyze this month')}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> {t('analyze_month')}</button>
            <button className="chip-interactive" onClick={() => handleAgentAction('Check compliance')}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m5 .5a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> {t('check_compliance')}</button>
            <button className="chip-interactive" onClick={() => handleAgentAction('Prepare GST')}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> {t('prepare_gst')}</button>
            <button className="chip-interactive" onClick={() => handleAgentAction('Find risks')}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> {t('find_audit_risks')}</button>
            <button className="chip-interactive" onClick={() => handleAgentAction('Suggest tax savings')}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1M6.364 5.636l-.707-.707M21 12h-1"/><path d="M3 12H2m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> {t('tax_saving_options')}</button>
          </div>

          {agentResponse && (
            <div className="glass-panel" style={{ marginTop: '1.25rem', padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--theme-secondary)' }}>
              <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--theme-secondary)' }}>{t('agent_execution_logs')}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{t('live_analysis')}</span>
              </div>
              <div style={{ fontSize: '0.875rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                {agentResponse}
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Main Grid split: Actions, Status vs. Logs */}
        <div className="grid" style={{ gridTemplateColumns: '1.8fr 1.2fr', gap: '2rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Global Intelligent Search */}
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ display: 'flex' }}><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--theme-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_placeholder')} 
                  style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', outline: 'none' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="btn btn-outline" style={{ padding: '0.5rem 1.25rem', fontSize: '0.825rem' }}>{t('clear')}</button>
                )}
              </div>
            </div>

            {/* GST Filing Status Component */}
            <GSTFilingStatus bills={searchedBills} />

            {/* Quick Actions */}
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <span style={{ display: 'flex' }}><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--theme-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{t('quick_operations')}</h2>
              </div>
              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <Link to="/bill-upload" className="glass-panel hover-glow" style={{ padding: '1.5rem', textAlign: 'center', textDecoration: 'none', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <IconUploadCloud />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('smart_upload')}</span>
                </Link>
                <Link to="/gst-forms" onClick={(e) => handleFeatureClick('pro', e)} className="glass-panel hover-glow" style={{ padding: '1.5rem', textAlign: 'center', textDecoration: 'none', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <IconDocuments />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('filing_readiness')}</span>
                </Link>
                <Link to="/reports" onClick={(e) => handleFeatureClick('pro', e)} className="glass-panel hover-glow" style={{ padding: '1.5rem', textAlign: 'center', textDecoration: 'none', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <IconBarChart />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('deep_analytics')}</span>
                </Link>
                <Link to="/chat" className="glass-panel hover-glow" style={{ padding: '1.5rem', textAlign: 'center', textDecoration: 'none', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <IconRobot />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('ai_accountant_chat')}</span>
                </Link>
              </div>
            </div>

            {/* Late Fee Estimator */}
            <PenaltyLateFeeEstimator />
          </div>

          {/* Sidebar / Logs Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Real Subscription & Usage Card (Part 38) */}
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{t('subscription_plan', 'Subscription')}</h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  background: activePlan === 'free' ? 'rgba(100, 116, 139, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: activePlan === 'free' ? '#94a3b8' : '#34d399',
                }}>
                  {activePlan === 'free' ? t('free_tier') : activePlan === 'pro' ? t('pro_tier') : t('business_tier')} {t('tier')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
                <strong style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  {activePlan === 'free' ? '₹0' : activePlan === 'pro' ? '₹199' : '₹499'}
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/month</span>
                </strong>
              </div>

              {(() => {
                const invLimit = entitlements?.limits?.invoiceUploads;
                const invUsed = metricCount(entitlements?.usage, 'invoiceUploads');
                const docLimit = entitlements?.limits?.documents;
                const docUsed = metricCount(entitlements?.usage, 'documents');
                const insightDisplay = displayMetricLimit(entitlements?.usage, 'aiInsights');
                const invDisplay = displayMetricLimit(entitlements?.usage, 'invoiceUploads');
                const invCeiling = invLimit?.fairUse || !invLimit?.limit || invLimit?.limit >= Number.MAX_SAFE_INTEGER || String(invLimit?.limit) === '9007199254740991' ? Infinity : invLimit.limit;
                const docDisplay = displayMetricLimit(entitlements?.usage, 'documents');
                const docCeiling = docLimit?.fairUse || !docLimit?.limit || docLimit?.limit >= Number.MAX_SAFE_INTEGER || String(docLimit?.limit) === '9007199254740991' ? Infinity : docLimit.limit;

                const UsageBar = ({ used, ceiling, display }) => (
                  <div style={{ width: '100%', background: 'var(--bg-tertiary)', height: '5px', borderRadius: '3px', overflow: 'hidden', marginTop: '0.25rem' }}>
                    <div style={{ width: ceiling === Infinity ? 100 : Math.min(100, (used / ceiling) * 100), background: used >= ceiling ? 'var(--error)' : 'var(--theme-primary)', height: '100%' }}></div>
                  </div>
                );

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.78rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>{t('invoice_usage', 'Invoice Usage')}</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{invUsed} / {invDisplay}</strong>
                      </div>
                      <UsageBar used={invUsed} ceiling={invCeiling} display={invDisplay} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>{t('document_usage', 'Documents')}</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{docUsed} / {docDisplay}</strong>
                      </div>
                      <UsageBar used={docUsed} ceiling={docCeiling} display={docDisplay} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>{t('ai_insights_usage', 'AI Insights')}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{insightDisplay}</strong>
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginTop: '1.1rem', paddingTop: '0.9rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('subscription_status', 'Subscription')}</span>
                  <strong style={{ textTransform: 'capitalize' }}>{subStatus?.subscriptionStatus || 'active'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('renews_on', 'Renews')}</span>
                  <strong>{subStatus?.subscriptionExpiry ? new Date(subStatus.subscriptionExpiry).toLocaleDateString() : '—'}</strong>
                </div>
              </div>

              <button
                onClick={() => navigate('/pricing')}
                className="btn btn-outline"
                style={{ width: '100%', marginTop: '1rem', padding: '0.55rem', fontSize: '0.8rem' }}
              >
                {activePlan === 'free' ? t('upgrade_to_pro') : t('manage_subscription', 'Manage Subscription')}
              </button>
            </div>

            {/* Live AI Activity Timeline */}
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{t('ai_system_timeline')}</h3>
                <span className="pulse-dot"></span>
              </div>
              <div className="timeline-container">
                <div className="timeline-item success">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <div className="timeline-time">{t('live')}</div>
                    <strong>{t('timeline_ledger_synced')}</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{t('timeline_ledger_desc', { total: totalBillsUploaded, verified: totalVerified })}</div>
                  </div>
                </div>
                <div className="timeline-item info">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <div className="timeline-time">{t('live')}</div>
                    <strong>{t('timeline_gst_position')}</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{t('timeline_gst_position_desc', { itc: inputTaxCredit.toLocaleString() })}</div>
                  </div>
                </div>
                <div className="timeline-item warning">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <div className="timeline-time">{t('live')}</div>
                    <strong>{t('filing_status')}</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{t('timeline_filing_desc', { count: pendingFilings })} <Link to="/agent-activity" style={{ color: 'var(--theme-primary)', fontWeight: 600 }}>{t('view_agent_activity')} →</Link></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reminder Panel */}
            <ReminderPanel />
          </div>

        </div>

        {/* Dynamic Cost Savings Section - Redesigned as Executive Financial Impact */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.75rem 2rem', marginTop: '2.5rem' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ color: 'var(--theme-secondary)', display: 'flex', alignItems: 'center' }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {t('financial_impact')}
                </h2>
                <p style={{ margin: '0.125rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {t('financial_impact_desc')}
                </p>
              </div>
            </div>
            
            {/* Last Updated Badge */}
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span className="pulse-dot" style={{ width: '5px', height: '5px' }}></span>
              <span>{t('auto_calculated', { count: totalBillsUploaded })}</span>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            
            {/* Card 1: Total Savings */}
            <div className="glass-panel hover-glow" style={{ borderRadius: 'var(--radius-lg)', padding: '1.25rem', borderLeft: '4px solid var(--success)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('itc_card_title')}</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0 0 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span>₹{inputTaxCredit.toLocaleString()}</span>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', lineHeight: '1.4' }}>
                  {t('itc_card_desc')}
                </p>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(34, 197, 94, 0.1)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 6l-9.5 9.5-5-5L1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
            </div>

            {/* Card 2: ROI & Net Monthly Savings */}
            <div className="glass-panel hover-glow" style={{ borderRadius: 'var(--radius-lg)', padding: '1.25rem', borderLeft: '4px solid var(--theme-secondary-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('roi_monthly_yield')}</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0 0 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span>6.0x</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--theme-secondary-light)', fontWeight: 600 }}>
                    {t('net_yield')}
                  </span>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', lineHeight: '1.4' }}>
                  {t('ai_saves_desc')}
                </p>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(20, 184, 166, 0.1)',
                color: 'var(--theme-secondary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>

            {/* Card 3: Cost Comparison */}
            <div className="glass-panel hover-glow" style={{ borderRadius: 'var(--radius-lg)', padding: '1.25rem', borderLeft: '4px solid var(--theme-primary-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('cost_reduction')}</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0 0 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span>83%</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                    ₹3,000 vs ₹500
                  </span>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', lineHeight: '1.4' }}>
                  {t('cost_comparison_desc')}
                </p>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(102, 126, 234, 0.1)',
                color: 'var(--theme-primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
            </div>

          </div>

          {/* Lower Grid: Progress Bar vs. Parameters Formula Table */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            
            {/* Savings Progress Target */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                <span>{t('savings_progress')}</span>
                <strong style={{ marginLeft: 'auto' }}>{t('achieved_84')}</strong>
              </div>
              
              {/* CSS Progress Bar */}
              <div style={{ height: '10px', background: 'var(--bg-secondary)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                <div style={{ width: '84%', height: '100%', background: 'linear-gradient(90deg, var(--theme-primary-light) 0%, var(--success) 100%)', borderRadius: '5px' }}></div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.675rem', color: 'var(--text-tertiary)' }}>
                <span>{t('annual_target')}</span>
                <span style={{ marginLeft: 'auto' }}>{t('unclaimed_target')}</span>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>{t('how_calculated')}</h4>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                <div style={{ flex: 1, minWidth: '100px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span>Market Avg Cost: <strong>₹3,000/mo</strong></span>
                  <span>GST Buddy AI: <strong>₹500/mo</strong></span>
                </div>
                <div style={{ flex: 1, minWidth: '100px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span>Net Savings: <strong>₹2,500/mo</strong></span>
                  <span>Current Duration: <strong>6.7 months</strong></span>
                </div>
                <div style={{ minWidth: '100px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ color: 'var(--success)' }}>Total Savings: <strong>₹16,800</strong></span>
                  <span>Calculated offset multiplier: <strong>6x</strong></span>
                </div>
              </div>
            </div>

          </div>

          {/* AI Explanation Insight */}
          <div style={{ background: 'rgba(102, 126, 234, 0.05)', border: '1px solid rgba(102, 126, 234, 0.15)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ color: 'var(--theme-primary-light)', display: 'flex' }}><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1M6.364 5.636l-.707-.707M21 12h-1M4 12H3m3.343-5.657L5.636 5.636"/><path d="M12 3v1m6.364 4.636.707-.707"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--theme-primary-light)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('ai_impact_insight')}</span>
              <p style={{ margin: '0.125rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {t('ai_impact_desc')}
              </p>
            </div>
          </div>

        </div>

          </>
        )}

      <style>{`
        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr !important;
          }
          .grid-cols-4 {
            grid-template-columns: 1fr !important;
          }
          .grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {/* 🔮 Modern Upgrade Promo Modal */}
      {showUpgradeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '2px solid var(--theme-primary-light)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '440px',
            padding: '2.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            textAlign: 'center',
            color: 'var(--text-primary)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowUpgradeModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '1.5rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              &times;
            </button>

            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⭐</div>
             <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
               {upgradeTarget === 'pro' ? t('upgrade_unlock_pro') : t('upgrade_unlock_business')}
             </h3>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
               {upgradeTarget === 'pro' 
                 ? t('upgrade_pro_desc')
                 : t('upgrade_business_desc')}
             </p>

             <div style={{ 
               background: 'var(--bg-primary)', 
               border: '1px solid var(--border-color)', 
               borderRadius: '8px', 
               padding: '1rem', 
               textAlign: 'left', 
               marginBottom: '1.5rem',
               fontSize: '0.8rem',
               color: 'var(--text-secondary)'
             }}>
               <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                 {t(upgradeTarget === 'pro' ? 'available_with_pro' : 'available_with_business')}:
               </strong>
               {upgradeTarget === 'pro' ? (
                 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                   <li>✓ {t('feat_analyze_performance')}</li>
                   <li>✓ {t('feat_detect_leakage')}</li>
                   <li>✓ {t('feat_explain_gst')}</li>
                   <li>✓ {t('feat_ai_recommendations')}</li>
                 </ul>
               ) : (
                 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                   <li>✓ {t('feat_continuous_monitoring')}</li>
                   <li>✓ {t('feat_anomaly_detection')}</li>
                   <li>✓ {t('feat_cashflow_planning')}</li>
                   <li>✓ {t('feat_multi_business')}</li>
                 </ul>
               )}
               <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t('pricing_colon')}:</span>
                 <strong style={{ fontSize: '1.05rem', color: 'var(--theme-primary-light)' }}>
                   {upgradeTarget === 'pro' ? '₹199/month' : '₹499/month'}
                 </strong>
               </div>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               <button
                 onClick={() => {
                   setShowUpgradeModal(false);
                   localStorage.setItem('selectedPlan', upgradeTarget);
                   navigate('/pricing');
                 }}
                 style={{
                   padding: '0.85rem',
                   borderRadius: '10px',
                   background: 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-light) 100%)',
                   color: 'white',
                   border: 'none',
                   fontSize: '0.95rem',
                   fontWeight: 700,
                   cursor: 'pointer',
                   boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                 }}
               >
                 {t(upgradeTarget === 'pro' ? 'upgrade_to_pro' : 'upgrade_to_business')}
               </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {t('maybe_later')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
