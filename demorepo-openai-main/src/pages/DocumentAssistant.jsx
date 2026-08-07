import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';

function DocumentAssistant() {
  const [activePlan, setActivePlan] = useState(() => {
    return localStorage.getItem('saas_active_plan') || 'free';
  });

  const [documentCount, setDocumentCount] = useState(() => {
    return Number(localStorage.getItem('saas_doc_count')) || 0;
  });

  useEffect(() => {
    const handlePlanChanged = () => {
      setActivePlan(localStorage.getItem('saas_active_plan') || 'free');
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

  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || '';

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

  // Groq Notice / Legal Agreement Analyze (Text Mode)
  const analyzeTextWithAI = async (ocrText) => {
    setProgress(75);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an expert Indian Tax Attorney and Corporate Legal Advisor.
Analyze this official document, tax notice, contract, or government letter. Return ONLY a valid JSON object matching this structure exactly (do not output any markdown headers, wrappers or extra text):
{
  "documentType": "GST Notice | Tax Demand | Business Contract | Legal Notice | Vendor Statement | Other",
  "summary": "Detailed explanation of what the document is, why it was issued, and what it implies for the business.",
  "clauses": ["List of key clauses, sections, or invoice references mentioned"],
  "riskLevel": "low | medium | high | critical",
  "deadlines": "YYYY-MM-DD or 'Immediate' or 'N/A'",
  "actionItems": ["Step-by-step required actions by the business to comply or respond"],
  "suggestedResponse": "A formal response letter draft addressed to the tax officer or concerned corporate authority, ready for copy-pasting."
}`
            },
            { role: 'user', content: ocrText }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          max_tokens: 1400
        })
      });

      setProgress(85);
      if (!response.ok) throw new Error('Groq AI API request failed');
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from API. This usually happens if the request is blocked by a corporate firewall, a captive network login page, or an active Service Worker from another app on localhost. Please try using an Incognito window or clearing your browser cache and site data.');
      }
      const data = await response.json();
      const responseText = data.choices[0]?.message?.content || '';

      let jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
      if (!jsonMatch) jsonMatch = responseText.match(/```([\s\S]*?)```/);
      if (!jsonMatch) jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse AI response.');

      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (err) {
      throw err;
    }
  };

  // Groq Notice / Legal Agreement Analyze (Vision Mode)
  const analyzeImageWithVisionAI = async (base64DataUrl) => {
    setProgress(70);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an expert Indian Tax Attorney and Corporate Legal Advisor.
Analyze this official document, tax notice, contract, or government letter image. Return ONLY a valid JSON object matching this structure exactly (do not output any markdown headers, wrappers or extra text):
{
  "documentType": "GST Notice | Tax Demand | Business Contract | Legal Notice | Vendor Statement | Other",
  "summary": "Detailed explanation of what the document is, why it was issued, and what it implies for the business.",
  "clauses": ["List of key clauses, sections, or invoice references mentioned"],
  "riskLevel": "low | medium | high | critical",
  "deadlines": "YYYY-MM-DD or 'Immediate' or 'N/A'",
  "actionItems": ["Step-by-step required actions by the business to comply or respond"],
  "suggestedResponse": "A formal response letter draft addressed to the tax officer or concerned corporate authority, ready for copy-pasting."
}`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this GST notice/document image and extract context details.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64DataUrl
                  }
                }
              ]
            }
          ],
          model: 'llama-3.2-11b-vision-preview',
          temperature: 0.1,
          max_tokens: 1400
        })
      });

      setProgress(85);
      if (!response.ok) throw new Error('Groq Vision AI API request failed');
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from API. This usually happens if the request is blocked by a corporate firewall, a captive network login page, or an active Service Worker from another app on localhost. Please try using an Incognito window or clearing your browser cache and site data.');
      }
      const data = await response.json();
      const responseText = data.choices[0]?.message?.content || '';

      let jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
      if (!jsonMatch) jsonMatch = responseText.match(/```([\s\S]*?)```/);
      if (!jsonMatch) jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse Vision AI response.');

      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (err) {
      throw err;
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
        try {
          analysis = await analyzeImageWithVisionAI(docPreview);
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
        analysis = await analyzeTextWithAI(text);
      }

      setDocExtracted(analysis);
      setNotification({ message: 'Legal document audit complete!', type: 'success' });
      setProgress(100);
      
      const newCount = documentCount + 1;
      setDocumentCount(newCount);
      localStorage.setItem('saas_doc_count', newCount);
    } catch (e) {
      console.error(e);
      setNotification({ message: e.message || 'Analysis failed. Make sure the document is clear and check your Groq API key.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>AI Document Assistant</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Upload official tax notices, demand letters, vendor agreements, and business contracts. AI will extract key terms and draft formal responses.
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
          <div>Documents analyzed: <strong>{documentCount} / {limit === Infinity ? 'Unlimited' : limit}</strong></div>
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
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>Scan Notice / Agreement</h3>
          
          <div style={{ border: '2px dashed var(--border-color)', padding: '2.5rem', textAlign: 'center', borderRadius: 'var(--radius-lg)', background: 'var(--bg-primary)' }}>
            <span style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </span>
            <input type="file" onChange={handleDocUpload} accept="image/*,application/pdf" style={{ display: 'block', margin: '0 auto 1.5rem', fontSize: '0.85rem' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Supported formats: JPG, PNG, PDF documents (max 5MB)</span>
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
                {loading ? `Analyzing document context (${progress}%)...` : '⚡ AI Extract & Audit Document'}
              </button>
            </div>
          )}
        </div>

        {/* Results Column */}
        {loading && !docExtracted && (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center', alignItems: 'center' }}>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
            <strong style={{ fontSize: '0.95rem' }}>Processing legal contextual models...</strong>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '280px' }}>Extracting clauses, comparing statutory GST liabilities, and drafting response frameworks.</p>
          </div>
        )}

        {docExtracted && (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Classification</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{docExtracted.documentType}</h3>
              </div>
              <span className={`badge-premium ${docExtracted.riskLevel === 'critical' || docExtracted.riskLevel === 'high' ? 'badge-critical' : 'badge-excellent'}`} style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                Risk: {docExtracted.riskLevel}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>AI Executive Summary</span>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>{docExtracted.summary}</p>
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Important Clauses / Refs</span>
                <ul style={{ paddingLeft: '1.1rem', margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {docExtracted.clauses?.map((sec, i) => <li key={i}>{sec}</li>)}
                </ul>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Compliance Deadline</span>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', fontWeight: 800, color: docExtracted.deadlines !== 'N/A' ? 'var(--error)' : 'var(--text-secondary)' }}>{docExtracted.deadlines}</p>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Required Compliance Actions</span>
              <ul style={{ paddingLeft: '1.1rem', margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {docExtracted.actionItems?.map((act, i) => <li key={i}>{act}</li>)}
              </ul>
            </div>

            {docExtracted.suggestedResponse && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Suggested Response Letter Draft</span>
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
                  📋 Copy Draft Response to Clipboard
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
