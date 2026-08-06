import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { saveUserBill } from '../services/firebaseDataService';

const IconCamera = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const compressImage = (base64Str, maxWidth = 1024, maxHeight = 1024) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width <= maxWidth && height <= maxHeight) {
        resolve(base64Str);
        return;
      }

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

function BillUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notification, setNotification] = useState(null);

  // Extracted Invoice Metadata State
  const [extractedData, setExtractedData] = useState(null);
  const [hoveredField, setHoveredField] = useState(null);

  // Camera integration states
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const [modalCapturedPreview, setModalCapturedPreview] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || '';

  // File Select Handler
  const handleFileUpload = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
      setExtractedData(null);
      setNotification(null);
    }
  };

  // OCR Text Extraction using Tesseract.js
  const extractTextWithOCR = async (targetFile) => {
    setProgress(15);
    try {
      const result = await Tesseract.recognize(targetFile, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(15 + m.progress * 45)); // Scale progress to 15-60%
          }
        },
      });
      setProgress(60);
      return result.data.text;
    } catch (err) {
      console.error('OCR Error:', err);
      throw new Error('Failed to parse text from image using OCR. Please check image clarity.');
    }
  };

  // Groq Llama 3.3 AI Invoice Details Extractor
  const extractDataWithAI = async (ocrText) => {
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
              content: `You are an expert Indian B2B accountant & tax auditor.
Extract metadata from this Indian B2B invoice. Return ONLY a valid JSON object matching this structure exactly (do not output any markdown wrapper or extra text):
{
  "gstDocumentType": "Tax Invoice | Bill of Supply | Credit Note | Debit Note | E-Way Bill | Delivery Challan | Other",
  "invoiceNumber": "Alpha-numeric invoice reference code",
  "invoiceDate": "YYYY-MM-DD",
  "supplierName": "Full corporate name of the supplier/merchant",
  "gstin": "15-character alphanumeric Indian GSTIN identifier",
  "amount": 0.0,
  "taxPercent": 18,
  "taxAmount": 0.0,
  "totalAmount": 0.0,
  "expenseType": "Raw Material | Utilities | Office Supplies | Services | Others",
  "category": "E.g. Electronics, Inventory, Electricity, Stationary",
  "extractionConfidence": "high | medium | low",
  "taxAnalysis": "Explanation of CGST/SGST local vs IGST interstate split.",
  "riskAnalysis": "Highlight any compliance issues such as mismatch in GSTIN format, suspicious date range, or missing details.",
  "aiSuggestions": ["List of suggestions to optimize input tax credit or improve audit quality"]
}`
            },
            {
              role: 'user',
              content: `OCR_INVOICE_TEXT:\n${ocrText}\n\nReturn JSON only.`
            }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 1200,
        }),
      });

      setProgress(85);
      if (!response.ok) {
        let errDesc = '';
        try {
          const errData = await response.json();
          errDesc = errData.error?.message || JSON.stringify(errData);
        } catch (e) {
          errDesc = response.statusText;
        }
        throw new Error(`Groq API Error ${response.status}: ${errDesc}`);
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from API. This usually happens if the request is blocked by a corporate firewall, a captive network login page, or an active Service Worker from another app on localhost. Please try using an Incognito window or clearing your browser cache and site data.');
      }
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      let jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (!jsonMatch) jsonMatch = content.match(/```([\s\S]*?)```/);
      if (!jsonMatch) jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse AI response.');

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      setProgress(100);
      return JSON.parse(jsonStr);
    } catch (err) {
      throw err;
    }
  };

  // Groq Llama 3.2 Vision AI Details & Bounding Box Extractor
  const extractDataWithVisionAI = async (base64DataUrl) => {
    setProgress(70);
    try {
      // Compress image to ensure it is under the 4MB limit and uploads quickly
      const optimizedBase64 = await compressImage(base64DataUrl);

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
              content: `You are an expert Indian B2B accountant & tax auditor.
Analyze the provided image of a business document (e.g. Tax Invoice, Bill of Supply, Credit/Debit Note, E-Way Bill, Delivery Challan).
Return ONLY a valid JSON object matching this structure exactly (do not output any markdown headers, wrappers or extra text):
{
  "gstDocumentType": "Tax Invoice | Bill of Supply | Credit Note | Debit Note | E-Way Bill | Delivery Challan | Other",
  "invoiceNumber": "Alpha-numeric invoice reference code",
  "invoiceDate": "YYYY-MM-DD",
  "supplierName": "Full corporate name of the supplier/merchant",
  "gstin": "15-character alphanumeric Indian GSTIN identifier",
  "amount": 0.0,
  "taxPercent": 18,
  "taxAmount": 0.0,
  "totalAmount": 0.0,
  "expenseType": "Raw Material | Utilities | Office Supplies | Services | Others",
  "category": "E.g. Electronics, Inventory, Electricity, Stationary",
  "extractionConfidence": "high | medium | low",
  "taxAnalysis": "Explanation of CGST/SGST local vs IGST interstate split.",
  "riskAnalysis": "Highlight any compliance issues such as mismatch in GSTIN format, suspicious date range, or missing details.",
  "aiSuggestions": ["List of suggestions to optimize input tax credit or improve audit quality"],
  "boundingBoxes": {
    "supplierName": { "top": 12, "left": 10, "width": 45, "height": 6 },
    "gstin": { "top": 19, "left": 10, "width": 38, "height": 5 },
    "invoiceNumber": { "top": 12, "left": 60, "width": 30, "height": 5 },
    "invoiceDate": { "top": 18, "left": 60, "width": 30, "height": 5 },
    "amount": { "top": 65, "left": 55, "width": 35, "height": 5 },
    "taxAmount": { "top": 72, "left": 55, "width": 35, "height": 5 },
    "totalAmount": { "top": 80, "left": 55, "width": 35, "height": 6 }
  }
}

You must detect where the fields are on the page. In 'boundingBoxes', output integer percentage values (0-100) representing where each key text field resides on the page image.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract the GST details and return estimated bounding box coordinates for overlay highlight markers.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: optimizedBase64
                  }
                }
              ]
            }
          ],
          model: 'llama-3.2-11b-vision-preview',
          temperature: 0.1,
          max_tokens: 1400,
        }),
      });

      setProgress(85);
      if (!response.ok) {
        let errDesc = '';
        try {
          const errData = await response.json();
          errDesc = errData.error?.message || JSON.stringify(errData);
        } catch (e) {
          errDesc = response.statusText;
        }
        throw new Error(`Groq Vision API Error ${response.status}: ${errDesc}`);
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from API. This usually happens if the request is blocked by a corporate firewall, a captive network login page, or an active Service Worker from another app on localhost. Please try using an Incognito window or clearing your browser cache and site data.');
      }
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      let jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (!jsonMatch) jsonMatch = content.match(/```([\s\S]*?)```/);
      if (!jsonMatch) jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse Vision AI response.');

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      setProgress(100);
      return JSON.parse(jsonStr);
    } catch (err) {
      throw err;
    }
  };

  // Run Extraction Trigger
  const handleExtract = async () => {
    if (!file) {
      setNotification({ message: 'Please select an invoice file first', type: 'warning' });
      return;
    }
    setLoading(true);
    setProgress(0);

    try {
      let extractedInfo = null;
      const isImage = file.type?.startsWith('image/') || file.name?.endsWith('.png') || file.name?.endsWith('.jpg') || file.name?.endsWith('.jpeg');

      if (isImage && preview) {
        setNotification({ message: 'Analyzing document layout via Vision AI...', type: 'info' });
        try {
          extractedInfo = await extractDataWithVisionAI(preview);
        } catch (visionErr) {
          console.warn('Vision OCR failed. Falling back to local Tesseract OCR + LLM:', visionErr);
        }
      }

      if (!extractedInfo) {
        setNotification({ message: 'Processing document with Tesseract OCR...', type: 'info' });
        const ocrText = await extractTextWithOCR(file);
        if (!ocrText || ocrText.trim().length < 15) {
          throw new Error('OCR returned insufficient text. Please ensure the document is clear.');
        }
        setNotification({ message: 'AI is analyzing invoice and compliance parameters...', type: 'info' });
        extractedInfo = await extractDataWithAI(ocrText);
      }
      
      // Compute breakdowns & ensure numeric validity
      extractedInfo.amount = Number(extractedInfo.amount) || 0;
      extractedInfo.taxPercent = Number(extractedInfo.taxPercent) || 18;
      extractedInfo.taxAmount = Number(extractedInfo.taxAmount) || Math.round(extractedInfo.amount * (extractedInfo.taxPercent / 100));
      extractedInfo.totalAmount = Number(extractedInfo.totalAmount) || (extractedInfo.amount + extractedInfo.taxAmount);
      
      // Fallback bounding boxes if missing
      if (!extractedInfo.boundingBoxes) {
        extractedInfo.boundingBoxes = {
          supplierName: { top: 12, left: 10, width: 45, height: 6 },
          gstin: { top: 19, left: 10, width: 38, height: 5 },
          invoiceNumber: { top: 12, left: 60, width: 30, height: 5 },
          invoiceDate: { top: 18, left: 60, width: 30, height: 5 },
          amount: { top: 65, left: 55, width: 35, height: 5 },
          taxAmount: { top: 72, left: 55, width: 35, height: 5 },
          totalAmount: { top: 80, left: 55, width: 35, height: 6 }
        };
      }

      extractedInfo.taxBreakdown = {
        cgst: Math.round(extractedInfo.taxAmount / 2),
        sgst: Math.round(extractedInfo.taxAmount / 2),
        igst: 0
      };

      setExtractedData(extractedInfo);
      setNotification({ message: 'Document analysis completed successfully!', type: 'success' });
    } catch (error) {
      console.error(error);
      setNotification({ message: error.message || 'Invoice extraction failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Save to Firebase Handler
  const handleConfirm = async () => {
    if (!extractedData) return;
    setLoading(true);

    try {
      const invoiceDateObj = new Date(extractedData.invoiceDate || new Date());
      const gstrDeadlineDate = new Date(invoiceDateObj.getFullYear(), invoiceDateObj.getMonth() + 1, 13);
      const businessId = localStorage.getItem('activeBusinessId') || 'apex_retailers';

      // Save to Firebase Firestore
      await saveUserBill({
        ...extractedData,
        businessId,
        gstrDeadline: gstrDeadlineDate.toISOString().split('T')[0],
        gstrForm: 'GSTR-1',
        filed: false,
        status: 'approved'
      });

      setNotification({ message: 'Invoice synced to Firebase successfully!', type: 'success' });
      setExtractedData(null);
      setFile(null);
      setPreview(null);
    } catch (err) {
      console.error('Error saving to Firebase:', err);
      setNotification({ message: 'Error syncing data to Firebase. Try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Camera capture methods
  const openCamera = async () => {
    setShowCameraModal(true);
    setModalCapturedPreview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacingMode }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      alert('Could not access camera. Make sure permissions are granted.');
      setShowCameraModal(false);
    }
  };

  const closeCameraModal = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setShowCameraModal(false);
  };

  const captureFromCamera = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setModalCapturedPreview(dataUrl);
      }
    }
  };

  const acceptCapture = () => {
    if (modalCapturedPreview) {
      setPreview(modalCapturedPreview);
      // Convert base64 dataUrl to blob/file
      fetch(modalCapturedPreview)
        .then(res => res.blob())
        .then(blob => {
          const capturedFile = new File([blob], 'captured_invoice.jpg', { type: 'image/jpeg' });
          setFile(capturedFile);
        });
      closeCameraModal();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Invoice Intelligence</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Upload merchant invoices. AI Accountant automatically extracts metadata, validates GSTIN integrity, and runs tax audit risk analysis.
        </p>
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

      {/* Main scanner view */}
      <div className="ocr-viewer-container" style={{ display: 'grid', gridTemplateColumns: preview ? '1.1fr 0.9fr' : '1fr', gap: '2rem' }}>
        
        {/* Left Side: Invoice Preview & Highlights */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="pulse-dot"></span> Bounding Box Overlay
          </h3>
          
          <div className="ocr-image-wrapper" style={{ minHeight: '300px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', background: 'var(--bg-secondary)' }}>
            {preview ? (
              <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                <img src={preview} alt="Invoice preview" style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }} />
                
                {/* Dynamic Highlights based on hovered field */}
                {hoveredField && extractedData?.boundingBoxes?.[hoveredField] && (
                  <div style={{
                    position: 'absolute',
                    border: hoveredField === 'gstin' ? '2px solid #10b981' : hoveredField === 'totalAmount' ? '2px solid #14b8a6' : '2px solid #ef4444',
                    background: hoveredField === 'gstin' ? 'rgba(16, 185, 129, 0.15)' : hoveredField === 'totalAmount' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    zIndex: 10,
                    pointerEvents: 'none',
                    top: `${extractedData.boundingBoxes[hoveredField].top}%`,
                    left: `${extractedData.boundingBoxes[hoveredField].left}%`,
                    width: `${extractedData.boundingBoxes[hoveredField].width}%`,
                    height: `${extractedData.boundingBoxes[hoveredField].height}%`
                  }}></div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🧾</span>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>No Invoice Uploaded</p>
                <p style={{ margin: '0.25rem 0 1.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Upload an invoice receipt or capture via camera to analyze metadata.</p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <label className="btn btn-primary" style={{ display: 'inline-block', cursor: 'pointer', fontSize: '0.8rem' }}>
                    <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
                    Upload Invoice
                  </label>
                  <button onClick={openCamera} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem' }}>
                    <IconCamera /> Capture
                  </button>
                </div>
              </div>
            )}
          </div>

          {preview && !extractedData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              {loading && (
                <div style={{ width: '100%', background: 'var(--bg-tertiary)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, background: 'var(--theme-secondary)', height: '100%', transition: 'width 0.3s ease' }}></div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => { setFile(null); setPreview(null); }} className="btn btn-outline" style={{ flex: 1 }}>Clear</button>
                <button onClick={handleExtract} disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
                  {loading ? `Extracting... (${progress}%)` : '⚡ Run AI Extraction'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Extraction Form & AI Insights */}
        {preview && (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              AI Accountant Vetting Panel
            </h3>

            {loading && !extractedData ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 1.5rem', gap: '1rem' }}>
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></div>
                <strong style={{ fontSize: '0.9rem' }}>OCR Scanning & AI Vetting Active...</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Extracting lines, computing Indian SGST/CGST rules.</span>
              </div>
            ) : extractedData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>CONFIDENCE INDEX</span>
                  <span style={{ 
                    fontSize: '0.675rem', 
                    padding: '0.15rem 0.5rem', 
                    borderRadius: '4px', 
                    fontWeight: 700,
                    background: extractedData.extractionConfidence === 'high' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: extractedData.extractionConfidence === 'high' ? 'var(--success)' : 'var(--warning)',
                    textTransform: 'uppercase'
                  }}>
                    ● {extractedData.extractionConfidence} Confidence
                  </span>
                </div>

                {/* Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                  <div className="grid grid-cols-2" style={{ gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Document Type</label>
                      <input 
                        type="text" 
                        value={extractedData.gstDocumentType || 'Tax Invoice'} 
                        onChange={(e) => setExtractedData({ ...extractedData, gstDocumentType: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontWeight: 600 }}
                        readOnly
                      />
                    </div>
                    <div onMouseEnter={() => setHoveredField('supplierName')} onMouseLeave={() => setHoveredField(null)}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Supplier Name</label>
                      <input 
                        type="text" 
                        value={extractedData.supplierName} 
                        onChange={(e) => setExtractedData({ ...extractedData, supplierName: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2" style={{ gap: '0.75rem' }}>
                    <div onMouseEnter={() => setHoveredField('gstin')} onMouseLeave={() => setHoveredField(null)}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Supplier GSTIN</label>
                      <input 
                        type="text" 
                        value={extractedData.gstin} 
                        onChange={(e) => setExtractedData({ ...extractedData, gstin: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                      />
                    </div>
                    <div onMouseEnter={() => setHoveredField('invoiceNumber')} onMouseLeave={() => setHoveredField(null)}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Invoice Number</label>
                      <input 
                        type="text" 
                        value={extractedData.invoiceNumber} 
                        onChange={(e) => setExtractedData({ ...extractedData, invoiceNumber: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2" style={{ gap: '0.75rem' }}>
                    <div onMouseEnter={() => setHoveredField('invoiceDate')} onMouseLeave={() => setHoveredField(null)}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Invoice Date</label>
                      <input 
                        type="text" 
                        value={extractedData.invoiceDate} 
                        onChange={(e) => setExtractedData({ ...extractedData, invoiceDate: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Classification</label>
                      <select 
                        value={extractedData.expenseType} 
                        onChange={(e) => setExtractedData({ ...extractedData, expenseType: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="Raw Material">Raw Material</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Office Supplies">Office Supplies</option>
                        <option value="Services">Services</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3" style={{ gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                    <div onMouseEnter={() => setHoveredField('amount')} onMouseLeave={() => setHoveredField(null)}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Taxable Val</label>
                      <input 
                        type="number" 
                        value={extractedData.amount} 
                        onChange={(e) => {
                          const amt = Number(e.target.value) || 0;
                          const tax = Math.round(amt * (extractedData.taxPercent / 100));
                          setExtractedData({ ...extractedData, amount: amt, taxAmount: tax, totalAmount: amt + tax });
                        }}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontWeight: 600 }}
                      />
                    </div>
                    <div onMouseEnter={() => setHoveredField('taxAmount')} onMouseLeave={() => setHoveredField(null)}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>GST Tax</label>
                      <input 
                        type="number" 
                        value={extractedData.taxAmount} 
                        onChange={(e) => {
                          const tax = Number(e.target.value) || 0;
                          setExtractedData({ ...extractedData, taxAmount: tax, totalAmount: extractedData.amount + tax });
                        }}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontWeight: 600 }}
                      />
                    </div>
                    <div onMouseEnter={() => setHoveredField('totalAmount')} onMouseLeave={() => setHoveredField(null)}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Grand Total</label>
                      <input 
                        type="number" 
                        value={extractedData.totalAmount} 
                        onChange={(e) => setExtractedData({ ...extractedData, totalAmount: Number(e.target.value) || 0 })}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--theme-secondary-light)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontWeight: 800 }}
                      />
                    </div>
                  </div>

                </div>

                {/* AI Auditing Analysis */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                  
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Tax Split analysis</span>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{extractedData.taxAnalysis}</p>
                  </div>

                  {extractedData.riskAnalysis && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '3px solid var(--error)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--error)', fontWeight: 700, textTransform: 'uppercase' }}>Audit Risk Indicator</span>
                      <p style={{ margin: '0.15rem 0 0 0', color: 'var(--text-primary)', lineHeight: '1.4' }}>{extractedData.riskAnalysis}</p>
                    </div>
                  )}

                  {extractedData.aiSuggestions && extractedData.aiSuggestions.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>AI Audit Suggestions</span>
                      <ul style={{ paddingLeft: '1.1rem', margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {extractedData.aiSuggestions.map((sug, i) => (
                          <li key={i}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button 
                    onClick={() => { setExtractedData(null); setFile(null); setPreview(null); }} 
                    className="btn btn-outline" 
                    style={{ flex: 1, padding: '0.5rem' }}
                  >
                    Reset
                  </button>
                  <button 
                    onClick={handleConfirm} 
                    disabled={loading} 
                    className="btn btn-primary" 
                    style={{ flex: 2, padding: '0.5rem' }}
                  >
                    Confirm & Sync to Firebase
                  </button>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 1.5rem' }}>
                Run OCR and AI Extraction on the uploaded invoice to review details here.
              </div>
            )}
          </div>
        )}

      </div>

      {/* Camera Capture Modal */}
      {showCameraModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: '640px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border-color)', margin: '1rem' }}>
            <div style={{ position: 'relative', background: 'black', minHeight: '320px' }}>
              {!modalCapturedPreview ? (
                <>
                  <video ref={videoRef} style={{ width: '100%', height: 'auto', display: 'block' }} playsInline muted />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                    <button onClick={() => setCameraFacingMode(prev => prev === 'environment' ? 'user' : 'environment')} className="btn" style={{ background: 'var(--bg-primary)', padding: '0.45rem 0.85rem', fontSize: '0.75rem' }}>Switch</button>
                    <button onClick={closeCameraModal} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem' }}>Close</button>
                  </div>
                  <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                    <button onClick={captureFromCamera} style={{ borderRadius: '50%', width: '56px', height: '56px', background: 'red', border: '4px solid white', cursor: 'pointer', outline: 'none' }}></button>
                  </div>
                </>
              ) : (
                <div style={{ position: 'relative' }}>
                  <img src={modalCapturedPreview} alt="Captured preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button onClick={() => setModalCapturedPreview(null)} className="btn btn-secondary" style={{ padding: '0.45rem 1.25rem', fontSize: '0.8rem' }}>Retake</button>
                    <button onClick={acceptCapture} className="btn btn-primary" style={{ padding: '0.45rem 1.25rem', fontSize: '0.8rem' }}>Accept Invoice</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default BillUpload;
