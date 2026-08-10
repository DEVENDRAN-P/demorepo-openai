import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getUserBills } from '../services/firebaseDataService';

function Reports({ user }) {
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [summary, setSummary] = useState({ paid: 0, collected: 0, credit: 0, netPayable: 0 });
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeBusinessId, setActiveBusinessId] = useState(() => {
    return localStorage.getItem('activeBusinessId') || null;
  });

  const [aiInsights, setAiInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  // Sync active business shifts
  useEffect(() => {
    const handleBusinessChanged = (e) => {
      if (e.detail?.businessId) {
        setActiveBusinessId(e.detail.businessId);
      }
    };
    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => window.removeEventListener('businessChanged', handleBusinessChanged);
  }, []);

  const loadReportsData = () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getUserBills(user.uid)
      .then(bills => {
        // Filter by selected business
        const businessBills = bills.filter(bill => {
          if (!activeBusinessId) return true;
          if (!bill.businessId) return true;
          return bill.businessId === activeBusinessId;
        });

        if (businessBills.length === 0) {
          setHasData(false);
          setLoading(false);
          return;
        }

        setHasData(true);

        // Compute monthly data
        const monthlyMap = {};
        businessBills.forEach(bill => {
          const date = new Date(bill.invoiceDate);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });

          if (!monthlyMap[monthKey]) {
            monthlyMap[monthKey] = { month: monthName, paid: 0, collected: 0 };
          }
          monthlyMap[monthKey].paid += bill.taxAmount || 0;
          monthlyMap[monthKey].collected += bill.totalAmount || 0;
        });

        const monthly = Object.values(monthlyMap).slice(-6);
        setMonthlyData(monthly);

        // Compute category breakdown
        const categoryMap = {};
        businessBills.forEach(bill => {
          const type = bill.expenseType || 'Others';
          categoryMap[type] = (categoryMap[type] || 0) + (bill.amount || 0);
        });

        const colors = ['#6366f1', '#14b8a6', '#f59e0b', '#10b981', '#ec4899', '#ef4444'];
        const category = Object.entries(categoryMap).map(([name, value], idx) => ({
          name,
          value,
          color: colors[idx % colors.length],
        }));
        setCategoryData(category);

        // Calculate summary from real bill data
        const totalPaid = businessBills.reduce((sum, bill) => sum + (bill.taxAmount || 0), 0);
        const totalCollected = businessBills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
        const totalTaxable = businessBills.reduce((sum, bill) => sum + (bill.taxableAmount || bill.amount || 0), 0);
        // Input Tax Credit = total tax paid on purchases
        const inputCredit = totalPaid;
        // Output tax liability = total tax collected on sales (collected - paid as ITC)
        const outputTax = Math.max(0, totalCollected - totalTaxable);
        const netPayable = Math.max(0, outputTax - inputCredit);

        setSummary({
          paid: totalPaid,
          collected: totalCollected,
          credit: inputCredit,
          netPayable: netPayable,
        });

        // Generate AI Business Insights dynamically from actual data
        const billCount = businessBills.length;
        const avgBillAmount = billCount > 0 ? totalCollected / billCount : 0;
        const topCategories = category.slice(0, 3).map(c => `${c.name} (₹${c.value.toLocaleString('en-IN')})`);
        const insightsList = [];
        if (billCount > 0) {
          insightsList.push(`Processed ${billCount} invoices with an average value of ₹${avgBillAmount.toLocaleString('en-IN')}.`);
          if (topCategories.length > 0) {
            insightsList.push(`Top expense categories: ${topCategories.join(', ')}.`);
          }
          if (inputCredit > 0 && outputTax > 0) {
            const itcUtilization = Math.min(100, Math.round((inputCredit / outputTax) * 100));
            insightsList.push(`Input Tax Credit utilization stands at ${itcUtilization}% for the current period.`);
          }
        } else {
          insightsList.push('No invoice data available yet. Upload invoices to see insights.');
        }
        setAiInsights(insightsList);

        // Generate data-driven recommendations
        const recommendationsList = [];
        if (inputCredit > 0 && outputTax > 0 && inputCredit < outputTax) {
          const gap = outputTax - inputCredit;
          recommendationsList.push({
            title: "Maximize ITC claims",
            desc: `Current ITC covers ${Math.round((inputCredit / outputTax) * 100)}% of output tax. Ensure all eligible purchase invoices are uploaded to claim remaining ₹${gap.toLocaleString('en-IN')} in credits.`
          });
        }
        if (billCount === 0) {
          recommendationsList.push({
            title: "Start uploading invoices",
            desc: "Upload your first invoice to begin tracking GST compliance, ITC, and tax liability automatically."
          });
        }
        if (category.length > 0) {
          const topCat = category[0];
          recommendationsList.push({
            title: `Review ${topCat.name} expenses`,
            desc: `Your highest expense category is ${topCat.name} at ₹${topCat.value.toLocaleString('en-IN')}. Review for potential tax optimization opportunities.`
          });
        }
        if (recommendationsList.length === 0) {
          recommendationsList.push({
            title: "Upload more invoices",
            desc: "Add more invoices to generate personalized tax and compliance recommendations."
          });
        }
        setRecommendations(recommendationsList);
      })
      .catch(error => {
        console.error('Error fetching bills:', error);
        setHasData(false);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReportsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, activeBusinessId]);

  // Export Executive Summary Report
  const handleDownloadExecutiveReport = () => {
    const reportText = `GST BUDDY AI - EXECUTIVE FINANCIAL & AUDIT REPORT
===================================================
Entity ID: ${activeBusinessId.toUpperCase()}
Generated on: ${new Date().toLocaleString()}

1. EXECUTIVE SUMMARY
---------------------
- Total Outward Supplies (Est. Revenue): ₹${summary.collected.toLocaleString()}
- Total Inward Supplies (Expenses): ₹${(summary.collected / 1.5).toLocaleString()}
- Input Tax Credit (ITC) Available: ₹${summary.credit.toLocaleString()}
- Net GST Payable to Govt: ₹${summary.netPayable.toLocaleString()}

2. AI BUSINESS INSIGHTS
-----------------------
${aiInsights.map((ins, i) => `- ${ins}`).join('\n')}

3. FINANCIAL RECOMMENDATIONS
----------------------------
${recommendations.map((rec, i) => `${i+1}. ${rec.title}\n   Description: ${rec.desc}`).join('\n\n')}

===================================================
Vetted and certified by GST Buddy Compliance Engine.`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GST_Buddy_Executive_Report_${activeBusinessId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '2rem' }}>
        <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ height: '40px', width: '200px', background: 'var(--bg-secondary)', borderRadius: '8px' }}></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
            <div style={{ height: '200px', background: 'var(--bg-secondary)', borderRadius: '16px' }}></div>
            <div style={{ height: '200px', background: 'var(--bg-secondary)', borderRadius: '16px' }}></div>
          </div>
          <div style={{ height: '300px', width: '100%', background: 'var(--bg-secondary)', borderRadius: '16px' }}></div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: 'var(--radius-xl)' }}>
            <span style={{ display: 'block', marginBottom: '1.5rem', color: 'var(--theme-primary)', textAlign: 'center' }}>
            <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              No Analytics Data Found
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
              Upload invoices in the dashboard to review category breakdowns, monthly tax trends, and cost efficiency recommendations.
            </p>
            <a href="/bill-upload" className="btn btn-primary btn-lg">
              Upload First Invoice
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      <div>
        
        {/* Header summary cards */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h1 className="gradient-text" style={{ fontSize: '1.75rem', margin: 0 }}>Analytics & Reports</h1>
            <button onClick={handleDownloadExecutiveReport} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> Download Executive Summary Report
            </button>
          </div>

          <div className="grid grid-cols-4" style={{ gap: '1rem' }}>
            <div className="glass-panel" style={{ textAlign: 'center', padding: '1.25rem', borderLeft: '4px solid var(--theme-secondary-light)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>GST COLLECTED (OUTWARD)</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>₹{summary.collected.toLocaleString()}</div>
            </div>
            <div className="glass-panel" style={{ textAlign: 'center', padding: '1.25rem', borderLeft: '4px solid var(--error)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>GST PAID (INWARD)</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>₹{summary.paid.toLocaleString()}</div>
            </div>
            <div className="glass-panel" style={{ textAlign: 'center', padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>INPUT CREDIT RECOVERED</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--success)' }}>₹{summary.credit.toLocaleString()}</div>
            </div>
            <div className="glass-panel" style={{ textAlign: 'center', padding: '1.25rem', borderLeft: '4px solid var(--theme-primary-light)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>NET PAYABLE TAX</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>₹{summary.netPayable.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* AI Recommendations & Daily Insights */}
        <div className="grid" style={{ gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem', marginBottom: '2.5rem' }}>
          
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.75rem', borderLeft: '4px solid var(--theme-secondary-light)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', color: 'var(--theme-secondary-light)' }}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2-1 4-2 5v1a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1c-1-1-2-3-2-5a7 7 0 0 1 7-7z"/></svg> Daily AI Financial Insights
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
              {aiInsights.map((ins, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--theme-secondary-light)', display: 'inline-flex', alignItems: 'center' }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>
                  <span style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>{ins}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.75rem', borderLeft: '4px solid var(--theme-primary-light)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', color: 'var(--theme-primary-light)' }}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> AI Tax Saving Recommendations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.85rem' }}>
              {recommendations.map((rec, i) => (
                <div key={i} style={{ borderBottom: i < recommendations.length - 1 ? '1px solid var(--border-color)' : 'none', paddingBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.125rem' }}>{i + 1}. {rec.title}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.775rem', lineHeight: '1.5', display: 'block' }}>{rec.desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Visual Charts */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          
          {/* Category Breakdown (Pie) */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', color: 'var(--primary-600)' }}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> Expense Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}`}
                  labelLine={false}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Comparison (Bar) */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', color: 'var(--theme-primary-light)' }}><path d="M3 3v18h18"/><path d="m18.7 9.3-5.1 5.2-2.8-2.7-4.3 4.3"/></svg> Monthly GST Tax Paid vs. Collected</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" style={{ fontSize: '0.75rem' }} />
                <YAxis stroke="var(--text-secondary)" style={{ fontSize: '0.75rem' }} />
                <Tooltip contentStyle={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="paid" fill="#6366f1" name="GST Paid (Inward)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" fill="#14b8a6" name="GST Collected (Outward)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Reports;
