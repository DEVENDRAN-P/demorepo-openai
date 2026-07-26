import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Tesseract from 'tesseract.js';
import { saveUserBill, logUserActivity, uploadBillDocument, updateUserBill } from '../services/firebaseDataService';
import { createBillReminders } from '../services/reminderService';
import { sendBillUploadReminder } from '../services/emailReminderService';

// Audio and Voice icon
const IconMicrophone = ({ recording }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={recording ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

function BillUpload({ user }) {
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('invoice'); // 'invoice' or 'document'
  
  // Dummy callbacks for logging metrics
  const setExtractionProgress = () => {};
  const setCameraCapturedAt = () => {};
  
  // Invoice Upload States
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  
  // Interactive bounding box hover state
  const [hoveredField, setHoveredField] = useState(null);

  // Document Assistant States (GST Notices/Letters)
  const [docFile, setDocFile] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [docExtracted, setDocExtracted] = useState(null);
  
  // Camera Modal States
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState(null);
  const [modalCapturedBlob, setModalCapturedBlob] = useState(null);
  const [modalCapturedPreview, setModalCapturedPreview] = useState(null);
  
  const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY || '';



  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(uploadedFile.type)) {
        setNotification({ message: 'Please upload a valid image (JPG, PNG, WEBP) or PDF file', type: 'error' });
        return;
      }
      if (uploadedFile.size > 15 * 1024 * 1024) {
        setNotification({ message: 'File size must be less than 15MB', type: 'error' });
        return;
      }

      if (activeTab === 'invoice') {
        setFile(uploadedFile);
        setExtractedData(null);
        setExtractionProgress(0);
        if (uploadedFile.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreview(reader.result);
            setTimeout(() => handleExtract(uploadedFile), 100);
          };
          reader.readAsDataURL(uploadedFile);
        } else {
          setPreview(null);
          setTimeout(() => handleExtract(uploadedFile), 100);
        }
      } else {
        setDocFile(uploadedFile);
        setDocExtracted(null);
        setExtractionProgress(0);
        if (uploadedFile.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setDocPreview(reader.result);
            setTimeout(() => handleDocumentAnalyze(uploadedFile), 100);
          };
          reader.readAsDataURL(uploadedFile);
        } else {
          setDocPreview(null);
          setTimeout(() => handleDocumentAnalyze(uploadedFile), 100);
        }
      }
    }
  };

  // OCR using Tesseract
  const extractTextWithOCR = async (imageFile) => {
    const loadImageForOCR = (src) => new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = (e) => rej(e);
      img.src = src;
    });

    const runTesseract = async (imgOrSrc) => {
      return Tesseract.recognize(
        imgOrSrc,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setExtractionProgress(Math.round(m.progress * 50));
            }
          }
        }
      ).then(({ data: { text } }) => {
        setExtractionProgress(60);
        return text || '';
      });
    };

    try {
      let imgSrc = null;
      let createdObjectURL = null;
      if (typeof imageFile === 'string') {
        imgSrc = imageFile;
      } else if (imageFile instanceof File || imageFile instanceof Blob) {
        createdObjectURL = URL.createObjectURL(imageFile);
        imgSrc = createdObjectURL;
      } else if (imageFile && imageFile.src) {
        imgSrc = imageFile.src;
      } else {
        throw new Error('Unsupported image type for OCR');
      }

      const img = await loadImageForOCR(imgSrc);
      let text = await runTesseract(img);

      if ((!text || text.trim().length < 15) && (createdObjectURL || file?.isCameraCapture)) {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || img.width || 1280;
          c.height = img.naturalHeight || img.height || 720;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, c.width, c.height);
          const imageData = ctx.getImageData(0, 0, c.width, c.height);
          const d = imageData.data;
          for (let i = 0; i < d.length; i += 4) {
            const gray = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11);
            const v = Math.min(255, Math.max(0, (gray - 128) * 1.4 + 128));
            d[i] = d[i + 1] = d[i + 2] = v;
          }
          ctx.putImageData(imageData, 0, 0);
          const canvasImg = new Image();
          canvasImg.src = c.toDataURL('image/png');
          text = await runTesseract(canvasImg);
        } catch (e) {
          // ignore fallback fail
        }
      }

      if (createdObjectURL) URL.revokeObjectURL(createdObjectURL);
      return text;
    } catch (err) {
      throw err;
    }
  };

  // Process Captured File (from Camera)
  const processCapturedFile = async (capturedFile, previewUrl) => {
    try {
      capturedFile.isCameraCapture = true;
      capturedFile.cameraCapturedAt = new Date().toISOString();
      if (currentPreviewUrl && currentPreviewUrl !== previewUrl) {
        try { URL.revokeObjectURL(currentPreviewUrl); } catch (e) { }
      }
      setCurrentPreviewUrl(previewUrl || null);

      if (activeTab === 'invoice') {
        setFile(capturedFile);
        setPreview(previewUrl || null);
        setExtractedData(null);
        setExtractionProgress(0);
        await handleExtract(capturedFile);
      } else {
        setDocFile(capturedFile);
        setDocPreview(previewUrl || null);
        setDocExtracted(null);
        setExtractionProgress(0);
        await handleDocumentAnalyze(capturedFile);
      }
    } catch (err) {
      setNotification({ message: 'Failed to process camera capture', type: 'error' });
    }
  };

  const startCamera = async () => {
    try {
      const constraints = { video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setNotification({ message: 'Unable to access camera. Please allow camera permission or try file upload.', type: 'error' });
      setShowCameraModal(false);
    }
  };

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    } catch (e) { }
  };

  const openCameraModal = async () => {
    setShowCameraModal(true);
    setTimeout(() => startCamera(), 100);
  };

  const closeCameraModal = () => {
    stopCamera();
    setShowCameraModal(false);
  };

  const switchCameraFacing = async () => {
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
    stopCamera();
    setTimeout(() => startCamera(), 150);
  };

  const captureFromCamera = async () => {
    try {
      if (!videoRef.current) return;
      const video = videoRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const contrast = 1.3;
        const brightness = 15;
        data[i] = Math.min(255, Math.max(0, (r - 128) * contrast + 128 + brightness));
        data[i + 1] = Math.min(255, Math.max(0, (g - 128) * contrast + 128 + brightness));
        data[i + 2] = Math.min(255, Math.max(0, (b - 128) * contrast + 128 + brightness));
      }
      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setNotification({ message: 'Capture failed. Try again.', type: 'error' });
          return;
        }
        const fileName = `camera-${Date.now()}.jpg`;
        const fileFromBlob = new File([blob], fileName, { type: blob.type });
        const previewUrl = URL.createObjectURL(blob);
        setCameraCapturedAt(new Date().toISOString());
        try { video.pause(); } catch (e) {}
        setModalCapturedBlob(fileFromBlob);
        setModalCapturedPreview(previewUrl);
      }, 'image/jpeg', 1.0);
    } catch (err) {
      setNotification({ message: 'Capture failed. Please try again.', type: 'error' });
    }
  };

  const acceptCapture = async () => {
    if (!modalCapturedBlob) return;
    const file = modalCapturedBlob;
    const preview = modalCapturedPreview;
    setModalCapturedBlob(null);
    setModalCapturedPreview(null);
    closeCameraModal();
    await processCapturedFile(file, preview);
  };

  const retakeCapture = async () => {
    try { if (modalCapturedPreview) URL.revokeObjectURL(modalCapturedPreview); } catch (e) { }
    setModalCapturedBlob(null);
    setModalCapturedPreview(null);
    setTimeout(() => startCamera(), 150);
  };

  // AI Invoice Intelligence Extractor
  const extractDataWithAI = async (ocrText) => {
    setExtractionProgress(70);
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
              content: `You are an expert Indian GST Invoice Auditor and Compliance AI.
Analyze the raw OCR text and extract detailed fields. Return ONLY a valid JSON object:
{
  "supplierName": "string or 'Unknown'",
  "gstin": "string (15 chars) or '27XXXXX0000X0Z0'",
  "invoiceNumber": "string or 'INV-AUTO'",
  "invoiceDate": "YYYY-MM-DD",
  "amount": number (taxable value),
  "taxPercent": 5|12|18|28,
  "taxAmount": number,
  "totalAmount": number,
  "hsn": "string HSN code or 'N/A'",
  "invoiceType": "Purchase|Sales",
  "expenseType": "Raw Material|Travel|Utilities|Equipment|Services|Office Supplies|Marketing|Others",
  "extractionConfidence": "high|medium|low",
  "taxBreakdown": { "cgst": number, "sgst": number, "igst": number },
  "aiSummary": "1-sentence summary of purchase",
  "complianceIssues": [
    {
      "type": "Missing GSTIN|Wrong GST Percentage|Duplicate Bills|Invalid Tax|Missing HSN|Invoice Mismatch",
      "severity": "Low|Medium|High|Critical",
      "explanation": "Why this is an issue",
      "businessImpact": "Potential loss of ITC or fines",
      "recommendedFix": "How to resolve this"
    }
  ],
  "fraudIndicators": ["Suspicious elements, edited font OCR mismatch, suspicious vendor address etc."],
  "recommendedAction": "e.g., Approve bill & claim ITC ₹XXX or Hold payment."
}`
            },
            {
              role: 'user',
              content: `RAW_OCR_TEXT:\n${ocrText}\n\nReturn JSON only.`
            }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.05,
          max_tokens: 1400,
        }),
      });

      setExtractionProgress(85);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      let jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (!jsonMatch) jsonMatch = content.match(/```([\s\S]*?)```/);
      if (!jsonMatch) jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Missing JSON in AI response');

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      setExtractionProgress(100);
      return JSON.parse(jsonStr);
    } catch (err) {
      throw err;
    }
  };

  // AI Legal Notice / Document Assistant Analyzer
  const analyzeDocumentWithAI = async (ocrText) => {
    setExtractionProgress(70);
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
              content: `You are a world-class Indian Tax Legal expert & Document Assistant.
Analyze this GST notice, letter, statement, or receipt. Return ONLY a valid JSON object:
{
  "documentType": "GST Notice|Tax Demand|Vendor Statement|Receipt|Other",
  "meaning": "Clear summary in 2-3 sentences explaining what this document is about in simple terms.",
  "importantSections": ["List of key clauses or sections referenced"],
  "requiredActions": ["Step-by-step actions required by the user to resolve this"],
  "deadline": "YYYY-MM-DD or 'Immediate' or 'N/A'",
  "riskLevel": "low|medium|high|critical",
  "suggestedReply": "A professionally drafted legal response letter addressed to the GST officer/concerned authority ready for copy-pasting, addressing the concerns raised."
}`
            },
            {
              role: 'user',
              content: `RAW_OCR_TEXT:\n${ocrText}\n\nReturn JSON only.`
            }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 1400,
        }),
      });

      setExtractionProgress(85);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      let jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (!jsonMatch) jsonMatch = content.match(/```([\s\S]*?)```/);
      if (!jsonMatch) jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Missing JSON in AI response');

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      setExtractionProgress(100);
      return JSON.parse(jsonStr);
    } catch (err) {
      throw err;
    }
  };

  const handleExtract = async (targetFile) => {
    const activeFile = targetFile || file;
    if (!activeFile) {
      setNotification({ message: 'Please select a file first', type: 'warning' });
      return;
    }
    setLoading(true);
    setExtractionProgress(0);
    setNotification({ message: 'Reading invoice with OCR...', type: 'info' });

    try {
      const ocrText = await extractTextWithOCR(activeFile);
      if (!ocrText || ocrText.trim().length < 15) {
        throw new Error('Could not extract enough text from image. Please upload a clearer image.');
      }
      setNotification({ message: 'AI is analyzing invoice and compliance parameters...', type: 'info' });
      const extractedInfo = await extractDataWithAI(ocrText);
      
      // Post-process calculations
      extractedInfo.amount = Number(extractedInfo.amount) || 0;
      extractedInfo.taxPercent = Number(extractedInfo.taxPercent) || 18;
      extractedInfo.taxAmount = Number(extractedInfo.taxAmount) || Math.round(extractedInfo.amount * (extractedInfo.taxPercent / 100));
      extractedInfo.totalAmount = Number(extractedInfo.totalAmount) || (extractedInfo.amount + extractedInfo.taxAmount);
      
      setExtractedData(extractedInfo);
      setNotification({ message: 'Invoice analysis completed!', type: 'success' });
    } catch (error) {
      console.error(error);
      setNotification({ message: error.message || 'Extraction failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentAnalyze = async (targetFile) => {
    const activeFile = targetFile || docFile;
    if (!activeFile) {
      setNotification({ message: 'Please select a document file first', type: 'warning' });
      return;
    }
    setLoading(true);
    setExtractionProgress(0);
    setNotification({ message: 'Scanning document with OCR...', type: 'info' });

    try {
      const ocrText = await extractTextWithOCR(activeFile);
      if (!ocrText || ocrText.trim().length < 15) {
        throw new Error('Could not extract text. Please ensure notice is readable.');
      }
      setNotification({ message: 'AI Assistant analyzing notice risk & drafting response...', type: 'info' });
      const analysis = await analyzeDocumentWithAI(ocrText);
      setDocExtracted(analysis);
      setNotification({ message: 'Document analysis and reply draft ready!', type: 'success' });
    } catch (error) {
      console.error(error);
      setNotification({ message: error.message || 'Analysis failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!extractedData) return;
    setLoading(true);

    try {
      const invoiceDateObj = new Date(extractedData.invoiceDate || new Date());
      const gstrDeadlineDate = new Date(invoiceDateObj.getFullYear(), invoiceDateObj.getMonth() + 1, 13);
      const businessId = localStorage.getItem('activeBusinessId') || 'apex_retailers';

      // Save to Firebase
      const firebaseResult = await saveUserBill({
        ...extractedData,
        businessId,
        gstrDeadline: gstrDeadlineDate.toISOString(),
        uploadedAt: new Date().toISOString(),
        filed: false,
        status: extractedData.complianceIssues && extractedData.complianceIssues.length > 0 ? 'pending' : 'approved'
      });

      const billId = firebaseResult.billId;

      if (file && billId) {
        uploadBillDocument(file, billId)
          .then(fileResult => {
            return updateUserBill(billId, {
              storagePath: fileResult.storagePath,
              downloadUrl: fileResult.downloadUrl,
              fileName: fileResult.fileName,
              fileSize: fileResult.size,
              fileType: fileResult.type,
            });
          })
          .catch(e => console.warn('Non-blocking storage error:', e));
      }

      logUserActivity({
        action: "upload_bill",
        details: {
          billId,
          invoiceNumber: extractedData.invoiceNumber,
          amount: extractedData.totalAmount,
          hasFile: !!file,
        },
      }).catch(e => {});

      createBillReminders(user.uid, {
        id: billId,
        invoiceDate: extractedData.invoiceDate || new Date().toISOString(),
        invoiceNumber: extractedData.invoiceNumber || 'N/A',
        taxAmount: extractedData.taxAmount || 0,
      }).catch(e => {});

      sendBillUploadReminder({
        invoiceNumber: extractedData.invoiceNumber || 'N/A',
        supplierName: extractedData.supplierName || 'N/A',
        amount: extractedData.amount || 0,
        taxAmount: extractedData.taxAmount || 0,
        gstrDeadline: gstrDeadlineDate.toISOString(),
      }, user?.email).catch(e => {});

      window.dispatchEvent(new CustomEvent('billUpdated', { detail: { billId } }));
      setNotification({ message: '✅ Bill validated & updated in SaaS database!', type: 'success' });
      setTimeout(() => { window.location.href = '/'; }, 1000);
    } catch (error) {
      console.error(error);
      setNotification({ message: `Failed to confirm bill: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setNotification({ message: 'Voice input not supported in this browser. Please use Chrome.', type: 'warning' });
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'ta' ? 'ta-IN' : 'en-IN';

    recognition.onstart = () => {
      setIsRecording(true);
      setNotification({ message: 'Listening... Tell me invoice details.', type: 'info' });
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(transcript);
      setNotification({ message: 'Voice query received. AI is extracting fields...', type: 'info' });
      setLoading(true);

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
                content: `Extract Indian GST invoice details from voice transcription. Return ONLY a valid JSON:
{
  "supplierName": "vendor name or 'Unknown'",
  "gstin": "15-char GSTIN or '27XXXXX0000X0Z0'",
  "invoiceNumber": "string or 'INV-AUTO'",
  "invoiceDate": "YYYY-MM-DD",
  "amount": number,
  "taxPercent": 5|12|18|28,
  "taxAmount": number,
  "totalAmount": number,
  "hsn": "string HSN or 'N/A'",
  "invoiceType": "Purchase|Sales",
  "expenseType": "Raw Material|Travel|Utilities|Equipment|Services|Others",
  "extractionConfidence": "high|medium|low",
  "taxBreakdown": {"cgst": number, "sgst": number, "igst": number}
}`
              },
              { role: 'user', content: transcript }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            max_tokens: 1000,
          }),
        });
        if (!response.ok) throw new Error('Speech model connection failed');
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setExtractedData(parsed);
          setNotification({ message: 'Voice details extracted successfully!', type: 'success' });
        }
      } catch (e) {
        setNotification({ message: 'Could not resolve voice inputs. Try typing.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {notification && (
        <div className="notification" style={{
          background: notification.type === 'success' ? '#1b5e20' : notification.type === 'error' ? '#5e1b1b' : '#1b4a5e',
          borderLeft: `4px solid ${notification.type === 'success' ? 'var(--success)' : notification.type === 'error' ? 'var(--error)' : 'var(--info)'}`,
          marginBottom: '1rem'
        }}>
          <p className="notification-message" style={{ color: 'white', margin: 0 }}>{notification.message}</p>
        </div>
      )}

      <div>
        <div style={{ margin: '0 auto' }}>
          
          {/* Tab Selection */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <button 
              onClick={() => setActiveTab('invoice')}
              style={{ background: 'transparent', border: 'none', color: activeTab === 'invoice' ? 'var(--theme-secondary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', paddingBottom: '0.5rem', borderBottom: activeTab === 'invoice' ? '3px solid var(--theme-secondary)' : 'none', outline: 'none' }}
            >
              📄 Invoice Intelligence Extractor
            </button>
            <button 
              onClick={() => setActiveTab('document')}
              style={{ background: 'transparent', border: 'none', color: activeTab === 'document' ? 'var(--theme-secondary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', paddingBottom: '0.5rem', borderBottom: activeTab === 'document' ? '3px solid var(--theme-secondary)' : 'none', outline: 'none' }}
            >
              ⚖️ AI Legal Document Assistant
            </button>
          </div>

          {activeTab === 'invoice' ? (
            <div>
              {/* Invoice Tab */}
              <div className="ocr-viewer-container">
                {/* Left Side: Visual Bounding Boxes on Invoice */}
                <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="pulse-dot"></span> Bounding Box Overlay
                  </h3>
                  
                  <div className="ocr-image-wrapper">
                    {preview ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
                        <img src={preview} alt="Invoice preview" className="ocr-image" />
                        
                        {/* Interactive Highlights based on hovered field */}
                        {hoveredField === 'supplierName' && <div className="ocr-field-highlight active" style={{ top: '12%', left: '10%', width: '45%', height: '6%' }}><span className="highlight-tag">Supplier Name</span></div>}
                        {hoveredField === 'gstin' && <div className="ocr-field-highlight active" style={{ top: '19%', left: '10%', width: '38%', height: '5%' }}><span className="highlight-tag">GSTIN ID</span></div>}
                        {hoveredField === 'invoiceNumber' && <div className="ocr-field-highlight active" style={{ top: '12%', left: '60%', width: '30%', height: '5%' }}><span className="highlight-tag">Invoice #</span></div>}
                        {hoveredField === 'invoiceDate' && <div className="ocr-field-highlight active" style={{ top: '18%', left: '60%', width: '30%', height: '5%' }}><span className="highlight-tag">Filing Date</span></div>}
                        {hoveredField === 'amount' && <div className="ocr-field-highlight active" style={{ top: '65%', left: '55%', width: '35%', height: '5%' }}><span className="highlight-tag">Taxable Value</span></div>}
                        {hoveredField === 'taxAmount' && <div className="ocr-field-highlight active" style={{ top: '72%', left: '55%', width: '35%', height: '5%' }}><span className="highlight-tag">CGST + SGST</span></div>}
                        {hoveredField === 'totalAmount' && <div className="ocr-field-highlight active" style={{ top: '80%', left: '55%', width: '35%', height: '6%' }}><span className="highlight-tag">Grand Total</span></div>}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        <span style={{ fontSize: '3rem', display: 'block' }}>📤</span>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>Upload invoice to view bounding boxes</p>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button type="button" onClick={handleVoiceInput} disabled={loading} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'transparent', color: isRecording ? 'var(--error)' : 'inherit' }}>
                      <IconMicrophone recording={isRecording} /> Voice Details
                    </button>
                    <button type="button" onClick={openCameraModal} disabled={loading} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      📸 Camera Scan
                    </button>
                  </div>

                  {voiceTranscript && (
                    <div style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.5rem', borderLeft: '3px solid var(--theme-secondary)' }}>
                      🎙️ Heard: "{voiceTranscript}"
                    </div>
                  )}
                </div>

                {/* Right Side: Form & Analysis */}
                <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Invoice Metadata</h3>
                    {extractedData && <span className="badge badge-success">Confidence: {extractedData.extractionConfidence}</span>}
                  </div>

                  {!extractedData ? (
                    <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '3rem 2rem', textAlign: 'center' }}>
                      <label style={{ cursor: 'pointer', display: 'block' }}>
                        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                        <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}>📄</span>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', display: 'block', marginBottom: '0.5rem' }}>Select Purchase Invoice</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PNG, JPG, WEBP formats supported (Max 15MB)</span>
                      </label>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      
                      <div onMouseEnter={() => setHoveredField('supplierName')} onMouseLeave={() => setHoveredField(null)}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Supplier Name</label>
                        <input type="text" value={extractedData.supplierName} onChange={(e) => setExtractedData({...extractedData, supplierName: e.target.value})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div onMouseEnter={() => setHoveredField('gstin')} onMouseLeave={() => setHoveredField(null)}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Supplier GSTIN</label>
                          <input type="text" value={extractedData.gstin} onChange={(e) => setExtractedData({...extractedData, gstin: e.target.value})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontFamily: 'monospace' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>HSN Code</label>
                          <input type="text" value={extractedData.hsn || 'N/A'} onChange={(e) => setExtractedData({...extractedData, hsn: e.target.value})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div onMouseEnter={() => setHoveredField('invoiceNumber')} onMouseLeave={() => setHoveredField(null)}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Invoice Number</label>
                          <input type="text" value={extractedData.invoiceNumber} onChange={(e) => setExtractedData({...extractedData, invoiceNumber: e.target.value})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }} />
                        </div>
                        <div onMouseEnter={() => setHoveredField('invoiceDate')} onMouseLeave={() => setHoveredField(null)}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Invoice Date</label>
                          <input type="date" value={extractedData.invoiceDate} onChange={(e) => setExtractedData({...extractedData, invoiceDate: e.target.value})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        <div onMouseEnter={() => setHoveredField('amount')} onMouseLeave={() => setHoveredField(null)}>
                          <label style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Taxable Amt (₹)</label>
                          <input type="number" value={extractedData.amount} onChange={(e) => setExtractedData({...extractedData, amount: Number(e.target.value)})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }} />
                        </div>
                        <div onMouseEnter={() => setHoveredField('taxAmount')} onMouseLeave={() => setHoveredField(null)}>
                          <label style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>GST Tax (₹)</label>
                          <input type="number" value={extractedData.taxAmount} onChange={(e) => setExtractedData({...extractedData, taxAmount: Number(e.target.value)})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }} />
                        </div>
                        <div onMouseEnter={() => setHoveredField('totalAmount')} onMouseLeave={() => setHoveredField(null)}>
                          <label style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Total Amount (₹)</label>
                          <input type="number" value={extractedData.totalAmount} onChange={(e) => setExtractedData({...extractedData, totalAmount: Number(e.target.value)})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 700 }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Classification</label>
                          <select value={extractedData.expenseType} onChange={(e) => setExtractedData({...extractedData, expenseType: e.target.value})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                            <option value="Raw Material">Raw Material</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Equipment">Equipment</option>
                            <option value="Services">Services</option>
                            <option value="Office Supplies">Office Supplies</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Travel">Travel</option>
                            <option value="Others">Others</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>GST Rate (%)</label>
                          <select value={extractedData.taxPercent} onChange={(e) => setExtractedData({...extractedData, taxPercent: Number(e.target.value)})} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                            <option value="0">0% Exempt</option>
                            <option value="5">5% GST</option>
                            <option value="12">12% GST</option>
                            <option value="18">18% GST</option>
                            <option value="28">28% GST</option>
                          </select>
                        </div>
                      </div>

                      {/* Audit Details */}
                      {extractedData.complianceIssues && extractedData.complianceIssues.length > 0 && (
                        <div style={{ marginTop: '0.75rem', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--error)', display: 'block', marginBottom: '0.5rem' }}>⚠️ Compliance Issues Detected</span>
                          {extractedData.complianceIssues.map((issue, idx) => (
                            <div key={idx} style={{ fontSize: '0.75rem', marginBottom: '0.5rem', borderBottom: idx < extractedData.complianceIssues.length-1 ? '1px solid rgba(239,68,68,0.1)' : 'none', paddingBottom: '0.25rem' }}>
                              <strong>{issue.type} ({issue.severity})</strong>: {issue.explanation}
                              <div style={{ color: 'var(--text-secondary)', marginTop: '0.125rem' }}>Impact: {issue.businessImpact}</div>
                              <div style={{ color: '#60a5fa', marginTop: '0.125rem' }}>Recommendation: {issue.recommendedFix}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button onClick={() => { setExtractedData(null); setFile(null); setPreview(null); }} className="btn btn-outline" style={{ flex: 1 }}>Reset</button>
                        <button onClick={handleConfirm} disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>Confirm & Sync to SaaS</button>
                      </div>

                    </div>
                  )}

                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Document Assistant Tab */}
              <div className="grid" style={{ gridTemplateColumns: docExtracted ? '1fr 1.2fr' : '1fr', gap: '2rem' }}>
                
                <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⚖️ Document Risk & Audit Panel
                  </h3>
                  
                  {!docExtracted ? (
                    <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '4rem 2rem', textAlign: 'center' }}>
                      <label style={{ cursor: 'pointer', display: 'block' }}>
                        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                        <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>⚖️</span>
                        <span style={{ fontWeight: 700, fontSize: '1.2rem', display: 'block', marginBottom: '0.5rem' }}>Upload GST Notice or Legal Letter</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '1.5rem' }}>Upload notices, letters, or statements for immediate legal analysis & reply draft</span>
                        <span className="btn btn-primary" style={{ display: 'inline-block' }}>Choose Notice Document</span>
                      </label>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {docPreview && (
                        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', background: 'var(--bg-secondary)', padding: '0.5rem' }}>
                          <img src={docPreview} alt="Document preview" style={{ maxHeight: '250px', objectFit: 'contain', maxWidth: '100%' }} />
                        </div>
                      )}
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Uploaded Document Name</span>
                        <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, fontSize: '0.9rem' }}>{docFile.name}</p>
                      </div>
                      <button onClick={() => { setDocExtracted(null); setDocFile(null); setDocPreview(null); }} className="btn btn-outline" style={{ width: '100%' }}>Scan Another Document</button>
                    </div>
                  )}
                </div>

                {docExtracted && (
                  <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>AI Assistant Analysis</span>
                      <span className={`badge-premium ${docExtracted.riskLevel === 'critical' || docExtracted.riskLevel === 'high' ? 'badge-critical' : 'badge-good'}`} style={{ marginLeft: 'auto' }}>
                        Risk: {docExtracted.riskLevel.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      
                      <div>
                        <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Document Category</strong>
                        <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.125rem 0 0 0' }}>{docExtracted.documentType}</p>
                      </div>

                      <div>
                        <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Department Intention / Meaning</strong>
                        <p style={{ fontSize: '0.875rem', lineHeight: '1.6', margin: '0.25rem 0 0 0', color: 'var(--text-primary)' }}>{docExtracted.meaning}</p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Filing Deadline</strong>
                          <p style={{ fontSize: '1rem', fontWeight: 700, margin: '0.125rem 0 0 0', color: docExtracted.deadline !== 'N/A' ? 'var(--error)' : 'inherit' }}>{docExtracted.deadline}</p>
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Target Sections</strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem' }}>
                            {docExtracted.importantSections.map((sec, i) => (
                              <span key={i} style={{ fontSize: '0.7rem', background: 'var(--bg-tertiary)', padding: '0.125rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{sec}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Required Actions</strong>
                        <ul style={{ margin: '0.375rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                          {docExtracted.requiredActions.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Suggested Draft Response Letter</strong>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', marginLeft: 'auto' }}
                            onClick={() => {
                              navigator.clipboard.writeText(docExtracted.suggestedReply);
                              setNotification({ message: 'Reply text copied to clipboard!', type: 'success' });
                            }}
                          >
                            📋 Copy Text
                          </button>
                        </div>
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', height: '220px', overflowY: 'auto', margin: 0 }}>
                          {docExtracted.suggestedReply}
                        </pre>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </div>

      {/* Camera modal for live capture */}
      {showCameraModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: '700px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative', background: 'black', minHeight: '350px' }}>
              {!modalCapturedPreview ? (
                <>
                  <video ref={videoRef} style={{ width: '100%', height: 'auto', display: 'block' }} playsInline muted />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                    <button onClick={switchCameraFacing} className="btn" style={{ background: 'var(--bg-primary)', padding: '0.5rem 1rem' }}>Switch</button>
                    <button onClick={closeCameraModal} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Close</button>
                  </div>
                  <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                    <button onClick={captureFromCamera} style={{ borderRadius: '50%', width: '64px', height: '64px', background: 'red', border: '4px solid white', cursor: 'pointer', outline: 'none' }}></button>
                  </div>
                </>
              ) : (
                <div style={{ position: 'relative' }}>
                  <img src={modalCapturedPreview} alt="Captured preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button onClick={retakeCapture} className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Retake</button>
                    <button onClick={acceptCapture} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Accept & Process</button>
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
