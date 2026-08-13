import React from 'react';
import { useTranslation } from 'react-i18next';

export function Logo({ variant = 'main', size, className, style, onClick }) {
  const { t } = useTranslation();

  let logoSrc = "/logo-main.svg";
  if (variant === 'icon') logoSrc = "/logo-icon.svg";
  else if (variant === 'sidebar') logoSrc = "/logo-sidebar.svg";
  else if (variant === 'white') logoSrc = "/logo-white.svg";
  else if (variant === 'dark') logoSrc = "/logo-dark.svg";

  if (variant === 'icon') {
    return (
      <img
        src={logoSrc}
        alt={t('app_name', 'GST Buddy AI')}
        width={size || '36px'}
        height={size || '36px'}
        className={className}
        onClick={onClick}
        style={{ borderRadius: '8px', objectFit: 'contain', cursor: onClick ? 'pointer' : 'default', ...style }}
      />
    );
  }

  if (variant === 'sidebar') {
    return (
      <img
        src={logoSrc}
        alt={t('app_name', 'GST Buddy AI')}
        width={size || '145px'}
        height="auto"
        className={className}
        onClick={onClick}
        style={{ objectFit: 'contain', cursor: onClick ? 'pointer' : 'default', ...style }}
      />
    );
  }

  return (
    <img
      src={logoSrc}
      alt={t('app_name', 'GST Buddy AI')}
      width={size || '160px'}
      height="auto"
      className={className}
      onClick={onClick}
      style={{ objectFit: 'contain', cursor: onClick ? 'pointer' : 'default', ...style }}
    />
  );
}

export default Logo;
