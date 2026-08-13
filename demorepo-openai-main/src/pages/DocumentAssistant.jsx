import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { analyzeDocument } from '../services/aiService';
import { fetchActivePlan } from '../services/subscriptionService';
import { useTranslation } from 'react-i18next';

function DocumentAssistant() {
  const { t } = useTranslation();
  // Entitlement is resolved from the server — localStorage is display cache only.
  const [activePlan, setActivePlan] = useState('free');

  const [documentCount, setDocumentCount] = useState(() => {
    return Number(localStorage.getItem('saas_doc_count')) || 0;
  });

  useEffect(() => {
    fetchActivePlan().then((plan) => setActivePlan(plan));
    const handlePlanChanged = () => {
      fetchActivePlan().then((plan) => setActivePlan(plan));
    };
    window.addEventListener('planChanged', handlePlanChanged);
    return () => window.removeEventListener('planChanged', handlePlanChanged);
  }, []);

  const limit = activePlan === 'free' ? 3 : activePlan === 'pro' ? 50 : Infinity;
  const [docFile, setDocFile] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [docExtracted, setDocExtracted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleDocUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setDocExtracted(null);
      setNotification(null);
    }
  };

  // OCR Text Extraction using Tesseract (for fallback)
  const extractTextWithOCR = async (targetFile) => {
    setProgress(15);
    try {
      const result = await Tesseract.recognize(targetFile, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(15 + m.progress * 45)); // Scale progress to 15-60%
          }
        }
      });
      setProgress(60);
      return result.data.text;
    } catch (err) {
      console.error('OCR Error:', err);
      throw new Error('Failed to parse text from image using OCR.');
    }
  };

  const handleAnalyze = async () => {
    if (!docFile) return;

    // Limit check
    if (documentCount >= limit) {
      alert(`⚠️ Document Limit Reached: You have analyzed ${documentCount} of ${limit} documents this month under the ${activePlan === 'free' ? 'Free' : 'Pro'} Plan. Please upgrade your subscription to process more documents.`);
      localStorage.setItem('selectedPlan', activePlan === 'free' ? 'pro' : 'business');
      window.location.href = '/pricing';
      return;
    }

    setLoading(true);
    setProgress(0);
    
    try {
      let analysis = null;
      const isImage = docFile.type?.startsWith('image/') || docFile.name?.endsWith('.png') || docFile.name?.endsWith('.jpg') || docFile.name?.endsWith('.jpeg');

      if (isImage && docPreview) {
        setNotification({ message: 'Analyzing legal document using AI Vision...', type: 'info' });
        setProgress(40);
        try {
          // Send image directly to server-side Gemini
          const result = await analyzeDocument({ image: docPreview });
          analysis = result.data;
        } catch (visionErr) {
          console.warn('Vision notice analysis failed. Falling back to local OCR:', visionErr);
        }
      }

      if (!analysis) {
        setNotification({ message: 'Scanning notice text using OCR...', type: 'info' });
        const text = await extractTextWithOCR(docFile);
        if (!text || text.trim().length < 15) {
          throw new Error('OCR returned insufficient text. Please verify image clarity.');
        }
        setNotification({ message: 'Analyzing scanned text with attorney models...', type: 'info' });
        setProgress(75);
        // Send OCR text to server-side Gemini
        const result = await analyzeDocument({ ocrText: text });
        analysis = result.data;
      }

      setDocExtracted(analysis);
      setNotification({ message: 'Legal document audit complete!', type: 'success' });
      setProgress(100);
      
      const newCount = documentCount + 1;
      setDocumentCount(newCount);
      localStorage.setItem('saas_doc_count', newCount);
    } catch (e) {
      console.error(e);
      setNotification({ message: e.message || 'Analysis failed. Please ensure the document is clear and try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{t('docassist_title')}</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            {t('docassist_subtitle')}
          </p>
        </div>

        {/* Scan Limits Badge */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-lg)',
          fontSize: '0.75rem',
          textAlign: 'right'
        }}>
          <div>{t('docassist_docs_analyzed')}: <strong>{documentCount} / {limit === Infinity ? t('docassist_unlimited') : limit}</strong></div>
          <div style={{ width: '120px', background: 'var(--bg-tertiary)', height: '4px', borderRadius: '2px', display: 'inline-block', overflow: 'hidden', marginTop: '0.25rem' }}>
            <div style={{ width: `${limit === Infinity ? 100 : Math.min(100, (documentCount / limit) * 100)}%`, background: documentCount >= limit ? 'var(--error)' : 'var(--theme-primary)', height: '100%' }}></div>
          </div>
        </div>
      </div>

      {notification && (
        <div style={{ 
          padding: '1rem', 
          background: notification.type === 'error' ? 'var(--error-light, #fee2e2)' : notification.type === 'success' ? 'var(--success-light, #dcfce7)' : 'var(--bg-secondary)', 
          borderLeft: `4px solid ${notification.type === 'error' ? 'var(--error)' : notification.type === 'success' ? 'var(--success)' : 'var(--theme-secondary)'}`, 
          color: 'var(--text-primary)',
          borderRadius: 'var(--radius-md)', 
          marginBottom: '1.5rem', 
          fontSize: '0.825rem',
          fontWeight: 500
        }}>
          {notification.message}
        </div>
      )}

      {/* Main scanner grid */}
      <div className="grid" style={{ gridTemplateColumns: docPreview ? '1.1fr 0.9fr' : '1fr', gap: '2rem' }}>
        
        {/* Upload Column */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>{t('docassist_scan_notice')}</h3>
          
          <div style={{ border: '2px dashed var(--border-color)', padding: '2.5rem', textAlign: 'center', borderRadius: 'var(--radius-lg)', background: 'var(--bg-primary)' }}>
            <span style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </span>
            <input type="file" onChange={handleDocUpload} accept="image/*,application/pdf" style={{ display: 'block', margin: '0 auto 1.5rem', fontSize: '0.85rem' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('docassist_formats')}</span>
          </div>

          {docPreview && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <img src={docPreview} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem' }} />
              
              {loading && (
                <div style={{ width: '100%', background: 'var(--bg-tertiary)', borderRadius: '10px', height: '8px', marginBottom: '1.25rem', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, background: 'var(--theme-primary)', height: '100%', transition: 'width 0.3s ease' }}></div>
                </div>
              )}

              <button onClick={handleAnalyze} disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                {loading ? `${t('docassist_analyzing')} (${progress}%)...` : `⚡ ${t('docassist_extract')}`}
              </button>
            </div>
          )}
        </div>

        {/* Results Column */}
        {loading && !docExtracted && (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center', alignItems: 'center' }}>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
            <strong style={{ fontSize: '0.95rem' }}>{t('docassist_processing')}</strong>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '280px' }}>{t('docassist_processing_desc')}</p>
          </div>
        )}

        {docExtracted && (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>{t('docassist_classification')}</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{docExtracted.documentType}</h3>
              </div>
              <span className={`badge-premium ${docExtracted.riskLevel === 'critical' || docExtracted.riskLevel === 'high' ? 'badge-critical' : 'badge-excellent'}`} style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                {t('docassist_risk')}: {docExtracted.riskLevel}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>{t('docassist_exec_summary')}</span>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>{docExtracted.summary}</p>
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>{t('docassist_clauses')}</span>
                <ul style={{ paddingLeft: '1.1rem', margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {docExtracted.clauses?.map((sec, i) => <li key={i}>{sec}</li>)}
                </ul>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>{t('docassist_deadline')}</span>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', fontWeight: 800, color: docExtracted.deadlines !== 'N/A' ? 'var(--error)' : 'var(--text-secondary)' }}>{docExtracted.deadlines}</p>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>{t('docassist_actions')}</span>
              <ul style={{ paddingLeft: '1.1rem', margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {docExtracted.actionItems?.map((act, i) => <li key={i}>{act}</li>)}
              </ul>
            </div>

            {docExtracted.suggestedResponse && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>{t('docassist_response_draft')}</span>
                <textarea 
                  readOnly 
                  value={docExtracted.suggestedResponse}
                  style={{ width: '100%', minHeight: '180px', marginTop: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.775rem', fontFamily: 'monospace', lineHeight: '1.4', outline: 'none' }}
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(docExtracted.suggestedResponse);
                    alert('Suggested legal reply copied to clipboard!');
                  }}
                  className="btn btn-outline" 
                  style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem' }}
                >
                  📋 {t('docassist_copy_response')}
                </button>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}

export default DocumentAssistant;
