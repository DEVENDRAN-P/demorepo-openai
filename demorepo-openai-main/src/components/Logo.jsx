import React from 'react';

export function Logo({ variant = 'main', size, className, style }) {
  const logoSrc = "/GST_LOGO.jpeg";
  
  if (variant === 'icon') {
    return (
      <img 
        src={logoSrc} 
        alt="GST Logo" 
        width={size || '40px'} 
        height={size || '40px'} 
        className={className} 
        style={{ borderRadius: '8px', objectFit: 'cover', ...style }}
      />
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', ...style }}>
        <img 
          src={logoSrc} 
          alt="GST Logo" 
          width="32px" 
          height="32px" 
          style={{ borderRadius: '6px', objectFit: 'cover' }}
        />
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          GST Buddy <span style={{ color: 'var(--theme-primary, #6366f1)' }}>AI</span>
        </span>
      </div>
    );
  }

  // Default / main / white
  const textColor = variant === 'white' ? '#ffffff' : 'var(--text-primary)';
  const secondaryColor = variant === 'white' ? '#9ca3af' : 'var(--text-secondary)';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', ...style }} className={className}>
      <img 
        src={logoSrc} 
        alt="GST Logo" 
        width="45px" 
        height="45px" 
        style={{ borderRadius: '8px', objectFit: 'cover' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: textColor, letterSpacing: '-0.5px' }}>
          GST Buddy <span style={{ color: 'var(--theme-primary, #6366f1)' }}>AI</span>
        </span>
        <span style={{ fontSize: '10px', fontWeight: 600, color: secondaryColor, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '2px' }}>
          COMPLIANCE OS
        </span>
      </div>
    </div>
  );
}

export default Logo;
