import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '../context/DarkModeContext';
import { getPendingReminders, dismissReminder, generateReminderAlerts } from '../services/reminderService';
// eslint-disable-next-line no-unused-vars
import { getBills, migrateOldBillsKey } from '../utils/storageUtils';

const IconBell = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconLightbulb = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 1 7 7c0 2-1 4-2 5v1a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1c-1-1-2-3-2-5a7 7 0 0 1 7-7z" />
  </svg>
);

const IconSavings = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v12M9 9h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z" />
  </svg>
);

function ReminderPanel() {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [reminders, setReminders] = useState([]);
  const [guidanceTips, setGuidanceTips] = useState([]);
  const [costSavings, setCostSavings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRemindersAndGuidance();
    // Refresh reminders every 5 minutes
    const interval = setInterval(loadRemindersAndGuidance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadRemindersAndGuidance = async () => {
    try {
      // Get user from localStorage
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (user && user.uid) {
        // Fetch reminders from Firebase
        const dbReminders = await getPendingReminders(user.uid);
        const alerts = generateReminderAlerts(dbReminders);

        // Calculate current date info for deadline calculations
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // Calculate deadlines
        const gstr1Deadline = new Date(currentYear, currentMonth + 1, 11);
        const gstr3bDeadline = new Date(currentYear, currentMonth + 1, 20);
        const daysToGstr1 = Math.ceil((gstr1Deadline - currentDate) / (1000 * 60 * 60 * 24));
        const daysToGstr3b = Math.ceil((gstr3bDeadline - currentDate) / (1000 * 60 * 60 * 24));

        const localReminders = [];

        // Fallback reminders if no Firebase data
        if (alerts.length === 0) {
          if (daysToGstr1 > 0 && daysToGstr1 <= 10) {
            localReminders.push({
              id: `local-gstr1-${daysToGstr1}`,
              emoji: '📋',
              title: 'GSTR-1 Filing Due',
              message: `File GSTR-1 in ${daysToGstr1} day${daysToGstr1 > 1 ? 's' : ''} (by ${gstr1Deadline.toLocaleDateString()})`,
              severity: daysToGstr1 <= 3 ? 'critical' : 'warning',
              action: '/gst-forms',
            });
          }

          if (daysToGstr3b > 0 && daysToGstr3b <= 10) {
            localReminders.push({
              id: `local-gstr3b-${daysToGstr3b}`,
              emoji: '📝',
              title: 'GSTR-3B Filing Due',
              message: `File GSTR-3B in ${daysToGstr3b} day${daysToGstr3b > 1 ? 's' : ''} (by ${gstr3bDeadline.toLocaleDateString()})`,
              severity: daysToGstr3b <= 3 ? 'critical' : 'warning',
              action: '/gst-forms',
            });
          }
        }

        setReminders([...alerts, ...localReminders]);

        // Guidance Tips
        const tips = [
          {
            id: 1,
            icon: '💡',
            title: t('tip_itc_title'),
            description: t('tip_itc_desc'),
          },
          {
            id: 2,
            icon: '📱',
            title: t('tip_voice_title'),
            description: t('tip_voice_desc'),
          },
          {
            id: 3,
            icon: '🎯',
            title: t('tip_comply_title'),
            description: t('tip_comply_desc'),
          },
          {
            id: 4,
            icon: '📊',
            title: t('tip_analytics_title'),
            description: t('tip_analytics_desc'),
          },
        ];
        setGuidanceTips(tips);

        // Cost Savings Calculation
        // Get user ID from localStorage (set during login)
        const userStr = localStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const userId = currentUser?.id;

        // Migrate old storage format if needed
        if (userId) {
          migrateOldBillsKey(userId);
        }

        const bills_data = getBills(userId);
        const totalBills = bills_data.length;
        const monthsActive = Math.max(1, Math.ceil(totalBills / 10));
        const accountantFee = 3000;
        const appCost = 500;
        const savedAmount = (accountantFee - appCost) * monthsActive;

        setCostSavings({
          monthlyAccountantFee: accountantFee,
          monthlyAppCost: appCost,
          monthlySavings: accountantFee - appCost,
          totalSaved: savedAmount,
          monthsActive: monthsActive,
        });
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissReminder = async (reminderId) => {
    try {
      if (reminderId.startsWith('local-')) {
        // Local reminder, just remove from state
        setReminders(reminders.filter(r => r.id !== reminderId));
      } else {
        // Firebase reminder
        await dismissReminder(reminderId);
        setReminders(reminders.filter(r => r.id !== reminderId));
      }
    } catch (error) {
      console.error('Error dismissing reminder:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return { bg: 'var(--error-light)', border: '#dc2626', text: '#991b1b' };
      case 'warning':
        return { bg: 'var(--warning-light)', border: '#f59e0b', text: '#92400e' };
      case 'info':
      default:
        return { bg: 'var(--info-light)', border: '#3b82f6', text: '#1e40af' };
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--neutral-600)' }}>Loading reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <div className="card-title-icon" style={{ background: 'var(--warning-light)' }}>
                <IconBell />
              </div>
              <span>🔔 Reminders</span>
            </h2>
            <span className="badge badge-warning">{reminders.length}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {reminders.map((reminder) => {
              const colors = getSeverityColor(reminder.severity);
              return (
                <div
                  key={reminder.id}
                  style={{
                    padding: '1rem',
                    background: colors.bg,
                    borderLeft: `4px solid ${colors.border}`,
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <span style={{ fontSize: '1.5rem' }}>{reminder.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        color: colors.text,
                        marginBottom: '0.25rem',
                      }}>
                        {reminder.title}
                      </p>
                      <p style={{
                        fontSize: '0.8125rem',
                        color: colors.text,
                        opacity: 0.9,
                      }}>
                        {reminder.message}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                    {reminder.action && (
                      <Link
                        to={reminder.action}
                        className="btn btn-secondary btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        Act Now
                      </Link>
                    )}
                    <button
                      onClick={() => handleDismissReminder(reminder.id)}
                      className="btn btn-ghost btn-sm"
                      style={{
                        padding: '0.5rem 0.75rem',
                        color: colors.text,
                      }}
                      title="Dismiss reminder"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Guidance Tips */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <div className="card-title-icon" style={{ background: 'var(--primary-50)' }}>
              <IconLightbulb />
            </div>
            <span>💡 {t('compliance_tips')}</span>
          </h2>
        </div>

        <div>
          {guidanceTips.map((tip) => (
            <div
              key={tip.id}
              style={{
                padding: '0.875rem',
                background: 'var(--neutral-50)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                gap: '0.75rem',
              }}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{tip.icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--neutral-900)', marginBottom: '0.25rem' }}>
                  {tip.title}
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-600)', lineHeight: 1.5 }}>
                  {tip.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Savings */}
      {costSavings && costSavings.totalSaved > 0 && (
        <div className="card" style={{ background: isDarkMode ? '#1a3a1a' : 'var(--success-light)', borderColor: isDarkMode ? '#4ade80' : '#86efac' }}>
          <div className="card-header" style={{ borderBottom: `1px solid ${isDarkMode ? '#4ade80' : '#86efac'}` }}>
            <h2 className="card-title" style={{ color: isDarkMode ? '#ffffff' : '#166534' }}>
              <div className="card-title-icon" style={{ background: isDarkMode ? '#ffffff' : 'white' }}>
                <IconSavings />
              </div>
              <span>💰 {t('cost_savings')}</span>
            </h2>
          </div>

          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ fontSize: '0.875rem', color: isDarkMode ? '#ffffff' : '#166534', marginBottom: '0.5rem' }}>
              You've saved so far:
            </p>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: isDarkMode ? '#ffffff' : '#166534', marginBottom: '0.5rem' }}>
              ₹{costSavings.totalSaved.toLocaleString()}
            </p>
            <p style={{ fontSize: '0.8125rem', color: isDarkMode ? '#ffffff' : '#166534' }}>
              vs. hiring an accountant (₹{costSavings.monthlyAccountantFee.toLocaleString()}/month)
            </p>
          </div>

          <div style={{
            background: isDarkMode ? '#2d2d2d' : 'white',
            padding: '0.875rem',
            borderRadius: 'var(--radius-lg)',
            fontSize: '0.8125rem',
            color: isDarkMode ? '#ffffff' : '#166534',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Monthly app cost:</span>
              <span style={{ fontWeight: 600 }}>₹{costSavings.monthlyAppCost}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Typical accountant fee:</span>
              <span style={{ fontWeight: 600 }}>₹{costSavings.monthlyAccountantFee}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: `1px solid ${isDarkMode ? '#4ade80' : '#86efac'}` }}>
              <span style={{ fontWeight: 700 }}>Monthly savings:</span>
              <span style={{ fontWeight: 800, color: isDarkMode ? '#86efac' : '#15803d' }}>₹{costSavings.monthlySavings}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReminderPanel;
