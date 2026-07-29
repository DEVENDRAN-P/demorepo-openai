import React from 'react';

export function Logo({ variant = 'main', size, className, style }) {
  const brandGrad = (
    <defs>
      <linearGradient id="logo-brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--theme-primary, #6366f1)" />
        <stop offset="100%" stopColor="var(--theme-secondary, #14b8a6)" />
      </linearGradient>
      <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );

  const iconG = (
    <g>
      <polygon points="50,5 90,28 90,72 50,95 10,72 10,28" fill="url(#logo-brand-grad)" opacity="0.1" stroke="url(#logo-brand-grad)" strokeWidth="1.5" />
      <polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="none" stroke="url(#logo-brand-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 40,65 L 60,65 A 15,15 0 0,0 68,52 L 68,48 L 52,48 M 52,48 L 68,32 M 52,48 L 52,32" fill="none" stroke="url(#logo-brand-grad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#logo-glow)" />
      <path d="M 32,45 C 32,35 40,30 50,30" fill="none" stroke="url(#logo-brand-grad)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="68" cy="32" r="4.5" fill="var(--theme-secondary, #14b8a6)" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="52" cy="32" r="4.5" fill="var(--theme-primary, #6366f1)" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="52" cy="48" r="4.5" fill="#ffffff" stroke="url(#logo-brand-grad)" strokeWidth="2" />
    </g>
  );

  if (variant === 'icon') {
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 100 100" 
        width={size || '40px'} 
        height={size || '40px'} 
        className={className}
        style={style}
      >
        {brandGrad}
        {iconG}
      </svg>
    );
  }

  if (variant === 'white') {
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 320 80" 
        width={size || '160px'} 
        height={size || '40px'} 
        className={className}
        style={style}
      >
        <defs>
          <linearGradient id="logo-brand-grad-white" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
        <g transform="translate(10, 10) scale(0.6)">
          <polygon points="50,5 90,28 90,72 50,95 10,72 10,28" fill="url(#logo-brand-grad-white)" opacity="0.15" stroke="url(#logo-brand-grad-white)" strokeWidth="1.5" />
          <polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="none" stroke="url(#logo-brand-grad-white)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 40,65 L 60,65 A 15,15 0 0,0 68,52 L 68,48 L 52,48 M 52,48 L 68,32 M 52,48 L 52,32" fill="none" stroke="url(#logo-brand-grad-white)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 32,45 C 32,35 40,30 50,30" fill="none" stroke="url(#logo-brand-grad-white)" strokeWidth="6" strokeLinecap="round" />
          <circle cx="68" cy="32" r="4.5" fill="#2dd4bf" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="52" cy="32" r="4.5" fill="#818cf8" stroke="#ffffff" stroke-width="1.5" />
          <circle cx="52" cy="48" r="4.5" fill="#ffffff" stroke="url(#logo-brand-grad-white)" strokeWidth="2" />
        </g>
        <text x="85" y="44" fontFamily="system-ui, -apple-system, sans-serif" fontSize="22px" fontWeight="800" fill="#ffffff" letterSpacing="-0.5px">GST Buddy <tspan fill="url(#logo-brand-grad-white)">AI</tspan></text>
        <text x="85" y="58" fontFamily="system-ui, -apple-system, sans-serif" fontSize="11px" fontWeight="600" fill="#9ca3af" letterSpacing="1.5px">COMPLIANCE OS</text>
      </svg>
    );
  }

  if (variant === 'sidebar') {
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 240 60" 
        width={size || '160px'} 
        height={size || '40px'} 
        className={className}
        style={style}
      >
        {brandGrad}
        <g transform="translate(5, 5) scale(0.5)">
          {iconG}
        </g>
        <text x="65" y="36" fontFamily="system-ui, -apple-system, sans-serif" fontSize="18px" fontWeight="800" fill="var(--text-primary)" letterSpacing="-0.5px">GST Buddy <tspan fill="url(#logo-brand-grad)">AI</tspan></text>
      </svg>
    );
  }

  // Default: 'main'
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 320 80" 
      width={size || '180px'} 
      height={size || '45px'} 
      className={className}
      style={style}
    >
      {brandGrad}
      <g transform="translate(10, 10) scale(0.6)">
        {iconG}
      </g>
      <text x="85" y="44" fontFamily="system-ui, -apple-system, sans-serif" fontSize="22px" fontWeight="800" fill="var(--text-primary)" letterSpacing="-0.5px">GST Buddy <tspan fill="url(#logo-brand-grad)">AI</tspan></text>
      <text x="85" y="58" fontFamily="system-ui, -apple-system, sans-serif" fontSize="11px" fontWeight="600" fill="var(--text-secondary)" letterSpacing="1.5px">COMPLIANCE OS</text>
    </svg>
  );
}

export default Logo;
