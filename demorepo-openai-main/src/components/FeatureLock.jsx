import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PLAN_PRICES } from '../config/plans';

/**
 * Reusable upgrade state (Part 15 of the entitlement spec).
 *
 * Renders a friendly "available with X plan" panel with an Upgrade button
 * instead of silently hiding the feature. Used by pages whose feature is
 * not included on the current plan or whose monthly quota is exhausted.
 *
 * Props:
 *   - featureName   : human label, e.g. "AI Accountant"
 *   - description   : what the feature does
 *   - requiredPlan  : 'pro' | 'business'
 *   - reason        : 'FEATURE_NOT_INCLUDED' | 'PLAN_LIMIT_REACHED' |
 *                     'FAIR_USE_LIMIT_REACHED' (defaults to NOT_INCLUDED)
 *   - usageText     : optional line shown under the description when the
 *                     reason is a limit, e.g. "You've used 5/5 this month."
 */
export default function FeatureLock({
  featureName,
  description,
  requiredPlan = 'pro',
  reason = 'FEATURE_NOT_INCLUDED',
  usageText = '',
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isBusiness = requiredPlan === 'business';
  const price = isBusiness ? PLAN_PRICES.business : PLAN_PRICES.pro;
  const upgradeLabel = isBusiness ? t('upgrade_to_business') : t('upgrade_to_pro');

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem 2rem',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
          {featureName}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: '0 auto 1rem auto', maxWidth: '360px' }}>
          {description}
        </p>

        {usageText && (
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.8rem',
              color: 'var(--warning)',
              marginBottom: '1.25rem',
            }}
          >
            {usageText}
          </div>
        )}

        <div style={{ marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {t('available_with', 'Available with')}:{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {isBusiness ? t('business_tier') : t('pro_tier')} {t('tier')}
          </strong>{' '}
          · ₹{price}/month
        </div>

        <button
          onClick={() => {
            localStorage.setItem('selectedPlan', requiredPlan);
            navigate('/pricing');
          }}
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.75rem', fontWeight: 700, fontSize: '0.9rem' }}
        >
          {upgradeLabel}
        </button>
      </div>
    </div>
  );
}
