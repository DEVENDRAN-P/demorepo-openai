import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Navbar from '../components/Navbar';

function Reports({ user, setUser }) {
  const { t } = useTranslation();
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [summary, setSummary] = useState({ paid: 0, collected: 0, credit: 0, netPayable: 0 });
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const bills = JSON.parse(localStorage.getItem('bills') || '[]');
    
    if (bills.length === 0) {
      setHasData(false);
      return;
    }

    setHasData(true);

    // Calculate monthly data
    const monthlyMap = {};
    bills.forEach(bill => {
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

    // Calculate category breakdown
    const categoryMap = {};
    bills.forEach(bill => {
      const type = bill.expenseType || 'Others';
      categoryMap[type] = (categoryMap[type] || 0) + (bill.amount || 0);
    });

    const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    const category = Object.entries(categoryMap).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));
    setCategoryData(category);

    // Calculate summary
    const totalPaid = bills.reduce((sum, bill) => sum + (bill.taxAmount || 0), 0);
    const totalCollected = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    const inputCredit = totalPaid * 0.3; // Mock 30% input credit
    const netPayable = totalPaid - inputCredit;

    setSummary({
      paid: totalPaid,
      collected: totalCollected,
      credit: inputCredit,
      netPayable: netPayable,
    });
  }, []);

  if (!hasData) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--neutral-50)' }}>
        <Navbar user={user} setUser={setUser} />
        <div className="container section">
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>📊</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--neutral-900)' }}>
              No Data Available
            </h2>
            <p style={{ color: 'var(--neutral-600)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
              Upload your bills to see detailed analytics and reports about your GST compliance.
            </p>
            <a href="/bill-upload" className="btn btn-primary btn-lg">
              Upload Your First Bill
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neutral-50)' }}>
      <Navbar user={user} setUser={setUser} />

      <div className="container section">
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h1 className="card-title">
              <div className="card-title-icon">📊</div>
              <span>Analytics & Reports</span>
            </h1>
          </div>

          <div className="grid grid-cols-4" style={{ gap: '1rem' }}>
            <div className="card" style={{ background: 'var(--success-light)', borderColor: '#86efac', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('gst_collected')}
              </p>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#166534' }}>
                ₹{summary.collected.toLocaleString()}
              </p>
            </div>
            <div className="card" style={{ background: 'var(--error-light)', borderColor: '#fca5a5', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#991b1b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('gst_paid')}
              </p>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#991b1b' }}>
                ₹{summary.paid.toLocaleString()}
              </p>
            </div>
            <div className="card" style={{ background: 'var(--info-light)', borderColor: '#93c5fd', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('tax_credit')}
              </p>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#1e40af' }}>
                ₹{summary.credit.toLocaleString()}
              </p>
            </div>
            <div className="card" style={{ background: 'var(--primary-50)', borderColor: 'var(--primary-200)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-700)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Net Payable
              </p>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                ₹{summary.netPayable.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {/* Monthly Trend */}
          {monthlyData.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <div className="card-title-icon">📈</div>
                  <span>{t('monthly_summary')}</span>
                </h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" />
                  <XAxis dataKey="month" stroke="var(--neutral-500)" style={{ fontSize: '0.75rem' }} />
                  <YAxis stroke="var(--neutral-500)" style={{ fontSize: '0.75rem' }} />
                  <Tooltip contentStyle={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--neutral-200)' }} />
                  <Legend wrapperStyle={{ fontSize: '0.875rem' }} />
                  <Line type="monotone" dataKey="paid" stroke="#ef4444" strokeWidth={2} name="GST Paid" dot={{ fill: '#ef4444', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} name="GST Collected" dot={{ fill: '#10b981', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category Breakdown */}
          {categoryData.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <div className="card-title-icon">🎯</div>
                  <span>{t('category_breakdown')}</span>
                </h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ₹${entry.value.toLocaleString()}`}
                    labelStyle={{ fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--neutral-200)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bar Chart */}
          {monthlyData.length > 0 && (
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <div className="card-header">
                <h2 className="card-title">
                  <div className="card-title-icon">📊</div>
                  <span>Monthly Comparison</span>
                </h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" />
                  <XAxis dataKey="month" stroke="var(--neutral-500)" style={{ fontSize: '0.75rem' }} />
                  <YAxis stroke="var(--neutral-500)" style={{ fontSize: '0.75rem' }} />
                  <Tooltip contentStyle={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--neutral-200)' }} />
                  <Legend wrapperStyle={{ fontSize: '0.875rem' }} />
                  <Bar dataKey="paid" fill="#8b5cf6" name="GST Paid" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="collected" fill="#ec4899" name="GST Collected" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;
