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
  ChevronLeft,
  ChevronRight,
  Star,
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

  // SECTION 7: Testimonials Carousel state
  const [activeTestimonial, setActiveTestimonial] = useState(0);

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
      title: "Upload Invoice", 
      subtitle: "PDF, Image, or Bulk XML", 
      metric: "< 100ms Ingestion", 
      desc: "Drag & drop PDF, JPG, PNG invoices into the secure portal.", 
      icon: Upload 
    },
    { 
      title: "AI OCR", 
      subtitle: "Neural Text Extraction", 
      metric: "99.8% Accuracy", 
      desc: "Llama 3.3 OCR parses and extracts structural text instantly.", 
      icon: Scan 
    },
    { 
      title: "Invoice Intelligence", 
      subtitle: "HSN & Tax Rate Audit", 
      metric: "Auto HSN Match", 
      desc: "Verify item lines, taxes, HSN codes, and vendor GSTINs.", 
      icon: Cpu 
    },
    { 
      title: "GST Validation", 
      subtitle: "GSTR-2B Cross-Check", 
      metric: "Portal Live Query", 
      desc: "Cross-check invoices with the government database automatically.", 
      icon: ShieldCheck 
    },
    { 
      title: "Compliance Check", 
      subtitle: "Penalty & Risk Filter", 
      metric: "Zero Penalty Risk", 
      desc: "Review ITC eligibility and mismatch flags instantly.", 
      icon: FileCheck 
    },
    { 
      title: "AI Accountant", 
      subtitle: "Automated Ledger Entry", 
      metric: "100% Automated", 
      desc: "Auto-draft returns, GSTR-1 and GSTR-3B filings.", 
      icon: Bot 
    },
    { 
      title: "Dashboard Sync", 
      subtitle: "Real-time Tax Forecasts", 
      metric: "Live Analytics", 
      desc: "Update Business Health analytics and tax forecasts live.", 
      icon: LayoutDashboard 
    }
  ];

  // Testimonials
  const testimonials = [
    { name: "Haripandi N", role: "Co-Founder & CTO, NexGen Solutions", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop", quote: "GST Buddy AI completely automated our monthly returns. The AI Invoice reader correctly parsed ₹80 Lakhs of legacy physical invoices with zero manual corrections. Highly recommended!", rating: 5 },
    { name: "Dharshini M", role: "Head of Finance, LogiTech India", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop", quote: "Our tax compliance audit score improved to 99% within two weeks of deployment. We tracked down non-filing suppliers and saved ₹2.4 Lakhs in blocked Input Tax Credits (ITC) using the dashboard.", rating: 5 },
    { name: "Dhulasi Raman", role: "Managing Director, Raman Enterprises", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop", quote: "The ROI was instant. We used to spend hours cross-referencing ledger reports with GSTR sheets. GST Buddy AI's natural language chatbot answers all legal inquiries perfectly.", rating: 5 },
    { name: "Devendran P", role: "Founder, GST Buddy AI", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop", quote: "Our mission is to help Indian merchants automate tax compliance, reduce overheads, and escape late notices. We are proud to support over 10,000 active Indian businesses.", rating: 5 }
  ];

  // Navigation Dropdown Content
  const navDropdowns = {
    Platform: [
      { name: 'AI Invoice Intelligence', desc: '99% extraction accuracy for bills', icon: BrainCircuit, path: '/bill-upload' },
      { name: 'GST Forms & Filing', desc: 'Auto-draft GSTR-1 & GSTR-3B', icon: FileSpreadsheet, path: '/gst-forms' },
      { name: 'Filing & Returns Tracker', desc: 'Track compliance history live', icon: FileCheck, path: '/compliance' },
      { name: 'Audit & Penalty Prevention', desc: 'Identify tax risks instantly', icon: ShieldCheck, path: '/audit' }
    ],
    Solutions: [
      { name: 'For MSMEs', desc: 'Tailored for small & medium businesses', icon: Users, path: '/dashboard' },
      { name: 'For Tax Practitioners', desc: 'Manage multi-client records easily', icon: Layers, path: '/business' },
      { name: 'For Online Sellers', desc: 'Sync e-commerce invoices effortlessly', icon: TrendingUp, path: '/dashboard' }
    ],
    Resources: [
      { name: 'AI Compliance Chat', desc: 'Ask compliance questions 24/7', icon: Bot, path: '/agent' },
      { name: 'Document Vault', desc: 'Manage secure financial documents', icon: FolderLock, path: '/documents' },
      { name: 'System Integrations', desc: 'Secure Rest APIs and telemetry tracking', icon: Terminal, path: '/settings' },
      { name: 'Penalty Calculator', desc: 'Verify potential interest & late fees', icon: AlertTriangle, path: '/penalty' }
    ]
  };

  // Run AI Timeline Auto Cycle (1 second loop)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTimelineStep((prev) => (prev + 1) % timelineSteps.length);
    }, 1000);
    return () => clearInterval(timer);
  }, [timelineSteps.length]);

  // Run Testimonial Carousel Auto Cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

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
      const fullText = "How much GST should I pay this month?";
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
            text: "Based on your uploaded invoices, your estimated GST liability for this month is **₹24,560**.",
            itc: "Potential Input Tax Credit (ITC): **₹12,340**.",
            badge: "AI Recommendation: File before August 20, 2026 to avoid penalty charges."
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
          AI Compliance Assistant is live! Automate GST filing, invoice analysis, and notice handling with AI.
        </span>
        <button 
          onClick={handleStartFree}
          className="text-[#38BDF8] hover:text-[#7DD3FC] font-semibold underline flex-shrink-0 transition-opacity hover:opacity-85"
        >
          Explore Now →
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
                  <span>{menuName}</span>
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
              Pricing
            </span>
            <span 
              onClick={() => handleMockNav('/support')}
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
            >
              About Us
            </span>
          </nav>

          {/* Right Actions */}
          <div className="hidden sm:flex items-center gap-4">
            <button 
              onClick={() => handleMockNav('/support')}
              className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-transparent border-0 cursor-pointer"
            >
              Contact Sales
            </button>
            
            {isAuthenticated ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn-hover-effect px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-600/25 border-0 cursor-pointer"
              >
                Go to Dashboard
              </button>
            ) : (
              <button 
                onClick={handleStartFree}
                className="btn-hover-effect px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-600/25 border-0 cursor-pointer"
              >
                Start Free
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
                <span className="uppercase">{i18n.language}</span>
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
                      <span>{['English', 'Hindi', 'Tamil', 'Malayalam', 'Kannada'][idx]}</span>
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
              <span>AI-Powered GST Compliance Platform for MSMEs</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white mb-6">
              Automate GST. <br />
              Stay Compliant. <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent inline-block">
                Grow Your Business.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-8 max-w-xl">
              Upload invoices, get AI insights, file returns, and manage compliance — all in one intelligent platform.
            </p>

            {/* Feature Cards Grid (4 Horizontal Feature Cards in 2x2 grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10 max-w-xl">
              
              {/* Card 1: AI Invoice Intelligence */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 card-shadow shadow-slate-100 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                  <BrainCircuit size={20} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">AI Invoice Intelligence</h4>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-0.5">99% Accuracy</p>
                </div>
              </div>

              {/* Card 2: GST Compliance */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 card-shadow shadow-slate-100 hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                  <FileCheck size={20} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">GST Compliance</h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">Always On Track</p>
                </div>
              </div>

              {/* Card 3: Penalty Prevention */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 card-shadow shadow-slate-100 hover:border-teal-300 dark:hover:border-teal-800 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-teal-600 dark:text-teal-400 flex-shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">Penalty Prevention</h4>
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-bold mt-0.5">AI Risk Detection</p>
                </div>
              </div>

              {/* Card 4: AI Accountant */}
              <div className="flex items-center gap-3 bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 card-shadow shadow-slate-100 hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-500 flex-shrink-0">
                  <MessageSquare size={20} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">AI Accountant</h4>
                  <p className="text-xs text-amber-600 dark:text-amber-500 font-bold mt-0.5">Ask Anything</p>
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 w-full">
              <button 
                onClick={handleStartFree}
                className="btn-hover-effect inline-flex items-center gap-2 px-7 py-4 text-base font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 rounded-lg shadow-xl shadow-indigo-600/25 border-0 cursor-pointer animate-pulse"
              >
                <span>Start Free Now</span>
                <ArrowRight size={18} />
              </button>

              <button 
                onClick={() => handleMockNav('/support')}
                className="btn-hover-effect inline-flex items-center gap-2 px-6 py-4 text-base font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                <Play size={16} fill="currentColor" className="text-slate-600 dark:text-slate-300" />
                <span>Book a Demo</span>
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
                <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">GST Status</span>
                <strong className="text-xs text-purple-600 dark:text-purple-400 font-extrabold">GSTR-1 Ready</strong>
              </div>
            </div>

            <div className="float-2 hidden md:flex absolute -bottom-6 -left-4 md:-left-8 z-30 items-center gap-3 bg-white/85 dark:bg-slate-800/85 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-3.5 shadow-xl backdrop-blur-md">
              <div className="w-8.5 h-8.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Upload size={16} />
              </div>
              <div className="text-left">
                <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Llama extraction</span>
                <strong className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold">₹1.2L ITC Drafted</strong>
              </div>
            </div>

            <div className="float-3 hidden md:flex absolute -top-6 -right-4 md:-right-8 z-30 items-center gap-3 bg-white/85 dark:bg-slate-800/85 border border-blue-200 dark:border-blue-900 rounded-2xl p-3 shadow-xl backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <ShieldCheck size={16} />
              </div>
              <div className="text-left">
                <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Notice Audit</span>
                <strong className="text-xs text-blue-600 dark:text-blue-400 font-extrabold">0 Risks Found</strong>
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
                    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', active: true },
                    { label: 'Invoices', icon: FileText, path: '/invoices' },
                    { label: 'AI Accountant', icon: Bot, path: '/agent' },
                    { label: 'Compliance Center', icon: ShieldCheck, path: '/compliance' },
                    { label: 'Returns & Filing', icon: FileCheck, path: '/gst-forms' },
                    { label: 'Document Assistant', icon: FolderLock, path: '/documents' },
                    { label: 'Reports', icon: FileSpreadsheet, path: '/reports' },
                    { label: 'Business Health', icon: CheckCircle2, path: '/health' },
                    { label: 'Notifications', icon: Bell, path: '/notifications' },
                    { label: 'Settings', icon: Settings, path: '/settings' }
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
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-none">Business Health</h3>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5 inline-block">Real-time audit track</span>
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
                      <span>+ Upload Invoice</span>
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
                        <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none">Health</span>
                        <strong className="text-[10px] text-slate-900 dark:text-white block font-extrabold truncate mt-0.5">96 Excellent</strong>
                        <span className="text-[7.5px] text-emerald-500 font-bold leading-none">+12% vs last mth</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-2.5">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none">GST Liability</span>
                      <strong className="text-[11.5px] text-red-500 font-extrabold block mt-0.5">₹24,560</strong>
                      <span className="text-[8px] text-slate-400 font-semibold leading-none">This Month</span>
                    </div>

                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-2.5">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none">ITC Available</span>
                      <strong className="text-[11.5px] text-emerald-500 font-extrabold block mt-0.5">₹12,340</strong>
                      <span className="text-[8px] text-slate-400 font-semibold leading-none">This Month</span>
                    </div>

                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-2.5">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none">Compliance Score</span>
                      <strong className="text-[11.5px] text-slate-900 dark:text-white font-extrabold block mt-0.5">98%</strong>
                      <span className="text-[8.5px] text-emerald-500 font-bold flex items-center gap-0.5 mt-0.5 leading-none">
                        <CheckCircle2 size={8} /> Up to date
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1 leading-none">
                          <Sparkles size={10} className="text-indigo-500" />
                          <span>AI Insights</span>
                        </h4>
                        
                        <div className="flex flex-col gap-2">
                          <div className="border-l-2 border-indigo-500 pl-1.5">
                            <p className="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight">3 invoices need review</p>
                            <span className="text-[7.5px] text-slate-400 leading-none">Potential ITC of ₹6,450</span>
                          </div>
                          
                          <div className="border-l-2 border-amber-500 pl-1.5">
                            <p className="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight">GSTR-3B due in 5 days</p>
                            <span className="text-[7.5px] text-slate-400 leading-none">For April 2024</span>
                          </div>

                          <div className="border-l-2 border-emerald-500 pl-1.5">
                            <p className="text-[9px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Cash flow looks healthy</p>
                            <span className="text-[7.5px] text-slate-400 leading-none">Keep up the good work!</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleMockNav('/insights')}
                        className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-left mt-3 bg-transparent border-0 cursor-pointer p-0"
                      >
                        View All Insights →
                      </button>
                    </div>

                    <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider leading-none">Monthly Overview</h4>
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
                        <h4 className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 leading-none">Top Expenses</h4>
                        
                        <div className="flex flex-col gap-2">
                          <div>
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 mb-0.5">
                              <span className="truncate">Purchases</span>
                              <span>₹41,370 (32%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600 rounded-full" style={{ width: '32%' }}></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 mb-0.5">
                              <span className="truncate">Office Expenses</span>
                              <span>₹12,450 (18%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: '18%' }}></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 mb-0.5">
                              <span className="truncate">Travel</span>
                              <span>₹8,370 (12%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: '12%' }}></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 mb-0.5">
                              <span className="truncate">Marketing</span>
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
            Trusted by 10,000+ Businesses Across India
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60 dark:opacity-40">
            {['TATA', 'Zoho', 'Razorpay', 'Flipkart', 'Zomato', 'Swiggy', 'Deloitte', 'IDFC FIRST Bank', 'CRED', 'Paytm'].map((logo) => (
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
              Automated Invoice Journey
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              How GST Buddy AI Works
            </h2>
            
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-semibold mt-2.5">
              The automated compliance journey of an invoice, from upload to tax filing.
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
                        Step {activeTimelineStep + 1} of 7
                      </span>
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active Engine
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
              Talk to Your AI Accountant
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-semibold mt-2.5">
              Interact with the compliance chatbot to fetch calculations and audit recommendations in real time.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/5 backdrop-blur-md">
            
            {/* Header simulated app bar */}
            <div className="bg-slate-50/80 dark:bg-slate-950/80 px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">AI Accountant Online</span>
              </div>
              
              <div className="flex gap-2">
                {['File GSTR-3B', 'Verify ITC'].map(label => (
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
                              File GSTR-3B
                            </button>
                            <button 
                              onClick={() => handleMockNav('/invoices')}
                              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-bold hover:bg-slate-50 cursor-pointer"
                            >
                              View Unmatched Invoices
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
                Invoices Processed
              </span>
            </div>

            {/* Metric 2 */}
            <div className="flex flex-col items-center p-4 pt-6 sm:pt-4 pb-6 sm:pb-4">
              <span className="text-3xl lg:text-4xl font-extrabold text-blue-600 dark:text-blue-400">
                <Counter value={98.7} suffix="%" decimals={1} />
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-2">
                AI Accuracy Rate
              </span>
            </div>

            {/* Metric 3 */}
            <div className="flex flex-col items-center p-4 pt-6 sm:pt-4 pb-6 sm:pb-4">
              <span className="text-3xl lg:text-4xl font-extrabold text-purple-600 dark:text-purple-400">
                <Counter value={92} suffix="%" />
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-2">
                Penalty Reduction
              </span>
            </div>

            {/* Metric 4 */}
            <div className="flex flex-col items-center p-4 pt-6 sm:pt-4 pb-6 sm:pb-4">
              <span className="text-3xl lg:text-4xl font-extrabold text-teal-600 dark:text-teal-400">
                <Counter value={85} suffix="%" />
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-2">
                Time Saved Monthly
              </span>
            </div>

            {/* Metric 5 */}
            <div className="flex flex-col items-center p-4 pt-6 sm:pt-4">
              <span className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white">
                <Counter value={10000} suffix="+" />
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-2">
                Active Indian Businesses
              </span>
            </div>

          </div>
        </section>

        {/* SECTION 7: Testimonials (Auto-Sliding Glass Carousel) */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-32 relative z-10"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Trusted by CFOs & Founders
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-semibold mt-2.5">
              Read how GST Buddy AI has transformed legal accounting for merchants.
            </p>
          </div>

          <div className="max-w-2xl mx-auto relative group">
            
            {/* Sliding Container Wrapper */}
            <div className="overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 p-8 md:p-10 backdrop-blur-md shadow-xl">
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTestimonial}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="text-left"
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-5">
                    {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                      <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Testimonial Quote */}
                  <p className="text-base text-slate-700 dark:text-slate-200 font-medium leading-relaxed italic mb-8">
                    "{testimonials[activeTestimonial].quote}"
                  </p>

                  {/* Customer Info row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <img 
                        src={testimonials[activeTestimonial].avatar} 
                        alt={testimonials[activeTestimonial].name} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200"
                      />
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                          {testimonials[activeTestimonial].name}
                        </h4>
                        <span className="text-xs text-slate-400 font-medium mt-1 inline-block">
                          {testimonials[activeTestimonial].role}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full border border-emerald-200/30">
                      <CheckCircle2 size={12} />
                      <span>Verified Buyer</span>
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

            </div>

            {/* Pagination sleek dots */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`w-2.5 h-2.5 rounded-full border-0 cursor-pointer transition-all duration-200 ${
                    i === activeTestimonial ? 'bg-indigo-600 w-6' : 'bg-slate-300 dark:bg-slate-750 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>

            {/* Slide Arrows with Glass background */}
            <button
              onClick={() => setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
              className="absolute left-[-20px] md:left-[-60px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-slate-200/80 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm flex items-center justify-center text-slate-500 hover:text-slate-800 shadow-md cursor-pointer hover:scale-105 transition-transform"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setActiveTestimonial((prev) => (prev + 1) % testimonials.length)}
              className="absolute right-[-20px] md:right-[-60px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-slate-200/80 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm flex items-center justify-center text-slate-500 hover:text-slate-800 shadow-md cursor-pointer hover:scale-105 transition-transform"
            >
              <ChevronRight size={20} />
            </button>

          </div>
        </motion.section>

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
                Ready to Let AI Handle Your GST?
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-indigo-100 font-medium leading-relaxed mb-10 max-w-xl mx-auto">
                Join over 10,000+ businesses saving 20+ hours and escaping late notices every month.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button 
                  onClick={handleStartFree}
                  className="btn-hover-effect px-7 py-4 bg-indigo-600 dark:bg-white text-white dark:text-indigo-950 hover:bg-indigo-700 dark:hover:bg-slate-50 rounded-lg text-base font-extrabold shadow-xl border-0 cursor-pointer"
                >
                  Start Free Trial
                </button>
                <button 
                  onClick={() => handleMockNav('/support')}
                  className="btn-hover-effect px-6 py-4 bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-350 dark:border-white/20 rounded-lg text-base font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Play size={16} fill="currentColor" />
                  <span>Book Demo</span>
                </button>
              </div>
            </div>
          </div>
        </motion.section>

      </main>

      {/* 9. ULTRA-PROFESSIONAL DUAL-THEME FOOTER */}
      <footer className="w-full mt-24 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50 dark:bg-[#0B0F19] py-16 text-left relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          


          {/* 6-Column Navigation Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 lg:gap-6 mb-16">
            
            {/* Brand Column (Spans 2 cols) */}
            <div className="col-span-2 flex flex-col items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary-600)] flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                  GST
                </div>
                <span className="font-extrabold text-lg leading-none text-slate-900 dark:text-white tracking-tight">
                  GST Buddy <span className="text-[var(--primary-600)]">AI</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm">
                Automating finance compliance, invoice extraction, and returns drafting using Groq Llama 3.3.
              </p>
              
              {/* SSL & ISO Badges */}
              <div className="flex gap-2 flex-wrap mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                  256-Bit SSL Secured
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/50 text-[var(--primary-600)] dark:text-indigo-400 text-[10px] font-bold">
                  ISO 27001 Certified
                </span>
              </div>

              {/* Social Media Buttons */}
              <div className="flex gap-4 mt-3">
                <span className="text-xs font-bold text-slate-400 hover:text-[var(--primary-600)] transition-colors cursor-pointer">Twitter</span>
                <span className="text-xs font-bold text-slate-400 hover:text-[var(--primary-600)] transition-colors cursor-pointer">LinkedIn</span>
                <span className="text-xs font-bold text-slate-400 hover:text-[var(--primary-600)] transition-colors cursor-pointer">YouTube</span>
                <span className="text-xs font-bold text-slate-400 hover:text-[var(--primary-600)] transition-colors cursor-pointer">GitHub</span>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 leading-none">
                Product
              </h4>
              <ul className="list-none p-0 m-0 flex flex-col gap-3">
                <li>
                  <span onClick={() => handleMockNav('/agent')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    AI Accountant
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/bill-upload')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Invoice Intelligence
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/compliance')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Compliance Center
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/audit')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    ITC Reconciliation
                  </span>
                </li>
                <li>
                  <span onClick={() => navigate('/pricing')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Pricing Plans
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/dashboard')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Tally & Zoho Sync
                  </span>
                </li>
              </ul>
            </div>

            {/* Solutions Column */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 leading-none">
                Solutions
              </h4>
              <ul className="list-none p-0 m-0 flex flex-col gap-3">
                <li>
                  <span onClick={() => handleMockNav('/dashboard')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    For MSMEs
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/dashboard')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    For CAs & Tax Pros
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/dashboard')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Enterprise & Multi-GSTIN
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/dashboard')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    E-commerce Sellers
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/dashboard')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Retail & Wholesale
                  </span>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 leading-none">
                Resources
              </h4>
              <ul className="list-none p-0 m-0 flex flex-col gap-3">
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    GST Rate Calculator
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    HSN Code Finder
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    E-Invoicing Guide
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Blog & Tax News
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    API Documentation
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Live System Status
                  </span>
                </li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 leading-none">
                Company
              </h4>
              <ul className="list-none p-0 m-0 flex flex-col gap-3">
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    About Us
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Careers <span className="ml-1 text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase">Hiring</span>
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Contact Sales
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Privacy Policy
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Terms of Service
                  </span>
                </li>
                <li>
                  <span onClick={() => handleMockNav('/support')} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[var(--primary-600)] cursor-pointer transition-colors">
                    Security & Trust
                  </span>
                </li>
              </ul>
            </div>

          </div>

          <hr className="border-slate-200/60 dark:border-slate-800/65 my-8" />

          {/* Bottom Legal Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }} className="items-center text-center sm:items-start sm:text-left">
              <span>
                © 2026 GST Buddy AI. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              <span className="hidden sm:inline">•</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {t('made_for_india', 'Made with precision for Indian Businesses')}
              </span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
