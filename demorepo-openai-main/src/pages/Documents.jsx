import React, { useState } from 'react';
import Tesseract from 'tesseract.js';

function Documents() {
  const [docFile, setDocFile] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [docExtracted, setDocExtracted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

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
    }
  };

  const handleAnalyze = async () => {
    if (!docFile) return;
    setLoading(true);
    setNotification({ message: 'Initializing OCR reading...', type: 'info' });

    try {
      // 1. OCR
      const { data: { text } } = await Tesseract.recognize(docFile, 'eng');
      
      setNotification({ message: 'OCR finished. Consulting tax legal advisor Llama-3.3...', type: 'info' });

      // 2. Groq Notice Analyze
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
              content: `You are an expert Indian Tax Attorney. Analyze this GST notice or document. Return ONLY valid JSON:
{
  "documentType": "GST Notice|Tax Demand|Vendor Letter|Receipt|Statement",
  "meaning": "2-sentence summary explaining this document in plain English.",
  "importantSections": ["List of key sections, clauses, or invoice references mentioned"],
  "requiredActions": ["Step-by-step actions required by the user"],
  "deadline": "YYYY-MM-DD or 'Immediate' or 'N/A'",
  "riskLevel": "low|medium|high|critical",
  "suggestedReply": "A professionally drafted response letter addressed to the tax officer or concerned authority, addressing the issues raised."
}`
            },
            { role: 'user', content: text }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 1200
        })
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content.match(/\{[\s\S]*\}/)[0]);
      setDocExtracted(parsed);
      setNotification({ message: 'Legal document audit complete!', type: 'success' });
    } catch (e) {
      console.error(e);
      setNotification({ message: 'Analysis failed. Verify your Groq connection.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>AI Tax Document Assistant</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Upload official GST letters, demand notices, or vendor statements. AI will extract actions and draft legal replies.
        </p>
      </div>

      {notification && (
        <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--theme-secondary-light)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.825rem' }}>
          {notification.message}
        </div>
      )}

      {/* Main scanner grid */}
      <div className="grid" style={{ gridTemplateColumns: docPreview ? '1fr 1fr' : '1fr', gap: '2rem' }}>
        
        {/* Upload Column */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>Scan Document</h3>
          
          <div style={{ border: '2px dashed var(--border-color)', padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-lg)', background: 'var(--bg-primary)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📄</span>
            <input type="file" onChange={handleDocUpload} accept="image/*,application/pdf" style={{ display: 'block', margin: '0 auto 1rem' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Supported formats: JPG, PNG, PDF (up to 4MB)</span>
          </div>

          {docPreview && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <img src={docPreview} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }} />
              <button onClick={handleAnalyze} disabled={loading} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem' }}>
                {loading ? 'Analyzing legal context...' : '⚡ AI Audit Legal Document'}
              </button>
            </div>
          )}
        </div>

        {/* Results Column */}
        {docExtracted && (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Legal Analysis</h3>
              <span className={`badge-premium ${docExtracted.riskLevel === 'critical' || docExtracted.riskLevel === 'high' ? 'badge-critical' : 'badge-excellent'}`} style={{ fontSize: '0.65rem' }}>
                Risk: {docExtracted.riskLevel}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Summary & Meaning</span>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>{docExtracted.meaning}</p>
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Important References</span>
                <ul style={{ paddingLeft: '1rem', margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {docExtracted.importantSections?.map((sec, i) => <li key={i}>{sec}</li>)}
                </ul>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Deadline</span>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--theme-secondary-light)' }}>{docExtracted.deadline}</p>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Required Actions</span>
              <ul style={{ paddingLeft: '1rem', margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {docExtracted.requiredActions?.map((act, i) => <li key={i}>{act}</li>)}
              </ul>
            </div>

            {docExtracted.suggestedReply && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Suggested reply letter draft</span>
                <textarea 
                  readOnly 
                  value={docExtracted.suggestedReply}
                  style={{ width: '100%', minHeight: '180px', marginTop: '0.5rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.775rem', fontFamily: 'monospace' }}
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(docExtracted.suggestedReply);
                    alert('Draft copied to clipboard!');
                  }}
                  className="btn btn-outline" 
                  style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem' }}
                >
                  📋 Copy Letter to Clipboard
                </button>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}

export default Documents;
