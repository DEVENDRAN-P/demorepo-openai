import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Bot,
  Scan,
  FolderLock,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Users,
  FileSpreadsheet,
  Download,
  LayoutDashboard,
  X,
  Check,
  ArrowRight,
  Search,
  UploadCloud,
  Loader2,
  Lock,
  Send,
  HelpCircle
} from 'lucide-react';

// ----------------------------------------------------
// 3D Tilt Card Component using Framer Motion
// ----------------------------------------------------
function TiltCard({ children, onClick, className = '' }) {
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for tracking cursor relative coordinates (-0.5 to 0.5)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Springs for smooth movement
  const springConfig = { stiffness: 150, damping: 18 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  // Map coordinate range to rotation degrees
  const rotateX = useTransform(ySpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate relative coordinates
    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;
    
    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX: rotateX,
        rotateY: rotateY,
        transformStyle: "preserve-3d",
      }}
      animate={{
        y: isHovered ? -6 : 0,
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`relative cursor-pointer transition-all duration-300 ${className}`}
    >
      {/* 3D Content Container wrapper */}
      <div style={{ transform: "translateZ(30px)" }} className="h-full w-full">
        {children}
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------
// Compliance Suite Main Component
// ----------------------------------------------------
export default function EndToEndComplianceSuite() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedCard, setSelectedCard] = useState(null);

  // Filter Categories
  const categories = [
    { id: 'All', label: 'All Tools (10)' },
    { id: 'AI & Automation', label: 'AI & Automation' },
    { id: 'Filing & Compliance', label: 'Filing & Compliance' },
    { id: 'Analytics & Risk', label: 'Analytics & Risk' }
  ];

  // 10 Cards Detailed Data
  const toolsData = [
    {
      id: 'ai-accountant',
      title: 'AI Accountant Agent',
      icon: Bot,
      category: 'AI & Automation',
      shortDesc: 'Conversational compliance expert trained on latest GST circulars and tax laws.',
      bullets: [
        '24/7 instant tax advice',
        'GSTR-3B tax calculation',
        'Real-time circular updates'
      ],
      badge: '99.4% Query Accuracy',
      colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200/50 dark:border-indigo-900/30',
      glowClass: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'invoice-intel',
      title: 'Invoice Intelligence',
      icon: Scan,
      category: 'AI & Automation',
      shortDesc: 'Extract supplier name, tax liability, HSN/SAC codes, and line items with 99% accuracy.',
      bullets: [
        'Neural OCR engine',
        'Batch multi-page processing',
        'Automatic duplicate detection'
      ],
      badge: '< 200ms Processing',
      colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50/80 dark:bg-purple-950/30 border-purple-200/50 dark:border-purple-900/30',
      glowClass: 'from-purple-500 to-pink-600'
    },
    {
      id: 'doc-assistant',
      title: 'Document Assistant',
      icon: FolderLock,
      category: 'AI & Automation',
      shortDesc: 'Securely vault, tag, and organize financial files for frictionless tax retrieval.',
      bullets: [
        '256-bit encrypted storage',
        'Automatic invoice tagging',
        'Instant search index'
      ],
      badge: 'ISO 27001 Certified Vault',
      colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-900/30',
      glowClass: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'compliance-center',
      title: 'Compliance Center',
      icon: ShieldCheck,
      category: 'Filing & Compliance',
      shortDesc: 'Always file GSTR-1 & GSTR-3B on schedule with automated reminders and one-click uploads.',
      bullets: [
        'Direct GST portal API sync',
        'Automated draft generation',
        'Deadline calendar'
      ],
      badge: '100% On-Time Filing',
      colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/30 border-blue-200/50 dark:border-blue-900/30',
      glowClass: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'penalty-prevention',
      title: 'Penalty Prevention Center',
      icon: AlertTriangle,
      category: 'Filing & Compliance',
      shortDesc: 'Automated mismatch notifications shield your business from late fees and tax notices.',
      bullets: [
        'ITC mismatch alerts',
        'Supplier non-filing warnings',
        'Audit-risk scoring'
      ],
      badge: 'Zero Late Fee Guarantee',
      colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-900/30',
      glowClass: 'from-amber-500 to-orange-600'
    },
    {
      id: 'business-analytics',
      title: 'Business Analytics',
      icon: BarChart3,
      category: 'Analytics & Risk',
      shortDesc: 'Visual SVG dashboards mapping revenue streams, outlays, and tax trends in real-time.',
      bullets: [
        'Cash flow breakdown',
        'Taxable vs non-taxable revenue',
        'Quarterly trend charts'
      ],
      badge: 'Real-time Metrics',
      colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-900/30',
      glowClass: 'from-rose-500 to-red-600'
    },
    {
      id: 'tax-forecasting',
      title: 'Tax Forecasting Engine',
      icon: TrendingUp,
      category: 'Analytics & Risk',
      shortDesc: 'Predict future quarterly tax liabilities to optimize cash flow and allocate liquid capital.',
      bullets: [
        'Predictive tax algorithms',
        'ITC utilization planning',
        'Working capital insights'
      ],
      badge: '98% Forecast Precision',
      colorClass: 'text-teal-600 dark:text-teal-400 bg-teal-50/80 dark:bg-teal-950/30 border-teal-200/50 dark:border-teal-900/30',
      glowClass: 'from-teal-500 to-emerald-600'
    },
    {
      id: 'vendor-intel',
      title: 'Vendor Intelligence',
      icon: Users,
      category: 'Analytics & Risk',
      shortDesc: 'Track non-filing vendors and block faulty Input Tax Credit (ITC) claims automatically.',
      bullets: [
        'Automated GSTR-2A/2B matching',
        'Supplier compliance scoring',
        'Payment hold triggers'
      ],
      badge: 'ITC Reclaim Boost',
      colorClass: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50/80 dark:bg-cyan-950/30 border-cyan-200/50 dark:border-cyan-900/30',
      glowClass: 'from-cyan-500 to-blue-600'
    },
    {
      id: 'reports-generator',
      title: 'Custom Reports Generator',
      icon: FileSpreadsheet,
      category: 'Analytics & Risk',
      shortDesc: 'Download auditing statements, multi-format ledger sheets, and executive summary PDFs.',
      bullets: [
        'CA-ready Excel workbooks',
        'Tally-compatible XML exports',
        'Automated monthly digests'
      ],
      badge: 'Instant Export',
      colorClass: 'text-violet-600 dark:text-violet-400 bg-violet-50/80 dark:bg-violet-950/30 border-violet-200/50 dark:border-violet-900/30',
      glowClass: 'from-violet-500 to-purple-600'
    },
    {
      id: 'executive-dashboard',
      title: 'Executive Dashboard',
      icon: LayoutDashboard,
      category: 'Filing & Compliance',
      shortDesc: 'Single control center to review multi-GSTIN transactions and enterprise branch health.',
      bullets: [
        'Multi-entity aggregation',
        'Role-based access control',
        'Consolidated tax summaries'
      ],
      badge: 'Multi-GSTIN Ready',
      colorClass: 'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50/80 dark:bg-fuchsia-950/30 border-fuchsia-200/50 dark:border-fuchsia-900/30',
      glowClass: 'from-fuchsia-500 to-indigo-600'
    }
  ];

  // Filtering Logic
  const filteredTools = toolsData.filter(tool => {
    if (activeFilter === 'All') return true;
    return tool.category === activeFilter;
  });

  // Balanced grid sizing when All categories are visible
  const getGridSpan = (index) => {
    if (activeFilter !== 'All') return 'col-span-1';
    
    // In a 4-column layout (xl:grid-cols-4):
    // Index 8 (9th card) spans 2 columns
    // Index 9 (10th card) spans 2 columns
    if (index === 8) return 'col-span-1 xl:col-span-2';
    if (index === 9) return 'col-span-1 lg:col-span-3 xl:col-span-2';
    
    return 'col-span-1';
  };

  return (
    <section className="py-20 px-4 max-w-[1400px] mx-auto overflow-hidden">
      
      {/* ----------------------------------------------------
          SECTION HEADER
          ---------------------------------------------------- */}
      <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center">
        
        {/* Header Pill */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm mb-6 select-none"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Enterprise Feature Matrix
        </motion.div>

        {/* Title */}
        <motion.h2 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5 leading-tight select-none bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent"
        >
          End-to-End Compliance Suite
        </motion.h2>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg text-slate-650 dark:text-slate-300 font-medium max-w-2xl leading-relaxed select-none"
        >
          10 powerful enterprise tools designed to automate your financial bookkeeping, prevent tax penalties, and streamline GSTR filings.
        </motion.p>

        {/* ----------------------------------------------------
            CATEGORY FILTERS TABS
            ---------------------------------------------------- */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-2.5 mt-10 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-md"
        >
          {categories.map((cat) => {
            const isActive = activeFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 select-none ${
                  isActive 
                    ? 'text-white shadow-md shadow-indigo-500/10' 
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFilterPill"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-500 dark:from-indigo-50 dark:to-purple-600 rounded-xl -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {cat.label}
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* ----------------------------------------------------
          10-CARD FEATURE GRID
          ---------------------------------------------------- */}
      <motion.div 
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filteredTools.map((tool, idx) => {
            const Icon = tool.icon;
            
            return (
              <motion.div
                key={tool.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={getGridSpan(idx)}
              >
                <TiltCard 
                  onClick={() => setSelectedCard(tool)}
                  className="group relative h-full rounded-3xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md shadow-md transition-shadow duration-300 hover:shadow-xl hover:shadow-indigo-500/5"
                >
                  {/* Glowing background gradient on hover */}
                  <div className="absolute -inset-px bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-3xl opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 blur-xl transition-opacity duration-500 pointer-events-none" />
                  
                  {/* Smooth active border glow overlay on hover */}
                  <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-r from-slate-300 to-slate-300 dark:from-slate-800 dark:to-slate-800 group-hover:from-indigo-500 group-hover:via-purple-500 group-hover:to-emerald-500 transition-colors duration-500 pointer-events-none" />

                  {/* Card Content Interior */}
                  <div className="relative z-10 h-full p-7 flex flex-col justify-between items-start">
                    
                    <div className="w-full">
                      {/* Top Row: Icon and Micro-Badge */}
                      <div className="flex items-start justify-between w-full mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${tool.colorClass} group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-sm`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold py-1 px-2.5 rounded-full bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-350 select-none border border-slate-200/30 dark:border-slate-700/30">
                          {tool.badge}
                        </span>
                      </div>

                      {/* Header and short desc */}
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                        {tool.title}
                      </h3>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-355 font-medium leading-relaxed mb-6">
                        {tool.shortDesc}
                      </p>

                      {/* Bullets */}
                      <ul className="space-y-2 mb-6">
                        {tool.bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/70" />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Inspect Button at the bottom */}
                    <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                      <span>Inspect Tool</span>
                      <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform duration-300" />
                      </div>
                    </div>

                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* ----------------------------------------------------
          SLIDE-OVER DRAWER MODAL
          ---------------------------------------------------- */}
      <AnimatePresence>
        {selectedCard && (
          <DrawerContainer 
            tool={selectedCard} 
            onClose={() => setSelectedCard(null)} 
          />
        )}
      </AnimatePresence>

    </section>
  );
}

// ----------------------------------------------------
// Drawer Helper Component
// Handles internal interactive demo state for each tool
// ----------------------------------------------------
function DrawerContainer({ tool, onClose }) {
  const Icon = tool.icon;
  const navigate = useNavigate();

  // Generic toggles for interactive configuration in drawer
  const [toggleA, setToggleA] = useState(true);
  const [toggleB, setToggleB] = useState(false);

  // States for interactive simulations
  const [simState, setSimState] = useState('idle'); // idle, running, success
  const [simProgress, setSimProgress] = useState(0);

  // 1. AI Chat simulation state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your AI Compliance Agent. Ask me any tax related questions or click on one of the common queries below.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const sampleQueries = [
    'How do I claim ITC on office electronics?',
    'When is GSTR-3B due for July?',
    'What is the threshold for e-invoicing?'
  ];

  const handleSendChat = (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = "Based on recent GST notifications, standard rules apply. Please verify with your CA.";
      if (text.includes('ITC') || text.includes('electronics')) {
        reply = "Under Section 16 of CGST Act, you can claim full Input Tax Credit (ITC) for office electronics if they are used strictly in the course or furtherance of business. Ensure you hold a tax invoice and that the vendor uploads it to GSTR-1 so it reflects in your GSTR-2B.";
      } else if (text.includes('GSTR-3B')) {
        reply = "GSTR-3B for a given month is generally due by the 20th of the following month (e.g., July returns are due on August 20th). For taxpayers under the QRMP scheme, the deadline is the 22nd or 24th of the month following the quarter.";
      } else if (text.includes('e-invoicing')) {
        reply = "Currently, e-invoicing is mandatory for all taxpayers with an aggregate annual turnover exceeding ₹5 Crores in any preceding financial year from 2017-18 onwards.";
      }

      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setIsTyping(false);
    }, 1200);
  };

  // 2. Invoice Intelligence OCR simulator
  const [ocrData, setOcrData] = useState(null);
  const runOCR = () => {
    setSimState('running');
    setSimProgress(0);
    const interval = setInterval(() => {
      setSimProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setSimState('success');
          setOcrData({
            supplier: 'Apex Office Supplies Ltd',
            gstin: '27AAPCA5492F1ZS',
            invoiceNo: 'AOS/26-27/049',
            date: '2026-07-28',
            hsn: '84713010 (Laptop computers)',
            subtotal: 156356,
            tax: 28144,
            total: 184500,
            confidence: '99.8%'
          });
          return 100;
        }
        return prev + 20;
      });
    }, 200);
  };

  // 3. Document Assistant list
  const [docVaultSearch, setDocVaultSearch] = useState('');
  const [vaultDocs, setVaultDocs] = useState([
    { name: 'inv_88291_server_rack.pdf', tag: 'Utilities', size: '2.4 MB', date: 'Jul 26, 2026', encrypted: true },
    { name: 'office_lease_mumbai_signed.pdf', tag: 'Legal', size: '8.1 MB', date: 'Jun 12, 2026', encrypted: true },
    { name: 'swiggy_client_dinner_aug.png', tag: 'Marketing', size: '420 KB', date: 'Aug 04, 2026', encrypted: true },
    { name: 'gstr_3b_fy_25_receipt.pdf', tag: 'Filing Receipts', size: '1.2 MB', date: 'May 20, 2026', encrypted: true }
  ]);
  const addMockDoc = () => {
    const newDoc = {
      name: `scan_invoice_mock_${Math.floor(Math.random() * 1000)}.pdf`,
      tag: 'Pending Review',
      size: '1.4 MB',
      date: 'Today',
      encrypted: true
    };
    setVaultDocs([newDoc, ...vaultDocs]);
  };

  // 4. Compliance Center one-click upload
  const [filingStatus, setFilingStatus] = useState({
    gstr1: 'Draft Ready',
    gstr3b: 'Pending Reconciliation',
    gstr9: 'Due Dec 31'
  });
  const fileGSTR1 = () => {
    setSimState('running');
    setSimProgress(0);
    const interval = setInterval(() => {
      setSimProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setSimState('success');
          setFilingStatus(prevStatus => ({ ...prevStatus, gstr1: 'Filed Successfully' }));
          return 100;
        }
        return prev + 25;
      });
    }, 250);
  };

  // 5. Penalty Center supplier notifier
  const [suppliers, setSuppliers] = useState([
    { name: 'Alpha Iron Works', invoice: '#INV-881', amount: 12400, status: 'Notified', date: 'Jul 28' },
    { name: 'Nova Logistics Ltd', invoice: '#INV-1109', amount: 34500, status: 'Pending Review', date: 'Aug 02' }
  ]);
  const notifySupplier = (idx) => {
    const updated = [...suppliers];
    updated[idx].status = 'Alert Sent';
    setSuppliers(updated);
  };

  // 6. Analytics graph interval
  const [chartInterval, setChartInterval] = useState('Quarterly');

  // 7. Forecasting tax planning simulator
  const [growthRate, setGrowthRate] = useState(15);
  const baseTaxLiability = 104500;
  const calculatedTaxLiability = Math.round(baseTaxLiability * (1 + growthRate / 100));

  // 8. Vendor list compliance score
  const [vendorList, setVendorList] = useState([
    { name: 'Prime Metal Distributors', gstin: '27AAA...81Z0', score: 99, status: 'Active' },
    { name: 'Zeta Software Solutions', gstin: '07BBB...21Z5', score: 62, status: 'Hold Triggered' },
    { name: 'Apex Courier Services', gstin: '29CCC...44Z1', score: 94, status: 'Active' }
  ]);
  const toggleVendorStatus = (idx) => {
    const updated = [...vendorList];
    updated[idx].status = updated[idx].status === 'Active' ? 'Hold Triggered' : 'Active';
    setVendorList(updated);
  };

  // 9. Report Export progress
  const [selectedFormat, setSelectedFormat] = useState('Excel Workbook (.xlsx)');
  const handleExport = () => {
    setSimState('running');
    setSimProgress(0);
    const interval = setInterval(() => {
      setSimProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setSimState('success');
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // 10. Multi-GSTIN Branches
  const [activeBranch, setActiveBranch] = useState('MH');
  const branches = {
    MH: { name: 'Maharashtra Head Office', gstin: '27AAPCA8812D1ZX', netLiability: '₹1,56,900', filed: 'Yes', score: '99.2%' },
    KA: { name: 'Bengaluru Tech Branch', gstin: '29AAPCA8812D1ZY', netLiability: '₹88,400', filed: 'Yes', score: '98.5%' },
    DL: { name: 'Delhi Retail Warehouse', gstin: '07AAPCA8812D1ZZ', netLiability: '₹34,200', filed: 'No (Due in 3d)', score: '91.0%' }
  };

  return (
    <>
      {/* Drawer Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950 z-[99] backdrop-blur-sm"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-slate-50 dark:bg-slate-950 shadow-2xl z-[100] border-l border-slate-200 dark:border-slate-900 flex flex-col justify-between overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tool.colorClass} border`}>
              <Icon className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {tool.category}
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                {tool.title}
              </h3>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Overview Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Overview</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              {tool.shortDesc}
            </p>
            <div className="flex flex-wrap gap-2 pt-1.5">
              {tool.bullets.map((bullet, bIdx) => (
                <span key={bIdx} className="inline-flex items-center gap-1.5 py-1 px-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-100/30 dark:border-indigo-900/30">
                  <Check className="w-3.5 h-3.5" />
                  {bullet}
                </span>
              ))}
            </div>
          </div>

          {/* ----------------------------------------------------
              INTERACTIVE COMPONENT SIMULATORS (Dynamic based on Card)
              ---------------------------------------------------- */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Live Tool Preview</h4>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-900 shadow-inner">
              
              {/* 1. AI Accountant Simulator */}
              {tool.id === 'ai-accountant' && (
                <div className="space-y-4">
                  <div className="h-64 rounded-xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200/50 dark:border-slate-900/50 overflow-y-auto flex flex-col gap-3 scrollbar-thin">
                    {chatMessages.map((msg, mIdx) => (
                      <div 
                        key={mIdx}
                        className={`max-w-[85%] rounded-2xl p-3 text-xs font-semibold leading-relaxed ${
                          msg.role === 'user'
                            ? 'self-end bg-indigo-600 text-white animate-fade-in'
                            : 'self-start bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/40 dark:border-slate-800/40'
                        }`}
                      >
                        {msg.text}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="self-start bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl p-3 text-xs text-slate-400 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                        <span>AI Accountant is drafting response...</span>
                      </div>
                    )}
                  </div>

                  {/* Sample Query Suggestions */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400">Select a sample GST query:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sampleQueries.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleSendChat(q)}
                          disabled={isTyping}
                          className="py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-900/30 transition-all text-left"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat Input Field */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type a compliance question..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat(chatInput)}
                      className="flex-1 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                    />
                    <button
                      onClick={() => handleSendChat(chatInput)}
                      className="p-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center px-4"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Invoice Intelligence Simulator */}
              {tool.id === 'invoice-intel' && (
                <div className="space-y-4">
                  {simState === 'idle' && (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/20">
                        <UploadCloud className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">OCR File Reader Simulator</p>
                        <p className="text-[10px] text-slate-400 mt-1">Upload a sales receipt or invoice to extract tax HSN codes</p>
                      </div>
                      <button
                        onClick={runOCR}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10"
                      >
                        Extract Sample Invoice
                      </button>
                    </div>
                  )}

                  {simState === 'running' && (
                    <div className="py-10 text-center space-y-4">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Processing with Neural OCR...</p>
                        <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 max-w-[200px] mx-auto overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-200" 
                            style={{ width: `${simProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {simState === 'success' && ocrData && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 py-0.5 px-2 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Extracted successfully ({ocrData.confidence})
                        </span>
                        <button onClick={() => setSimState('idle')} className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Reset</button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3.5 text-xs font-semibold">
                        <div>
                          <p className="text-[10px] text-slate-400">Supplier Name</p>
                          <p className="text-slate-800 dark:text-slate-200 truncate mt-0.5">{ocrData.supplier}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Supplier GSTIN</p>
                          <p className="text-slate-800 dark:text-slate-200 mt-0.5 font-mono">{ocrData.gstin}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Invoice Number</p>
                          <p className="text-slate-800 dark:text-slate-200 mt-0.5">{ocrData.invoiceNo}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Billing Date</p>
                          <p className="text-slate-800 dark:text-slate-200 mt-0.5">{ocrData.date}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] text-slate-400">Extracted HSN/SAC Classification</p>
                          <p className="text-slate-800 dark:text-slate-200 mt-0.5 font-mono text-[11px]">{ocrData.hsn}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Taxes (CGST + SGST 18%)</p>
                          <p className="text-indigo-600 dark:text-indigo-400 mt-0.5 font-bold">₹{ocrData.tax.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Consolidated Bill Total</p>
                          <p className="text-slate-900 dark:text-white mt-0.5 font-extrabold">₹{ocrData.total.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Document Assistant Simulator */}
              {tool.id === 'doc-assistant' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="relative flex-1 mr-2">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search document vault..."
                        value={docVaultSearch}
                        onChange={(e) => setDocVaultSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <button
                      onClick={addMockDoc}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl whitespace-nowrap transition-colors"
                    >
                      + Add File
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {vaultDocs
                      .filter(doc => doc.name.toLowerCase().includes(docVaultSearch.toLowerCase()))
                      .map((doc, dIdx) => (
                        <div key={dIdx} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5 max-w-[70%]">
                            <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <div className="truncate">
                              <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{doc.name}</p>
                              <span className="text-[9px] text-slate-400 font-bold">{doc.size} • {doc.date}</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold py-0.5 px-2 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/10">
                            {doc.tag}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 4. Compliance Center Simulator */}
              {tool.id === 'compliance-center' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${filingStatus.gstr1 === 'Filed Successfully' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                        <span className="text-slate-400">GSTR-1 (Outward Supplies)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${filingStatus.gstr1 === 'Filed Successfully' ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'}`}>
                          {filingStatus.gstr1}
                        </span>
                        {filingStatus.gstr1 === 'Draft Ready' && (
                          <button
                            onClick={fileGSTR1}
                            disabled={simState === 'running'}
                            className="py-1 px-2.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold"
                          >
                            File Form
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold border-t border-slate-100 dark:border-slate-900 pt-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span className="text-slate-400">GSTR-3B (Consolidated Returns)</span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{filingStatus.gstr3b}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold border-t border-slate-100 dark:border-slate-900 pt-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span className="text-slate-400">GSTR-9 (Annual Audit Return)</span>
                      </div>
                      <span className="font-bold text-slate-400">{filingStatus.gstr9}</span>
                    </div>
                  </div>

                  {simState === 'running' && (
                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/20 rounded-xl text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Filing GSTR-1 directly to GST portal...</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${simProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {simState === 'success' && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-400 font-semibold flex items-start gap-2">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">GST Portal Submission Complete</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Return reference ARN: ARN293848123 filed successfully.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. Penalty Prevention Center Simulator */}
              {tool.id === 'penalty-prevention' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Flagged ITC Mismatches (GSTR-2B vs Registry)</span>
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/30 py-0.5 px-2 rounded-full">
                      2 Risks Found
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {suppliers.map((supplier, sIdx) => (
                      <div key={sIdx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold">
                        <div className="space-y-1">
                          <p className="text-slate-800 dark:text-slate-200">{supplier.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{supplier.invoice}</span>
                            <span>•</span>
                            <span className="text-red-500 font-bold">₹{supplier.amount.toLocaleString('en-IN')} Mismatch</span>
                          </div>
                        </div>

                        <div>
                          {supplier.status === 'Alert Sent' ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 py-1 px-2.5 rounded-lg border border-emerald-100/10">
                              Alert Dispatched
                            </span>
                          ) : (
                            <button
                              onClick={() => notifySupplier(sIdx)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all"
                            >
                              Send Notice
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Audit Risk Score Dial mockup */}
                  <div className="p-3 rounded-xl border border-slate-200/50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">System Audit Risk Score</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Calculated from missing bills, delayed filings & ITC ratios</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-black text-emerald-500">12/100</span>
                      <span className="text-[8px] font-extrabold uppercase text-slate-400">Very Low Risk</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Business Analytics Simulator */}
              {tool.id === 'business-analytics' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">GST Cash Flow Trend</span>
                    <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200/50 dark:border-slate-900">
                      {['Monthly', 'Quarterly'].map(int => (
                        <button
                          key={int}
                          onClick={() => setChartInterval(int)}
                          className={`text-[9px] font-bold px-2 py-1 rounded-md transition-colors ${
                            chartInterval === int 
                              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                              : 'text-slate-500'
                          }`}
                        >
                          {int}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom SVG Line Chart Mini */}
                  <div className="h-32 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200/40 dark:border-slate-900 flex items-end justify-between px-6 pb-2 pt-6 relative">
                    <div className="absolute top-2 left-3 text-[9px] text-slate-400 font-bold">Taxable Sales (₹ in Lakhs)</div>
                    
                    {/* SVG mini chart graphic */}
                    <svg className="absolute inset-x-0 bottom-6 h-16 w-full" preserveAspectRatio="none">
                      {chartInterval === 'Quarterly' ? (
                        <path 
                          d="M0,60 L120,45 L240,25 L360,35 L480,10" 
                          fill="none" 
                          stroke="rgb(99, 102, 241)" 
                          strokeWidth="2.5"
                          className="transition-all duration-500"
                        />
                      ) : (
                        <path 
                          d="M0,50 L80,55 L160,40 L240,48 L320,20 L400,28 L480,12" 
                          fill="none" 
                          stroke="rgb(99, 102, 241)" 
                          strokeWidth="2.5"
                          className="transition-all duration-500"
                        />
                      )}
                    </svg>

                    {/* X-axis labels */}
                    {chartInterval === 'Quarterly' ? (
                      <>
                        <span className="text-[9px] text-slate-400 font-bold z-10">Q3 FY25</span>
                        <span className="text-[9px] text-slate-400 font-bold z-10">Q4 FY25</span>
                        <span className="text-[9px] text-slate-400 font-bold z-10">Q1 FY26</span>
                        <span className="text-[9px] text-slate-400 font-bold z-10">Q2 FY26</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] text-slate-400 font-bold z-10">Apr</span>
                        <span className="text-[9px] text-slate-400 font-bold z-10">May</span>
                        <span className="text-[9px] text-slate-400 font-bold z-10">Jun</span>
                        <span className="text-[9px] text-slate-400 font-bold z-10">Jul</span>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-900/50">
                      <p className="text-[9px] text-slate-400 font-bold">Taxable Sales</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">₹42.5L</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-900/50">
                      <p className="text-[9px] text-slate-400 font-bold">ITC Unlocked</p>
                      <p className="text-xs font-bold text-emerald-500 mt-0.5">₹6.8L</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-900/50">
                      <p className="text-[9px] text-slate-400 font-bold">Net GST Due</p>
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">₹2.1L</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. Tax Forecasting Engine Simulator */}
              {tool.id === 'tax-forecasting' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">Expected Q3 Revenue Growth</span>
                      <span className="text-indigo-600 dark:text-indigo-400">+{growthRate}%</span>
                    </div>
                    
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={growthRate}
                      onChange={(e) => setGrowthRate(parseInt(e.target.value))}
                      className="w-full accent-indigo-600 dark:accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-900 flex items-center justify-between text-xs font-semibold">
                    <div>
                      <p className="text-slate-400">Predicted Tax Liability (Q3)</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">Calculated using seasonal algorithms</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-800 dark:text-white">₹{calculatedTaxLiability.toLocaleString('en-IN')}</p>
                      <span className="text-[8px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-150/10">
                        ±3.4% margin
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-250/20 rounded-xl text-[11px] font-semibold text-amber-800 dark:text-amber-400 flex gap-2">
                    <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Tax saving tip:</strong> Optimize your working capital by reconciling outstanding supplier accounts by September 15th to claim ₹18,400 in additional ITC.
                    </p>
                  </div>
                </div>
              )}

              {/* 8. Vendor Intelligence Simulator */}
              {tool.id === 'vendor-intel' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-900 pb-2">
                    <span>Vendor Compliance Directory</span>
                    <span>Action</span>
                  </div>

                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {vendorList.map((vendor, vIdx) => (
                      <div key={vIdx} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-900 bg-slate-50/40 dark:bg-slate-950/20 flex items-center justify-between text-xs font-semibold">
                        <div className="space-y-1">
                          <p className="text-slate-800 dark:text-slate-200">{vendor.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>Score: <strong className={vendor.score > 80 ? 'text-emerald-500' : 'text-amber-500'}>{vendor.score}/100</strong></span>
                            <span>•</span>
                            <span className="font-mono">{vendor.gstin}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleVendorStatus(vIdx)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            vendor.status === 'Active' 
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 hover:text-amber-700 border border-amber-200/20' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {vendor.status === 'Active' ? 'Hold Credit' : 'Unblock Vendor'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. Custom Reports Generator Simulator */}
              {tool.id === 'reports-generator' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 block">Report Output Format</label>
                    <select
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                    >
                      <option>Excel Workbook (.xlsx)</option>
                      <option>Auditor PDF Summary (.pdf)</option>
                      <option>Tally XML Export (.xml)</option>
                      <option>JSON Data Array (.json)</option>
                    </select>
                  </div>

                  {simState === 'idle' && (
                    <button
                      onClick={handleExport}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Compile & Download Statement</span>
                    </button>
                  )}

                  {simState === 'running' && (
                    <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/20 rounded-xl text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Compiling ledger audits...</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${simProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {simState === 'success' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-400 font-semibold flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>Report generated and ready!</span>
                      </div>
                      <button
                        onClick={() => setSimState('idle')}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
                      >
                        Generate Another Report
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 10. Executive Dashboard Simulator */}
              {tool.id === 'executive-dashboard' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {Object.keys(branches).map(bCode => (
                      <button
                        key={bCode}
                        onClick={() => setActiveBranch(bCode)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          activeBranch === bCode
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200/40 dark:border-slate-800/40'
                        }`}
                      >
                        {bCode} Branch
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-900/50 bg-slate-50/50 dark:bg-slate-950/50 text-xs font-semibold">
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                      {branches[activeBranch].name}
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[9px] text-slate-400">Branch GSTIN</span>
                        <p className="text-slate-800 dark:text-slate-200 font-mono text-[11px] mt-0.5">{branches[activeBranch].gstin}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400">Tax Liability</span>
                        <p className="text-slate-800 dark:text-slate-200 mt-0.5">{branches[activeBranch].netLiability}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400">Filing Status</span>
                        <p className="text-slate-850 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${branches[activeBranch].filed === 'Yes' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          {branches[activeBranch].filed === 'Yes' ? 'Return Filed' : 'Pending Filing'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400">Compliance Rating</span>
                        <p className="text-emerald-500 mt-0.5">{branches[activeBranch].score}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Interactive Configuration Toggles */}
          <div className="space-y-3.5 pt-2">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Configuration</h4>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-900/80 cursor-pointer select-none">
                <div className="space-y-0.5 max-w-[80%]">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {tool.id === 'ai-accountant' && 'Auto-Sync GST Circulars'}
                    {tool.id === 'invoice-intel' && 'Batch processing (Multi-Page)'}
                    {tool.id === 'doc-assistant' && 'Secure Encrypted Backup'}
                    {tool.id === 'compliance-center' && 'Auto-File Low Liability Drafts'}
                    {tool.id === 'penalty-prevention' && 'Auto-Hold Non-Filer Payments'}
                    {tool.id === 'business-analytics' && 'Include Inter-State CGST/SGST'}
                    {tool.id === 'tax-forecasting' && 'Include Seasonal Forecast Buffers'}
                    {tool.id === 'vendor-intel' && 'Auto-Notify Non-Filing Suppliers'}
                    {tool.id === 'reports-generator' && 'Schedule Automatic Monthly Digests'}
                    {tool.id === 'executive-dashboard' && 'Enable Multi-Factor Authentication'}
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {tool.id === 'ai-accountant' && 'Instantly digest newly issued CBIC updates.'}
                    {tool.id === 'invoice-intel' && 'Queue multiple documents for extraction.'}
                    {tool.id === 'doc-assistant' && 'Sync file indices securely using 256-bit keys.'}
                    {tool.id === 'compliance-center' && 'Submit auto-filled drafts when liabilities align.'}
                    {tool.id === 'penalty-prevention' && 'Automatically restrict credit claims for unfiled receipts.'}
                    {tool.id === 'business-analytics' && 'Show breakups for regional operations.'}
                    {tool.id === 'tax-forecasting' && 'Apply higher cash margins in volatile quarters.'}
                    {tool.id === 'vendor-intel' && 'Alert vendors when GSTR-2B matching misses.'}
                    {tool.id === 'reports-generator' && 'Dispatch reports directly to CAs on the 1st.'}
                    {tool.id === 'executive-dashboard' && 'Require OTP verification for corporate branches.'}
                  </p>
                </div>
                <div className="relative flex-shrink-0">
                  <input 
                    type="checkbox" 
                    checked={toggleA} 
                    onChange={(e) => setToggleA(e.target.checked)} 
                    className="sr-only" 
                  />
                  <div className={`w-9 h-5 rounded-full transition-colors duration-200 p-0.5 ${toggleA ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-800'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${toggleA ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-900/80 cursor-pointer select-none">
                <div className="space-y-0.5 max-w-[80%]">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {tool.id === 'ai-accountant' && 'Enable AI Voice Guidance'}
                    {tool.id === 'invoice-intel' && 'Auto-approve high confidence values'}
                    {tool.id === 'doc-assistant' && 'Smart Auto-Tagging Engine'}
                    {tool.id === 'compliance-center' && 'Receive SMS & WhatsApp Alerts'}
                    {tool.id === 'penalty-prevention' && 'Escalate discrepancies to Auditor'}
                    {tool.id === 'business-analytics' && 'Live WebSocket telemetry stream'}
                    {tool.id === 'tax-forecasting' && 'Integrate with accounting cash buffers'}
                    {tool.id === 'vendor-intel' && 'Block claims under 70 compliance rating'}
                    {tool.id === 'reports-generator' && 'Password-Protect Compiled exports'}
                    {tool.id === 'executive-dashboard' && 'Aggregate Branch-wise Audits'}
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {tool.id === 'ai-accountant' && 'Speak prompts aloud and listen to tax circular reviews.'}
                    {tool.id === 'invoice-intel' && 'Bypass manual approval if OCR confidence > 98%.'}
                    {tool.id === 'doc-assistant' && 'Let AI assign category tags based on invoice details.'}
                    {tool.id === 'compliance-center' && 'Get notified 48 hours prior to deadlines.'}
                    {tool.id === 'penalty-prevention' && 'Send instant dashboard flags to CA logs.'}
                    {tool.id === 'business-analytics' && 'Feed updates directly from ERP integrations.'}
                    {tool.id === 'tax-forecasting' && 'Pull live liquid capital levels from bank API.'}
                    {tool.id === 'vendor-intel' && 'Enforce strict credit rules on failing suppliers.'}
                    {tool.id === 'reports-generator' && 'Encrypt files with secure unique keys.'}
                    {tool.id === 'executive-dashboard' && 'Combine entity metrics in a single log stream.'}
                  </p>
                </div>
                <div className="relative flex-shrink-0">
                  <input 
                    type="checkbox" 
                    checked={toggleB} 
                    onChange={(e) => setToggleB(e.target.checked)} 
                    className="sr-only" 
                  />
                  <div className={`w-9 h-5 rounded-full transition-colors duration-200 p-0.5 ${toggleB ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-800'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${toggleB ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Step-by-Step Usage Guide */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">How to Use</h4>
            <div className="p-4.5 rounded-2xl bg-indigo-50/20 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-900 text-xs text-slate-700 dark:text-slate-400 space-y-3 leading-relaxed">
              <div className="flex gap-2.5 items-start">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">1</span>
                <p>
                  {tool.id === 'ai-accountant' && 'Open the compliance assistant and type a prompt about filing laws or liabilities.'}
                  {tool.id === 'invoice-intel' && 'Upload/drag documents into the smart bill upload center to trigger neural extraction.'}
                  {tool.id === 'doc-assistant' && 'Store folders in the vault. The system automatically structures and encrypts each file.'}
                  {tool.id === 'compliance-center' && 'View generated draft forms for GSTR-1 and GSTR-3B in the compliance panel.'}
                  {tool.id === 'penalty-prevention' && 'Review mismatched entries on the penalty dashboard to detect vendor error flags.'}
                  {tool.id === 'business-analytics' && 'Review visual cash charts in the business health view to view gross outlays.'}
                  {tool.id === 'tax-forecasting' && 'Navigate to the forecast screen to review AI predictions of quarterly tax liabilities.'}
                  {tool.id === 'vendor-intel' && 'Audit supplier compliance ratings to safeguard against blocked credit claims.'}
                  {tool.id === 'reports-generator' && 'Configure custom filters and export audit sheets in Excel, PDF, or Tally format.'}
                  {tool.id === 'executive-dashboard' && 'Register multiple branch GSTINs in the settings to load consolidated logs.'}
                </p>
              </div>

              <div className="flex gap-2.5 items-start">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">2</span>
                <p>
                  {tool.id === 'ai-accountant' && 'AI reviews matching rules and circulars to respond with statutory tax citations.'}
                  {tool.id === 'invoice-intel' && 'Edit values if needed and save. Net amounts and taxes reconcile instantly.'}
                  {tool.id === 'doc-assistant' && 'Query search indices using keywords or let tags categorize invoice metadata.'}
                  {tool.id === 'compliance-center' && 'Review details and click GSTR-1 file to sync return drafts to the government portal.'}
                  {tool.id === 'penalty-prevention' && 'Click Notify to dispatch automated WhatsApp or email warnings to defaulting vendors.'}
                  {tool.id === 'business-analytics' && 'Export charts as high-resolution SVG/PDF statements for company meetings.'}
                  {tool.id === 'tax-forecasting' && 'Adjust forecast parameters to allocate working capital for future tax pools.'}
                  {tool.id === 'vendor-intel' && 'Enable hold triggers to delay payouts for invoices missing from GSTR-2B listings.'}
                  {tool.id === 'reports-generator' && 'Schedule reports to compile on specific dates to auto-email audit packages.'}
                  {tool.id === 'executive-dashboard' && 'Switch between branches in the branch selector to verify filing status records.'}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Drawer Footer Actions */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 flex items-center gap-3">
          <button
            onClick={() => {
              const title = tool.title.toLowerCase();
              if (title.includes('accountant') || title.includes('advice')) {
                navigate('/chat');
              } else if (title.includes('invoice intelligence') || title.includes('ocr') || title.includes('upload')) {
                navigate('/bill-upload');
              } else if (title.includes('gstr-1') || title.includes('forms') || title.includes('filing')) {
                navigate('/gst-forms');
              } else if (title.includes('credit') || title.includes('itc') || title.includes('optimizer')) {
                navigate('/dashboard');
              } else if (title.includes('ledger') || title.includes('smart invoicing')) {
                navigate('/invoices');
              } else if (title.includes('audit') || title.includes('compliance audit')) {
                navigate('/compliance');
              } else if (title.includes('penalty') || title.includes('calculator')) {
                navigate('/dashboard');
              } else if (title.includes('branch') || title.includes('branches')) {
                navigate('/business');
              } else if (title.includes('reconciliation') || title.includes('vendor')) {
                navigate('/compliance');
              } else if (title.includes('way bill') || title.includes('generator')) {
                navigate('/invoices');
              } else {
                navigate('/dashboard');
              }
              onClose();
            }}
            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-650 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/10 transition-all select-none text-center"
          >
            Launch Full Tool
          </button>
          
          <button
            onClick={onClose}
            className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors select-none"
          >
            Close Inspect
          </button>
        </div>

      </motion.div>
    </>
  );
}
