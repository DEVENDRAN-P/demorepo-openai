import React, { useState } from 'react';

const Home = () => {
    const [expandedStep, setExpandedStep] = useState(null);
    return (
        <div style={{ paddingTop: '120px' }}>
            {/* Home Section */}
            <section id="home" style={{ 
                minHeight: '100vh', 
                padding: '2rem', 
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ textAlign: 'center', maxWidth: '800px' }}>
                    <h1 style={{ fontSize: '3rem', color: '#1e3c72', marginBottom: '1rem' }}>
                        Welcome to AI IN BUSINESS
                    </h1>
                    <h2 style={{ fontSize: '1.5rem', color: '#2a5298', marginBottom: '2rem' }}>
                        AI GST & COMPLIANCE BUDDY
                    </h2>
                    <p style={{ fontSize: '1.2rem', color: '#64748b', lineHeight: '1.6' }}>
                        Streamline your business compliance with our AI-powered GST calculator and compliance tools.
                        Get accurate calculations, stay compliant, and focus on growing your business.
                    </p>
                </div>
            </section>

            {/* GST Calculator Section */}
            <section id="gst-calculator" style={{ 
                minHeight: '100vh', 
                padding: '4rem 2rem', 
                background: '#ffffff'
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.5rem', color: '#1e3c72', marginBottom: '2rem' }}>
                        🧮 GST Calculator
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '3rem' }}>
                        Calculate GST with precision using our AI-powered calculator. 
                        Support for all GST rates and complex scenarios.
                    </p>
                    <div style={{ 
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        padding: '3rem',
                        borderRadius: '20px',
                        color: 'white',
                        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
                    }}>
                        <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Features</h3>
                        <ul style={{ listStyle: 'none', padding: 0, fontSize: '1.1rem' }}>
                            <li style={{ margin: '1rem 0' }}>✅ Real-time GST calculations</li>
                            <li style={{ margin: '1rem 0' }}>✅ Multiple GST rates support</li>
                            <li style={{ margin: '1rem 0' }}>✅ Invoice generation</li>
                            <li style={{ margin: '1rem 0' }}>✅ Export to various formats</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Compliance Section */}
            <section id="compliance" style={{ 
                minHeight: '100vh', 
                padding: '4rem 2rem', 
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.5rem', color: '#1e3c72', marginBottom: '2rem' }}>
                        📋 Compliance Management
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '3rem' }}>
                        Stay compliant with automated tracking and reporting. 
                        Never miss a deadline again with our intelligent reminder system.
                    </p>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                        gap: '2rem',
                        marginTop: '3rem'
                    }}>
                        <div style={{ 
                            background: 'white',
                            padding: '2rem',
                            borderRadius: '15px',
                            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)'
                        }}>
                            <h4 style={{ color: '#1e3c72', marginBottom: '1rem' }}>Auto Filing</h4>
                            <p style={{ color: '#64748b' }}>Automated GST return filing with error checking</p>
                        </div>
                        <div style={{ 
                            background: 'white',
                            padding: '2rem',
                            borderRadius: '15px',
                            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)'
                        }}>
                            <h4 style={{ color: '#1e3c72', marginBottom: '1rem' }}>Deadline Tracking</h4>
                            <p style={{ color: '#64748b' }}>Smart reminders for all compliance deadlines</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Features Section */}
            <section id="ai-features" style={{ 
                minHeight: '100vh', 
                padding: '4rem 2rem', 
                background: 'linear-gradient(135deg, #1e3c72 0%, #3b82f6 100%)',
                color: 'white'
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>
                        🤖 AI-Powered Features
                    </h2>
                    <p style={{ fontSize: '1.1rem', marginBottom: '3rem', opacity: 0.9 }}>
                        Leverage artificial intelligence to automate your business processes 
                        and gain intelligent insights.
                    </p>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                        gap: '2rem',
                        marginTop: '3rem'
                    }}>
                        <div style={{ 
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '2rem',
                            borderRadius: '15px',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <h4 style={{ marginBottom: '1rem' }}>Smart Analysis</h4>
                            <p style={{ opacity: 0.9 }}>AI-driven insights and recommendations for your business</p>
                        </div>
                        <div style={{ 
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '2rem',
                            borderRadius: '15px',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <h4 style={{ marginBottom: '1rem' }}>Predictive Compliance</h4>
                            <p style={{ opacity: 0.9 }}>Predict and prevent compliance issues before they occur</p>
                        </div>
                        <div style={{ 
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '2rem',
                            borderRadius: '15px',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <h4 style={{ marginBottom: '1rem' }}>Intelligent Automation</h4>
                            <p style={{ opacity: 0.9 }}>Automate repetitive tasks with machine learning</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Essential Features & How to Use Section */}
            <section id="how-to-use" style={{ 
                minHeight: '100vh', 
                padding: '4rem 2rem', 
                background: '#ffffff'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2.5rem', color: '#1e3c72', marginBottom: '1rem', textAlign: 'center' }}>
                        ✨ Essential Features
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '3rem', textAlign: 'center' }}>
                        Discover all the powerful features and learn how to use them step-by-step
                    </p>

                    {/* Feature Cards Grid */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                        gap: '2rem',
                        marginBottom: '4rem'
                    }}>
                        {/* Feature 1: Bill Upload */}
                        <div 
                            style={{ 
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                padding: '2rem',
                                borderRadius: '15px',
                                color: 'white',
                                boxShadow: '0 5px 20px rgba(102, 126, 234, 0.3)',
                                cursor: 'pointer',
                                transition: 'transform 0.3s ease',
                                transform: expandedStep === 1 ? 'scale(1.05)' : 'scale(1)'
                            }}
                            onClick={() => setExpandedStep(expandedStep === 1 ? null : 1)}
                        >
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📤 Bill Upload & Scan</h3>
                            <p style={{ opacity: 0.95, marginBottom: '1rem' }}>Upload invoices or scan with camera</p>
                            {expandedStep === 1 && (
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', marginTop: '1rem' }}>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>1️⃣ Click "Upload Bill" or "Scan with Camera"</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>2️⃣ Select image/PDF or capture invoice photo</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>3️⃣ AI automatically extracts all details</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>4️⃣ Review & edit fields if needed</p>
                                </div>
                            )}
                        </div>

                        {/* Feature 2: Voice Input */}
                        <div 
                            style={{ 
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                padding: '2rem',
                                borderRadius: '15px',
                                color: 'white',
                                boxShadow: '0 5px 20px rgba(245, 87, 108, 0.3)',
                                cursor: 'pointer',
                                transition: 'transform 0.3s ease',
                                transform: expandedStep === 2 ? 'scale(1.05)' : 'scale(1)'
                            }}
                            onClick={() => setExpandedStep(expandedStep === 2 ? null : 2)}
                        >
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎤 Voice Input</h3>
                            <p style={{ opacity: 0.95, marginBottom: '1rem' }}>Speak invoice details hands-free</p>
                            {expandedStep === 2 && (
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', marginTop: '1rem' }}>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>1️⃣ Click the microphone button</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>2️⃣ Speak invoice details (e.g., "Bill from ABC for 5000 with 18% GST")</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>3️⃣ System recognizes and converts to text</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>4️⃣ AI extracts structured data automatically</p>
                                </div>
                            )}
                        </div>

                        {/* Feature 3: AI Extraction */}
                        <div 
                            style={{ 
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                padding: '2rem',
                                borderRadius: '15px',
                                color: 'white',
                                boxShadow: '0 5px 20px rgba(79, 172, 254, 0.3)',
                                cursor: 'pointer',
                                transition: 'transform 0.3s ease',
                                transform: expandedStep === 3 ? 'scale(1.05)' : 'scale(1)'
                            }}
                            onClick={() => setExpandedStep(expandedStep === 3 ? null : 3)}
                        >
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🤖 AI-Powered Extraction</h3>
                            <p style={{ opacity: 0.95, marginBottom: '1rem' }}>Smart data parsing with OCR</p>
                            {expandedStep === 3 && (
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', marginTop: '1rem' }}>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>✅ Extracts: Supplier, GSTIN, Amount, Tax %</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>✅ Works with blurry/low-quality images</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>✅ Detects CGST, SGST, IGST breakdowns</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>✅ Calculates tax amounts automatically</p>
                                </div>
                            )}
                        </div>

                        {/* Feature 4: GST Calculation */}
                        <div 
                            style={{ 
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                padding: '2rem',
                                borderRadius: '15px',
                                color: 'white',
                                boxShadow: '0 5px 20px rgba(67, 233, 123, 0.3)',
                                cursor: 'pointer',
                                transition: 'transform 0.3s ease',
                                transform: expandedStep === 4 ? 'scale(1.05)' : 'scale(1)'
                            }}
                            onClick={() => setExpandedStep(expandedStep === 4 ? null : 4)}
                        >
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🧮 Auto GST Calculation</h3>
                            <p style={{ opacity: 0.95, marginBottom: '1rem' }}>Instant tax calculations</p>
                            {expandedStep === 4 && (
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', marginTop: '1rem' }}>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>💡 Supports: 5%, 12%, 18%, 28% rates</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>💡 Multiple rates: 9+9 → auto-summed to 18%</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>💡 CGST+SGST dual tax handling</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>💡 Real-time total recalculation</p>
                                </div>
                            )}
                        </div>

                        {/* Feature 5: Form Generation */}
                        <div 
                            style={{ 
                                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                                padding: '2rem',
                                borderRadius: '15px',
                                color: 'white',
                                boxShadow: '0 5px 20px rgba(250, 112, 154, 0.3)',
                                cursor: 'pointer',
                                transition: 'transform 0.3s ease',
                                transform: expandedStep === 5 ? 'scale(1.05)' : 'scale(1)'
                            }}
                            onClick={() => setExpandedStep(expandedStep === 5 ? null : 5)}
                        >
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋 GST Forms Auto-Fill</h3>
                            <p style={{ opacity: 0.95, marginBottom: '1rem' }}>Generate GSTR-1 & GSTR-3B</p>
                            {expandedStep === 5 && (
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', marginTop: '1rem' }}>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>📝 Auto-fill GSTR-1 (outward supply)</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>📝 Auto-fill GSTR-3B (summary return)</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>📝 Categorize by expense type</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>📝 Download as PDF/Excel</p>
                                </div>
                            )}
                        </div>

                        {/* Feature 6: Reports & Analytics */}
                        <div 
                            style={{ 
                                background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                                padding: '2rem',
                                borderRadius: '15px',
                                color: '#2c3e50',
                                boxShadow: '0 5px 20px rgba(168, 237, 234, 0.3)',
                                cursor: 'pointer',
                                transition: 'transform 0.3s ease',
                                transform: expandedStep === 6 ? 'scale(1.05)' : 'scale(1)'
                            }}
                            onClick={() => setExpandedStep(expandedStep === 6 ? null : 6)}
                        >
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📊 Reports & Analytics</h3>
                            <p style={{ opacity: 0.95, marginBottom: '1rem' }}>View compliance dashboard</p>
                            {expandedStep === 6 && (
                                <div style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '10px', marginTop: '1rem' }}>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>📈 Monthly/Quarterly reports</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>📈 Tax summary by category</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>📈 Compliance score & alerts</p>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>📈 Filing status tracker</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Start Guide */}
                    <div style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        padding: '3rem',
                        borderRadius: '20px',
                        color: 'white',
                        marginTop: '3rem'
                    }}>
                        <h3 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>🚀 Quick Start Guide</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '15px' }}>
                                <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Step 1: Upload Bill</h4>
                                <p style={{ opacity: 0.9, lineHeight: '1.6' }}>Go to "Bill Upload" and drag-drop your invoice image, scan with camera, or use voice input.</p>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '15px' }}>
                                <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Step 2: Verify Details</h4>
                                <p style={{ opacity: 0.9, lineHeight: '1.6' }}>Review extracted data (supplier, amount, tax %). Edit if needed. System auto-calculates totals.</p>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '15px' }}>
                                <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Step 3: Generate Forms</h4>
                                <p style={{ opacity: 0.9, lineHeight: '1.6' }}>Go to "GST Forms" and download auto-filled GSTR-1 and GSTR-3B documents.</p>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '15px' }}>
                                <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Step 4: File & Track</h4>
                                <p style={{ opacity: 0.9, lineHeight: '1.6' }}>Submit forms with one click. View filing status in Reports & track compliance score.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" style={{ 
                minHeight: '100vh', 
                padding: '4rem 2rem', 
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center'
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.5rem', color: '#1e3c72', marginBottom: '2rem' }}>
                        📞 Get In Touch
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '3rem' }}>
                        Ready to transform your business with AI-powered compliance tools? 
                        Contact us today for a personalized demo.
                    </p>
                    <div style={{ 
                        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                        padding: '3rem',
                        borderRadius: '20px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h3 style={{ color: '#1e3c72', marginBottom: '2rem' }}>Contact Information</h3>
                        <div style={{ fontSize: '1.1rem', color: '#64748b' }}>
                            <p>📧 Email: contact@aigstbuddy.com</p>
                            <p>📱 Phone: +91 9876543210</p>
                            <p>🌐 Website: www.aigstbuddy.com</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;