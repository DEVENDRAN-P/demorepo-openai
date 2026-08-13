import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDarkMode } from '../context/DarkModeContext';
import { motion, AnimatePresence, useInView, animate } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Logo from '../components/Logo';
import { 
  Sparkles, 
  Play, 
  ArrowRight, 
  Upload, 
  Bell, 
  FileText, 
  CheckCircle2, 
  Bot, 
  Layers, 
  ShieldCheck, 
  ChevronDown,
  LayoutDashboard,
  BrainCircuit,
  MessageSquare,
  FileCheck,
  Calendar,
  Settings,
  FileSpreadsheet,
  Users,
  Terminal,
  TrendingUp,
  AlertTriangle,
  FolderLock,
  Cpu,
  Scan
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  Tooltip 
} from 'recharts';
import EndToEndComplianceSuite from '../components/EndToEndComplianceSuite';

const monthlyData = [
  { name: 'Jan', Revenue: 22000, Expenses: 14000 },
  { name: 'Feb', Revenue: 34000, Expenses: 19000 },
  { name: 'Mar', Revenue: 45000, Expenses: 22000 },
  { name: 'Apr', Revenue: 58000, Expenses: 28000 },
];

// Reusable Counter Component using Framer Motion
function Counter({ value, suffix = "", duration = 1.5, decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  
  useEffect(() => {
    if (inView) {
      const node = ref.current;
      const controls = animate(0, value, {
        duration,
        ease: "easeOut",
        onUpdate(latest) {
          node.textContent = latest.toLocaleString('en-IN', { 
            maximumFractionDigits: decimals,
            minimumFractionDigits: decimals
          }) + suffix;
        }
      });
      return () => controls.stop();
    }
  }, [inView, value, suffix, duration, decimals]);
  
  return <span ref={ref} className="font-extrabold">0{suffix}</span>;
}

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useDarkMode();
  
  // Translation & Language switcher states
  const { t, i18n } = useTranslation();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  
  // Hover dropdown state management
  const [activeDropdown, setActiveDropdown] = useState(null);

  // SECTION 3: How AI Works state
  const [activeTimelineStep, setActiveTimelineStep] = useState(0);

  // SECTION 5: Chat Simulation states
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatState, setChatState] = useState('idle'); // idle, typing-user, user-sent, typing-ai, ai-sent


  const handleStartFree = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      localStorage.setItem('authRedirect', '/dashboard');
      navigate('/signup');
    }
  };

  const handleMockNav = (targetRoute) => {
    if (isAuthenticated) {
      navigate(targetRoute);
    } else {
      localStorage.setItem('authRedirect', targetRoute);
      navigate('/signup');
    }
  };

  // Timeline Steps
  const timelineSteps = [
    { 
      title: t('upload_invoice'), 
      subtitle: t('pdf_image_xml'), 
      metric: t('timeline_metric_ingestion'), 
      desc: t('timeline_desc_upload'), 
      icon: Upload 
    },
    { 
      title: t('ai_ocr'), 
      subtitle: t('neural_extraction'), 
      metric: t('timeline_metric_accuracy'), 
      desc: t('timeline_desc_ocr'), 
      icon: Scan 
    },
    { 
      title: t('invoice_intelligence'), 
      subtitle: t('hsn_tax_audit'), 
      metric: t('timeline_metric_hsn'), 
      desc: t('timeline_desc_hsn'), 
      icon: Cpu 
    },
    { 
      title: t('gst_validation'), 
      subtitle: t('gstr2b_cross_check'), 
      metric: t('timeline_metric_portal'), 
      desc: t('timeline_desc_portal'), 
      icon: ShieldCheck 
    },
    { 
      title: t('compliance_check'), 
      subtitle: t('penalty_risk_filter'), 
      metric: t('timeline_metric_zero'), 
      desc: t('timeline_desc_compliance'), 
      icon: FileCheck 
    },
    { 
      title: t('ai_accountant'), 
      subtitle: t('automated_ledger'), 
      metric: t('timeline_metric_100'), 
      desc: t('timeline_desc_ledger'), 
      icon: Bot 
    },
    { 
      title: t('dashboard_sync'), 
      subtitle: t('real_time_forecasts'), 
      metric: t('timeline_metric_live'), 
      desc: t('timeline_desc_sync'), 
      icon: LayoutDashboard 
    }
  ];

  // Navigation Dropdown Content
  const navDropdowns = {
    Platform: [
      { name: t('ai_invoice_intelligence'), desc: t('nav_ai_invoice_desc'), icon: BrainCircuit, path: '/bill-upload' },
      { name: t('gst_forms'), desc: t('nav_gst_forms_desc'), icon: FileSpreadsheet, path: '/gst-forms' },
      { name: t('nav_returns_tracker'), desc: t('nav_returns_tracker_desc'), icon: FileCheck, path: '/compliance' },
      { name: t('nav_audit_penalty'), desc: t('nav_audit_penalty_desc'), icon: ShieldCheck, path: '/audit' }
    ],
    Solutions: [
      { name: t('nav_for_msmes'), desc: t('nav_for_msmes_desc'), icon: Users, path: '/dashboard' },
      { name: t('nav_tax_practitioners'), desc: t('nav_tax_practitioners_desc'), icon: Layers, path: '/business' },
      { name: t('nav_online_sellers'), desc: t('nav_online_sellers_desc'), icon: TrendingUp, path: '/dashboard' }
    ],
    Resources: [
      { name: t('nav_compliance_chat'), desc: t('nav_compliance_chat_desc'), icon: Bot, path: '/agent' },
      { name: t('nav_document_vault'), desc: t('nav_document_vault_desc'), icon: FolderLock, path: '/documents' },
      { name: t('nav_integrations'), desc: t('nav_integrations_desc'), icon: Terminal, path: '/settings' },
      { name: t('nav_penalty_calculator'), desc: t('nav_penalty_calculator_desc'), icon: AlertTriangle, path: '/penalty' }
    ]
  };

  // Run AI Timeline Auto Cycle (1 second loop)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTimelineStep((prev) => (prev + 1) % timelineSteps.length);
    }, 1000);
    return () => clearInterval(timer);
  }, [timelineSteps.length]);


  // Run Live AI Chat Simulation loop
  useEffect(() => {
    if (chatState === 'idle') {
      const timer = setTimeout(() => {
        setChatState('typing-user');
      }, 1000);
      return () => clearTimeout(timer);
    }
    
    if (chatState === 'typing-user') {
      let currentText = "";
      const fullText = t('chat_sim_user_question');
      let index = 0;
      const interval = setInterval(() => {
        if (index < fullText.length) {
          currentText += fullText[index];
          setChatMessages([{ sender: 'user', text: currentText }]);
          index++;
        } else {
          clearInterval(interval);
          setChatState('user-sent');
        }
      }, 50);
      return () => clearInterval(interval);
    }

    if (chatState === 'user-sent') {
      const timer = setTimeout(() => {
        setChatState('typing-ai');
      }, 800);
      return () => clearTimeout(timer);
    }

    if (chatState === 'typing-ai') {
      setIsTyping(true);
      const timer = setTimeout(() => {
        setIsTyping(false);
        setChatMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: t('chat_sim_ai_answer'),
            itc: t('chat_sim_itc'),
            badge: t('chat_sim_badge')
          }
        ]);
        setChatState('ai-sent');
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (chatState === 'ai-sent') {
      const timer = setTimeout(() => {
        // Reset Chat
        setChatMessages([]);
        setChatState('idle');
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [chatState]);

  return (
    <div className="min-h-screen relative font-sans transition-colors duration-300 overflow-x-hidden"
    style={{
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      background: isDarkMode 
        ? 'radial-gradient(circle at center, #0f1026 0%, #070514 100%)' 
        : 'radial-gradient(circle at center, var(--primary-50) 0%, var(--bg-primary) 100%)',
      color: isDarkMode ? '#f8fafc' : '#0f172a'
    }}>
      {/* 1. Global Inline Styling for Animations & Mesh Grid Overlay */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-badge-up {
          0% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
          100% { transform: translateY(0px) rotate(-1deg); }
        }
        @keyframes float-badge-down {
          0% { transform: translateY(0px) rotate(1deg); }
          50% { transform: translateY(8px) rotate(-1deg); }
          100% { transform: translateY(0px) rotate(1deg); }
        }
        @keyframes float-badge-rotate {
          0% { transform: translateY(0px) rotate(0.5deg); }
          50% { transform: translateY(-6px) rotate(-1deg); }
          100% { transform: translateY(0px) rotate(0.5deg); }
        }
        
        .float-1 { animation: float-badge-up 6s ease-in-out infinite; }
        .float-2 { animation: float-badge-down 5s ease-in-out infinite 0.7s; }
        .float-3 { animation: float-badge-rotate 7.5s ease-in-out infinite 1.4s; }
        
        /* Grid pattern overlay */
        .mesh-grid {
          background-image: radial-gradient(${isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.06)'} 1.5px, transparent 1.5px);
          background-size: 32px 32px;
          mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 95%);
          -webkit-mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 95%);
        }

        /* Shadow utilities */
        .card-shadow {
          box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.04), 0 8px 10px -6px rgba(99, 102, 241, 0.04);
        }

        .dashboard-shadow {
          box-shadow: 0 25px 60px -15px rgba(99, 102, 241, 0.12), 0 0 1px 1px rgba(99, 102, 241, 0.05);
        }
        
        /* Interactive scale transitions */
        .btn-hover-effect {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-hover-effect:hover {
          transform: translateY(-2px);
        }
        
        /* 3D Dashboard Perspective transform */
        .dashboard-tilt {
          transform: perspective(1000px) rotateY(-8deg) rotateX(6deg) rotateZ(1deg);
          transition: transform 0.4s ease-out;
        }
        .dashboard-tilt:hover {
          transform: perspective(1000px) rotateY(-4deg) rotateX(3deg) rotateZ(0.5deg);
        }

        /* Feature Card Border Glow effect */
        .feature-glow {
          position: relative;
          background: ${isDarkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.6)'};
          background-clip: padding-box;
          border: 1px solid transparent;
        }
        .feature-glow::after {
          position: absolute;
          top: -1px; bottom: -1px; left: -1px; right: -1px;
          background: linear-gradient(135deg, rgba(99,102,241,0) 0%, rgba(99,102,241,0) 100%);
          content: '';
          z-index: -1;
          border-radius: 1rem;
          transition: background 0.3s;
        }
        .feature-glow:hover::after {
          background: linear-gradient(135deg, rgba(79,70,229,0.3) 0%, rgba(37,99,235,0.3) 50%, rgba(139,92,246,0.3) 100%);
        }
      `}} />

      {/* Grid background mesh */}
      <div className="mesh-grid absolute inset-0 pointer-events-none z-0"></div>

      {/* 2. Top Announcement Bar */}
      <div className="w-full bg-[#1E1B4B] text-[#E0E7FF] text-xs md:text-sm font-medium py-3 px-4 text-center flex items-center justify-center gap-3 relative z-50 border-b border-indigo-950/20">
        <span className="bg-[#6366F1] text-white text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex-shrink-0">
          NEW
        </span>
        <span className="truncate">
          {t('announcement_text')}
        </span>
        <button 
          onClick={handleStartFree}
          className="text-[#38BDF8] hover:text-[#7DD3FC] font-semibold underline flex-shrink-0 transition-opacity hover:opacity-85"
        >
          {t('explore_now')} →
        </button>
      </div>

      {/* 3. Sticky Glassmorphic Navbar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md transition-all duration-300 border-b bg-white/70 border-slate-200/60 dark:bg-[#070514]/70 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Left */}
          <Link to="/" className="flex items-center gap-3 group decoration-none">
            <Logo variant="sidebar" size="145px" />
          </Link>

          {/* Desktop Navigation Links with Interactive Dropdowns */}
          <nav className="hidden lg:flex items-center gap-8">
            {Object.keys(navDropdowns).map((menuName) => (
              <div 
                key={menuName} 
                className="relative"
                onMouseEnter={() => setActiveDropdown(menuName)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 py-4 transition-colors bg-transparent border-0 cursor-pointer">
                  <span>{t(menuName === 'Platform' ? 'platform' : menuName === 'Solutions' ? 'solutions' : 'resources')}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === menuName ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />
                </button>

                {/* Dropdown Flyout Card */}
                {activeDropdown === menuName && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-[48px] w-80 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 shadow-2xl transition-all duration-200">
                    <div className="grid gap-1">
                      {navDropdowns[menuName].map((item) => (
                        <button
                          key={item.name}
                          onClick={() => {
                            setActiveDropdown(null);
                            handleMockNav(item.path);
                          }}
                          className="w-full text-left flex items-start gap-3.5 p-2.5 rounded-xl hover:bg-indigo-50/50 dark:hover:bg-slate-700/50 border-0 bg-transparent transition-colors group cursor-pointer"
                        >
                          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <item.icon size={16} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                              {item.name}
                            </h4>
                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <span 
              onClick={() => navigate('/pricing')}
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
            >
              {t('pricing')}
            </span>
            <span 
              onClick={() => handleMockNav('/support')}
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
            >
              {t('about_us')}
            </span>
          </nav>

          {/* Right Actions */}
          <div className="hidden sm:flex items-center gap-4">
            <button 
              onClick={() => handleMockNav('/support')}
              className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-transparent border-0 cursor-pointer"
            >
              {t('contact_sales')}
            </button>
            
            {isAuthenticated ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn-hover-effect px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-600/25 border-0 cursor-pointer"
              >
                {t('go_to_dashboard')}
              </button>
            ) : (
              <button 
                onClick={handleStartFree}
                className="btn-hover-effect px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-600/25 border-0 cursor-pointer"
              >
                {t('start_free')}
              </button>
            )}

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                <span>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" x2="22" y1="12" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </span>
                <span>{['English', 'हिंदी', 'தமிழ்', 'മലയാളം', 'ಕನ್ನಡ'][['en', 'hi', 'ta', 'ml', 'kn'].indexOf(i18n.language)] || i18n.language.toUpperCase()}</span>
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1.5 shadow-xl z-50">
                  {['en', 'hi', 'ta', 'ml', 'kn'].map((code, idx) => (
                    <button
                      key={code}
                      onClick={() => {
                        i18n.changeLanguage(code);
                        localStorage.setItem('language', code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold border-0 bg-transparent cursor-pointer transition-colors ${i18n.language === code ? 'bg-indigo-50 text-indigo-600 dark:bg-slate-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                      <span className="mr-2">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                          <circle cx="12" cy="12" r="10" />
                          <line x1="2" x2="22" y1="12" y2="12" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                      </span>
                      <span>{['English', 'हिंदी', 'தமிழ்', 'മലയാളം', 'ಕನ್ನಡ'][idx]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* 4. Hero Section Layout Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 relative z-10">
        
        {/* HERO COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center mb-24">
          
          {/* LEFT COLUMN: Hero Copy & CTAs */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            
            {/* Sparkle Badge Top */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/50 dark:bg-indigo-950/40 dark:border-indigo-900/30 text-indigo-950 dark:text-indigo-200 text-xs font-bold mb-6 tracking-wide shadow-sm shadow-indigo-500/5">
              <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>{t('hero_badge')}</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white mb-6">
              {t('hero_title_automate')} <br />
              {t('hero_title_compliant')} <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent inline-block">
                {t('hero_title_grow')}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-8 max-w-xl">
              {t('hero_subtitle')}
            </p>

            {/* Feature Cards Grid (4 Horizontal Feature Cards in 2x2 grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10 max-w-xl">
              
              {/* Card 1: AI Invoice Intelligence */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 card-shadow shadow-slate-100 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                  <BrainCircuit size={20} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">{t('ai_invoice_intelligence')}</h4>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-0.5">{t('accuracy_99')}</p>
                </div>
              </div>

              {/* Card 2: GST Compliance */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 card-shadow shadow-slate-100 hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                  <FileCheck size={20} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">{t('gst_compliance')}</h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">{t('always_on_track')}</p>
                </div>
              </div>

              {/* Card 3: Penalty Prevention */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 card-shadow shadow-slate-100 hover:border-teal-300 dark:hover:border-teal-800 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-teal-600 dark:text-teal-400 flex-shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">{t('penalty_prevention')}</h4>
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-bold mt-0.5">{t('ai_risk_detection')}</p>
                </div>
              </div>

              {/* Card 4: AI Accountant */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 card-shadow shadow-slate-100 hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-500 flex-shrink-0">
                  <MessageSquare size={20} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">{t('ai_accountant')}</h4>
                  <p className="text-xs text-amber-600 dark:text-amber-500 font-bold mt-0.5">{t('ask_anything')}</p>
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 w-full">
              <button 
                onClick={handleStartFree}
                className="btn-hover-effect inline-flex items-center gap-2 px-7 py-4 text-base font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 rounded-lg shadow-xl shadow-indigo-600/25 border-0 cursor-pointer animate-pulse"
              >
                <span>{t('start_free_now')}</span>
                <ArrowRight size={18} />
              </button>

              <button 
                onClick={() => handleMockNav('/support')}
                className="btn-hover-effect inline-flex items-center gap-2 px-6 py-4 text-base font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                <Play size={16} fill="currentColor" className="text-slate-600 dark:text-slate-300" />
                <span>{t('book_a_demo')}</span>
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: Interactive Dashboard Preview & Floating Badges */}
          <div className="lg:col-span-6 relative flex items-center justify-center z-10 w-full mt-10 lg:mt-0">
            
            {/* Tilted Floating Badges */}
            <div className="float-1 hidden md:flex absolute -top-8 -left-8 md:-left-12 z-30 items-center gap-3 bg-white/85 dark:bg-slate-800/85 border border-purple-200 dark:border-purple-900 rounded-2xl p-3 shadow-xl backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <FileSpreadsheet size={16} />
              </div>
              <div className="text-left">
                <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{t('gst_status')}</span>
                <strong className="text-xs text-purple-600 dark:text-purple-400 font-extrabold">{t('feature_gstr1_ready')}</strong>
              </div>
            </div>

            <div className="float-2 hidden md:flex absolute -bottom-6 -left-4 md:-left-8 z-30 items-center gap-3 bg-white/85 dark:bg-slate-800/85 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-3.5 shadow-xl backdrop-blur-md">
              <div className="w-8.5 h-8.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Upload size={16} />
              </div>
              <div className="text-left">
                <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{t('feature_ai_extraction')}</span>
                <strong className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold">{t('feature_itc_drafted')}</strong>
              </div>
            </div>

            <div className="float-3 hidden md:flex absolute -top-6 -right-4 md:-right-8 z-30 items-center gap-3 bg-white/85 dark:bg-slate-800/85 border border-blue-200 dark:border-blue-900 rounded-2xl p-3 shadow-xl backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <ShieldCheck size={16} />
              </div>
              <div className="text-left">
                <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{t('feature_notice_audit')}</span>
                <strong className="text-xs text-blue-600 dark:text-blue-400 font-extrabold">{t('feature_zero_risks')}</strong>
              </div>
            </div>

            {/* Dashboard Mockup Container */}
            <div className="dashboard-tilt w-full max-w-[580px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl dashboard-shadow flex overflow-hidden h-[440px] text-slate-800 dark:text-slate-100">
              <aside className="w-[125px] flex-shrink-0 bg-slate-50 dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800/80 py-4 px-2 flex flex-col justify-between select-none">
                <div className="flex flex-col gap-1.5 text-left">
                  <div className="flex items-center gap-1.5 px-1.5 mb-4">
                    <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center text-[10px] font-extrabold text-white">G</div>
                    <span className="font-extrabold text-[10px] text-slate-900 dark:text-white leading-none">GST Buddy</span>
                  </div>

                  {[
                    { label: t('dashboard'), icon: LayoutDashboard, path: '/dashboard', active: true },
                    { label: t('invoices_ledger'), icon: FileText, path: '/invoices' },
                    { label: t('ai_accountant'), icon: Bot, path: '/agent' },
                    { label: t('compliance_center'), icon: ShieldCheck, path: '/compliance' },
                    { label: t('mock_returns_filing'), icon: FileCheck, path: '/gst-forms' },
                    { label: t('document_assistant'), icon: FolderLock, path: '/documents' },
                    { label: t('analytics_reports'), icon: FileSpreadsheet, path: '/reports' },
                    { label: t('business_health_index'), icon: CheckCircle2, path: '/health' },
                    { label: t('notifications'), icon: Bell, path: '/notifications' },
                    { label: t('settings'), icon: Settings, path: '/settings' }
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleMockNav(item.path)}
                      className={`w-full flex items-center gap-2 p-1.5 rounded-lg border-0 cursor-pointer text-left ${
                        item.active 
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold' 
                          : 'bg-transparent text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <item.icon size={12} className="flex-shrink-0" />
                      <span className="text-[9.5px] truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </aside>

              <div className="flex-1 flex flex-col overflow-hidden text-left bg-white dark:bg-slate-900">
                <header className="h-14 border-b border-slate-200/80 dark:border-slate-800/80 px-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-none">{t('business_health_index')}</h3>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5 inline-block">{t('mock_realtime_audit')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-950">
                      <Calendar size={10} />
                      <span>Apr 01 - Apr 30, 2024</span>
                    </div>

                    <button 
                      onClick={() => handleMockNav('/bill-upload')}
                      className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9.5px] inline-flex items-center gap-1 border-0 cursor-pointer"
                    >
                      <Upload size={10} />
                      <span>{t('mock_upload_invoice')}</span>
                    </button>

                    <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors">
                      <Bell size={12} />
                    </div>

                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop" 
                      alt="Profile" 
                      className="w-7 h-7 rounded-full object-cover border border-indigo-200/60"
                    />
                  </div>
                </header>

                <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3.5 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent flex items-center justify-center text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        96
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none">{t('mock_health')}</span>
                        <strong className="text-[10px] text-slate-900 dark:text-white block font-extrabold truncate mt-0.5">96 {t('mock_excellent')}</strong>
                        <span className="text-[7.5px] text-emerald-500 font-bold leading-none">+12% {t('mock_vs_last_month')}</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-2.5">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none">{t('mock_gst_liability')}</span>
                      <strong className="text-[11.5px] text-red-500 font-extrabold block mt-0.5">₹24,560</strong>
                      <span className="text-[8px] text-slate-400 font-semibold leading-none">{t('mock_this_month')}</span>
                    </div>

                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-2.5">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none">{t('mock_itc_available')}</span>
                      <strong className="text-[11.5px] text-emerald-500 font-extrabold block mt-0.5">₹12,340</strong>
                      <span className="text-[8px] text-slate-400 font-semibold leading-none">{t('mock_this_month')}</span>
                    </div>

                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-2.5">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none">{t('mock_compliance_score')}</span>
                      <strong className="text-[11.5px] text-slate-900 dark:text-white font-extrabold block mt-0.5">98%</strong>
                      <span className="text-[8.5px] text-emerald-500 font-bold flex items-center gap-0.5 mt-0.5 leading-none">
                        <CheckCircle2 size={8} /> {t('mock_up_to_date')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1 leading-none">
                          <Sparkles size={10} className="text-indigo-500" />
                          <span>{t('mock_ai_insights')}</span>
                        </h4>
                        
                        <div className="flex flex-col gap-2">
                          <div className="border-l-2 border-indigo-500 pl-1.5">
                            <p className="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight">{t('mock_3_invoices_review')}</p>
                            <span className="text-[7.5px] text-slate-400 leading-none">{t('mock_potential_itc')}</span>
                          </div>
                          
                          <div className="border-l-2 border-amber-500 pl-1.5">
                            <p className="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight">{t('mock_gstr3b_due')}</p>
                            <span className="text-[7.5px] text-slate-400 leading-none">{t('mock_for_april')}</span>
                          </div>

                          <div className="border-l-2 border-emerald-500 pl-1.5">
                            <p className="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight">{t('mock_cashflow_healthy')}</p>
                            <span className="text-[7.5px] text-slate-400 leading-none">{t('mock_keep_good_work')}</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleMockNav('/insights')}
                        className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-left mt-3 bg-transparent border-0 cursor-pointer p-0"
                      >
                        {t('mock_view_all_insights')} →
                      </button>
                    </div>

                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider leading-none">{t('mock_monthly_overview')}</h4>
                          <div className="flex gap-1.5 text-[7px] font-bold text-slate-400 select-none">
                            <span className="text-indigo-600">● Rev</span>
                            <span className="text-blue-500">● Exp</span>
                          </div>
                        </div>

                        <div className="w-full h-[95px] mt-1.5">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                              <XAxis dataKey="name" stroke="#94A3B8" fontSize={7} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ fontSize: '7px', padding: '1px 3px', background: '#0F172A', border: 'none', borderRadius: '3px', color: '#fff' }} />
                              <Line type="monotone" dataKey="Revenue" stroke="#4F46E5" strokeWidth={1.5} dot={false} />
                              <Line type="monotone" dataKey="Expenses" stroke="#2563EB" strokeWidth={1.2} dot={false} strokeDasharray="2 2" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 leading-none">{t('mock_top_expenses')}</h4>
                        
                        <div className="flex flex-col gap-2">
                          <div>
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 mb-0.5">
                              <span className="truncate">{t('mock_exp_purchases')}</span>
                              <span>₹41,370 (32%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600 rounded-full" style={{ width: '32%' }}></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 mb-0.5">
                              <span className="truncate">{t('mock_exp_office')}</span>
                              <span>₹12,450 (18%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: '18%' }}></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 mb-0.5">
                              <span className="truncate">{t('mock_exp_travel')}</span>
                              <span>₹8,370 (12%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: '12%' }}></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 mb-0.5">
                              <span className="truncate">{t('mock_exp_marketing')}</span>
                              <span>₹6,550 (9%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: '9%' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* TRUST / SOCIAL PROOF SECTION */}
        <section className="text-center mb-32 relative z-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400 mb-8 select-none">
            {t('trusted_by')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60 dark:opacity-40">
            {['TATA', 'Zoho', 'Cashfree', 'Flipkart', 'Zomato', 'Swiggy', 'Deloitte', 'IDFC FIRST Bank', 'CRED', 'Paytm'].map((logo) => (
              <span 
                key={logo} 
                className="text-base sm:text-lg font-extrabold tracking-tight text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors select-none"
              >
                {logo}
              </span>
            ))}
          </div>
        </section>

        {/* SECTION 3: How AI Works (Interactive Horizontal Timeline) */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-32 relative z-10"
        >
          {/* Header Copy with pulsing status dot */}
          <div className="text-center mb-12 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-4 select-none">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              {t('automated_invoice_journey')}
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t('how_it_works')}
            </h2>
            
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-semibold mt-2.5">
              {t('automated_journey')}
            </p>
          </div>

          {/* Timeline Container */}
          <div className="bg-white/70 dark:bg-[#0B0F19]/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md rounded-3xl relative overflow-hidden p-8 md:p-12 card-shadow">
            {/* Aurora Background Mesh divs */}
            <div className="w-72 h-72 rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl absolute -top-20 -left-20 pointer-events-none"></div>
            <div className="w-72 h-72 rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-3xl absolute -bottom-20 -right-20 pointer-events-none"></div>

            {/* Connecting Timeline Traveling Progress Bar */}
            <div className="absolute top-[75px] left-12 right-12 h-1 bg-slate-200 dark:bg-slate-800 hidden md:block z-0">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full" 
                animate={{ width: `${(activeTimelineStep / (timelineSteps.length - 1)) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Horizontal steps wrapper */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-8 md:gap-4 relative z-10">
              {timelineSteps.map((step, idx) => {
                const IconComponent = step.icon;
                const isActive = idx === activeTimelineStep;
                const isCompleted = idx < activeTimelineStep;
                
                return (
                  <div 
                    key={step.title}
                    onClick={() => setActiveTimelineStep(idx)}
                    className="flex flex-col items-center cursor-pointer group text-center"
                  >
                    {/* Node Icon Container */}
                    <div className="relative mb-4">
                      {/* Glow rings pulse animation around active node every 1 second */}
                      {isActive && (
                        <>
                          <motion.span 
                            className="absolute inset-0 rounded-2xl bg-indigo-500/30 dark:bg-indigo-400/20 blur-md"
                            animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                          />
                          <motion.span 
                            className="absolute inset-0 rounded-2xl bg-blue-500/20 dark:bg-blue-400/15 blur-md"
                            animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.2 }}
                          />
                        </>
                      )}
                      
                      {/* Node Circle */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 relative z-10 ${
                        isActive 
                          ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xl shadow-indigo-500/30 scale-110' 
                          : isCompleted
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-2 border-emerald-500 group-hover:scale-105'
                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-900 group-hover:scale-105'
                      }`}>
                        <IconComponent size={22} />
                      </div>

                      {/* Completed Steps Checkmark Badge */}
                      {isCompleted && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md z-20 border border-white dark:border-slate-800">
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Step Title & Details */}
                    <div className="px-1">
                      <h4 className={`text-[13px] font-extrabold transition-colors duration-200 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-300'}`}>
                        {step.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 leading-tight">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Step Detail Card with AnimatePresence transitions */}
            <div className="mt-12 max-w-2xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTimelineStep}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden backdrop-blur-sm"
                >
                  {/* Transition pulse timer progress bar (1 second duration) */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800/60">
                    <motion.div 
                      key={activeTimelineStep}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1, ease: "linear" }}
                      className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        {t('step_x_of_y', { current: activeTimelineStep + 1, total: timelineSteps.length })}
                      </span>
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {t('active_engine')}
                      </span>
                    </div>
                    
                    {/* Metric indicator */}
                    <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 px-2 py-0.5 rounded">
                      {timelineSteps[activeTimelineStep].metric}
                    </div>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
                    {timelineSteps[activeTimelineStep].title}
                  </h3>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-3">
                    {timelineSteps[activeTimelineStep].subtitle}
                  </p>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    {timelineSteps[activeTimelineStep].desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
            
          </div>
        </motion.section>

        {/* SECTION 4: Feature Grid (10-Feature Premium Glass Cards) */}
        <EndToEndComplianceSuite />

        {/* SECTION 5: Live AI Demo (Interactive Chat Simulation) */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-32 relative z-10"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t('talk_to_ai_accountant')}
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-semibold mt-2.5">
              {t('talk_to_ai_accountant_desc')}
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/5 backdrop-blur-md">
            
            {/* Header simulated app bar */}
            <div className="bg-slate-50/80 dark:bg-slate-950/80 px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">{t('ai_accountant_online')}</span>
              </div>
              
              <div className="flex gap-2">
                {[t('file_gstr3b'), t('verify_itc')].map(label => (
                  <button 
                    key={label}
                    onClick={() => setChatState('typing-user')}
                    className="text-[9.5px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 bg-slate-100 dark:bg-slate-850 px-2 py-1 rounded-md border-0 cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Box body */}
            <div className="p-6 min-h-[250px] flex flex-col justify-end gap-4 text-left">
              <AnimatePresence>
                {chatMessages.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 ${
                      msg.sender === 'user' 
                        ? 'bg-indigo-650 text-white shadow-md' 
                        : 'bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 text-slate-800 dark:text-slate-100'
                    }`}>
                      <p className="text-xs font-semibold leading-relaxed">{msg.text}</p>
                      
                      {msg.sender === 'ai' && (
                        <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2">
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{msg.itc}</p>
                          
                          <div className="inline-flex items-center gap-1.5 text-[9.5px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-md border border-amber-200/50">
                            <Sparkles size={11} />
                            <span>{msg.badge}</span>
                          </div>

                          <div className="flex gap-2 mt-1">
                            <button 
                              onClick={() => handleMockNav('/gst-forms')}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-[10px] font-bold hover:bg-indigo-700 border-0 cursor-pointer"
                            >
                              {t('file_gstr3b')}
                            </button>
                            <button 
                              onClick={() => handleMockNav('/invoices')}
                              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-bold hover:bg-slate-50 cursor-pointer"
                            >
                              {t('view_unmatched_invoices')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-800/60 flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        {/* SECTION 6: Business Impact (Animated Counter Metrics) */}
        <section className="mb-32 relative z-10 border-t border-b border-slate-200/80 dark:border-slate-800 py-12 bg-white/20 dark:bg-slate-900/10 backdrop-blur-sm rounded-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 md:gap-4 divide-y sm:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
            
            {/* Metric 1 */}
            <div className="flex flex-col items-center p-4 pb-6 sm:pb-4">
              <span className="text-3xl lg:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
                <Counter value={25000} suffix="+" />
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-2">
                {t('stat_invoices_processed')}
              </span>
            </div>

            {/* Metric 2 */}
            <div className="flex flex-col items-center p-4 pt-6 sm:pt-4 pb-6 sm:pb-4">
              <span className="text-3xl lg:text-4xl font-extrabold text-blue-600 dark:text-blue-400">
                <Counter value={98.7} suffix="%" decimals={1} />
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-2">
                {t('stat_ai_accuracy')}
              </span>
            </div>

            {/* Metric 3 */}
            <div className="flex flex-col items-center p-4 pt-6 sm:pt-4 pb-6 sm:pb-4">
              <span className="text-3xl lg:text-4xl font-extrabold text-purple-600 dark:text-purple-400">
                <Counter value={92} suffix="%" />
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-2">
                {t('stat_penalty_reduction')}
              </span>
            </div>

            {/* Metric 4 */}
            <div className="flex flex-col items-center p-4 pt-6 sm:pt-4 pb-6 sm:pb-4">
              <span className="text-3xl lg:text-4xl font-extrabold text-teal-600 dark:text-teal-400">
                <Counter value={85} suffix="%" />
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-2">
                {t('stat_time_saved')}
              </span>
            </div>

            {/* Metric 5 */}
            <div className="flex flex-col items-center p-4 pt-6 sm:pt-4">
              <span className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white">
                <Counter value={10000} suffix="+" />
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-2">
                {t('stat_active_businesses')}
              </span>
            </div>

          </div>
        </section>


        {/* SECTION 8: Final Hero CTA Banner */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-12 relative z-10"
        >
          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100 dark:from-[#1E1B4B] dark:via-[#2E1065] dark:to-[#3B0764] rounded-3xl p-12 md:p-16 text-center text-slate-900 dark:text-white relative overflow-hidden shadow-xl shadow-indigo-100/40 dark:shadow-indigo-950/20 border border-indigo-100/50 dark:border-none">
            {/* Animated particles overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none"></div>

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5 leading-tight text-slate-900 dark:text-white">
                {t('cta_ready_title')}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-indigo-100 font-medium leading-relaxed mb-10 max-w-xl mx-auto">
                {t('cta_ready_desc')}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button 
                  onClick={handleStartFree}
                  className="btn-hover-effect px-7 py-4 bg-indigo-600 dark:bg-white text-white dark:text-indigo-950 hover:bg-indigo-700 dark:hover:bg-slate-50 rounded-lg text-base font-extrabold shadow-xl border-0 cursor-pointer"
                >
                  {t('start_free_trial')}
                </button>
                <button 
                  onClick={() => handleMockNav('/support')}
                  className="btn-hover-effect px-6 py-4 bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-350 dark:border-white/20 rounded-lg text-base font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Play size={16} fill="currentColor" />
                  <span>{t('book_demo')}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.section>

      </main>

      {/* 9. CONCISE DUAL-THEME FOOTER */}
      <footer className="w-full mt-24 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50 dark:bg-[#0B0F19] py-16 text-left relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand Column */}
            <div className="flex flex-col items-start gap-4">
              <Logo variant={isDarkMode ? "white" : "main"} size="160px" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm">
                {t('footer_tagline', 'AI-powered GST compliance for businesses.')}
              </p>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 leading-none">
                {t('footer_product', 'Product')}
              </h4>
              <ul className="list-none p-0 m-0 flex flex-col gap-3">
                <li>
                  <span onClick={() => handleMockNav('/dashboard')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    {t('dashboard_title', 'Dashboard')}
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/invoices')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    {t('invoices', 'Invoices')}
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/compliance')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    {t('compliance_center', 'GST Compliance')}
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/reports')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    {t('analytics_reports', 'Reports')}
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/pricing')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    {t('pricing_billing', 'Pricing')}
                  </span>
                </li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 leading-none">
                {t('footer_company', 'Company')}
              </h4>
              <ul className="list-none p-0 m-0 flex flex-col gap-3">
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    {t('about_us', 'About')}
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    {t('help', 'Support')}
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    {t('contact_sales', 'Contact')}
                  </span>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 leading-none">
                {t('footer_legal', 'Legal')}
              </h4>
              <ul className="list-none p-0 m-0 flex flex-col gap-3">
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    {t('footer_privacy', 'Privacy Policy')}
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    {t('footer_terms', 'Terms of Service')}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <hr className="border-slate-200/60 dark:border-slate-800/65 my-8" />

          {/* Bottom Legal Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>
              {t('footer_copyright', { year: 2026 })}
            </span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {t('made_for_india', 'Made with precision for Indian Businesses')}
            </span>
          </div>

        </div>
      </footer>
    </div>
  );
}
