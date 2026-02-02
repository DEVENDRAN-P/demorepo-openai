import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import Tesseract from 'tesseract.js';

// Add voice icon
const IconMicrophone = ({ recording }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={recording ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

function BillUpload({ user, setUser }) {
  const { t, i18n } = useTranslation(); // Add i18n here
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const cameraInputRef = useRef(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [cameraCapturedAt, setCameraCapturedAt] = useState(null);
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
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(uploadedFile.type)) {
        setNotification({ message: 'Please upload a valid image (JPG, PNG, WEBP) or PDF file', type: 'error' });
        return;
      }

      // Validate file size (max 10MB)
      if (uploadedFile.size > 10 * 1024 * 1024) {
        setNotification({ message: 'File size must be less than 10MB', type: 'error' });
        return;
      }

      setFile(uploadedFile);
      setExtractedData(null);
      setExtractionProgress(0);

      // Create preview for images
      if (uploadedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
          // Auto-trigger extraction after preview is ready
          setTimeout(() => handleExtract(uploadedFile), 100);
        };
        reader.readAsDataURL(uploadedFile);
      } else {
        setPreview(null);
        // For non-image files, trigger extraction directly
        setTimeout(() => handleExtract(uploadedFile), 100);
      }
    }
  };

  const extractTextWithOCR = async (imageFile) => {
    // Normalize input: accept File/Blob/objectURL/string
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
              setExtractionProgress(Math.round(m.progress * 50)); // OCR is 50% of progress
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

      // Load image element first to ensure correct rendering in Tesseract
      const img = await loadImageForOCR(imgSrc);

      // First pass
      let text = await runTesseract(img);

      // If result seems too short and source was camera, try a second pass with a temporary canvas (grayscale/threshold)
      if ((!text || text.trim().length < 15) && (createdObjectURL || file?.isCameraCapture)) {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || img.width || 1280;
          c.height = img.naturalHeight || img.height || 720;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, c.width, c.height);
          const imageData = ctx.getImageData(0, 0, c.width, c.height);
          const d = imageData.data;
          // simple grayscale + increase contrast
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
          // Fallback already attempted
        }
      }

      if (createdObjectURL) URL.revokeObjectURL(createdObjectURL);
      return text;
    } catch (err) {
      throw err;
    }
  };

  // Process a captured File (from camera) or normal file immediately
  const processCapturedFile = async (capturedFile, previewUrl) => {
    try {
      // mark metadata
      try {
        capturedFile.isCameraCapture = true;
        capturedFile.cameraCapturedAt = new Date().toISOString();
      } catch (e) {
        // ignore
      }

      // Revoke previous preview URL if set
      if (currentPreviewUrl && currentPreviewUrl !== previewUrl) {
        try { URL.revokeObjectURL(currentPreviewUrl); } catch (e) { }
      }
      setCurrentPreviewUrl(previewUrl || null);

      setFile(capturedFile);
      setPreview(previewUrl || null);
      setExtractedData(null);
      setExtractionProgress(0);

      // Auto-trigger extraction
      await handleExtract(capturedFile);
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
        try { videoRef.current.pause(); videoRef.current.srcObject = null; } catch (e) { }
      }
    } catch (e) {
      // ignore
    }
  };

  const openCameraModal = async () => {
    setShowCameraModal(true);
    // small delay to allow modal to render
    setTimeout(() => startCamera(), 100);
  };

  const closeCameraModal = () => {
    stopCamera();
    setShowCameraModal(false);
  };

  const switchCameraFacing = async () => {
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
    // restart camera with new facing mode
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

      // Apply image enhancement for better OCR on camera photos
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Increase contrast (1.3x) and brightness (+15) for better text clarity
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

      // Convert to blob with maximum quality
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setNotification({ message: 'Capture failed. Try again.', type: 'error' });
          return;
        }
        const fileName = `camera-${Date.now()}.jpg`;
        const fileFromBlob = new File([blob], fileName, { type: blob.type });
        const previewUrl = URL.createObjectURL(blob);
        setCameraCapturedAt(new Date().toISOString());
        // Instead of auto-closing and processing, show confirm/retake UI in the modal
        // Pause the live video so user can confirm
        try { if (videoRef.current) { videoRef.current.pause(); } } catch (e) { }
        setModalCapturedBlob(fileFromBlob);
        setModalCapturedPreview(previewUrl);
        // do NOT call processCapturedFile here; wait for user to Accept
      }, 'image/jpeg', 1.0);
    } catch (err) {
      setNotification({ message: 'Capture failed. Please try again.', type: 'error' });
    }
  };

  const acceptCapture = async () => {
    if (!modalCapturedBlob) return;
    const file = modalCapturedBlob;
    const preview = modalCapturedPreview;
    // clear modal state and close camera modal
    setModalCapturedBlob(null);
    setModalCapturedPreview(null);
    closeCameraModal();
    // process the captured file (this will set preview and auto-run extraction)
    await processCapturedFile(file, preview);
  };

  const retakeCapture = async () => {
    // revoke preview
    try { if (modalCapturedPreview) URL.revokeObjectURL(modalCapturedPreview); } catch (e) { }
    setModalCapturedBlob(null);
    setModalCapturedPreview(null);
    // restart camera
    setTimeout(() => startCamera(), 150);
  };


  // NEW: lightweight local pattern extraction before AI
  const preParseTaxFromOCR = (text) => {
    const cleaned = text.replace(/[,₹]/g, ' ').replace(/\s+/g, ' ');
    const num = v => parseFloat(v.replace(/[^\d.]/g, '')) || 0;

    const findOne = (patterns) => {
      for (const p of patterns) {
        const m = cleaned.match(p);
        if (m) return num(m[1]);
      }
      return 0;
    };

    const taxable = findOne([
      /(?:subtotal|taxable value|taxable amount|base amount|value before tax)\D+(\d+[\d.]*)/i
    ]);
    const total = findOne([
      /(?:grand total|total amount|net amount|amount payable|final amount)\D+(\d+[\d.]*)/i
    ]);

    const cgst = findOne([/(?:cgst)\D+(\d+[\d.]*)/i]);
    const sgst = findOne([/(?:sgst)\D+(\d+[\d.]*)/i]);
    const igst = findOne([/(?:igst)\D+(\d+[\d.]*)/i]);

    // GST percent explicit
    const gstPercentMatch = cleaned.match(/gst\s*@\s*(\d{1,2})\s*%/i);
    const explicitPercent = gstPercentMatch ? parseInt(gstPercentMatch[1], 10) : 0;

    let taxAmount = 0;
    if (cgst && sgst) taxAmount = cgst + sgst;
    else if (igst) taxAmount = igst;
    else if (total && taxable && total > taxable) taxAmount = total - taxable;

    let inferredPercent = 0;
    if (taxable > 0 && taxAmount > 0) {
      inferredPercent = Math.round((taxAmount / taxable) * 100);
    }
    const validRates = [5, 12, 18, 28];
    const snap = (r) => {
      if (!r) return 0;
      return validRates.reduce((p, c) =>
        Math.abs(c - r) < Math.abs(p - r) ? c : p
      );
    };

    const finalPercent = explicitPercent
      ? snap(explicitPercent)
      : snap(inferredPercent);

    return {
      taxable,
      total,
      cgst,
      sgst,
      igst,
      taxAmount,
      gstPercent: finalPercent,
      rawPercent: explicitPercent || inferredPercent
    };
  };

  const extractDataWithAI = async (ocrText) => {
    setExtractionProgress(70);
    // Pre-parse locally first
    const preParsed = preParseTaxFromOCR(ocrText);
    const hintsJSON = JSON.stringify(preParsed);

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
              content: `You are an expert Indian GST invoice extraction AI trained to handle camera-captured invoices with varied quality.
You receive:
1) RAW_OCR_TEXT (may be noisy or partial from camera capture)
2) LOCAL_HINTS (a preliminary numeric guess object)

EXTRACTION RULES:
- Use LOCAL_HINTS as a strong starting point. If hints provide non-zero amount/taxPercent, prefer those over guessing.
- Search for any visible numbers that could be: subtotal, total, amount, CGST, SGST, IGST.
- VALID GST RATES: 5, 12, 18, 28. Snap to nearest if unsure.
- If you find any plausible numeric amount >= 100, use it as 'amount' (not zero).
- If you can't find an explicit total, compute it: total = amount + tax.
- Handle OCR noise: "2000" might appear as "2000", "200O", "20OO", etc. Try to parse variants.

OUTPUT: Return ONLY valid JSON (no markdown, no explanation):
{
  "supplierName": "string or 'Unknown'",
  "gstin": "string (15 chars) or '27XXXXX0000X0Z0'",
  "invoiceNumber": "string or 'INV-AUTO'",
  "invoiceDate": "YYYY-MM-DD or today's date",
  "amount": <number, preferably from LOCAL_HINTS or OCR. Min 100 if guessing>,
  "taxPercent": <5, 12, 18, or 28. Prefer explicit or LOCAL_HINTS>,
  "taxAmount": <calculated or from OCR>,
  "totalAmount": <amount + taxAmount or explicit total>,
  "expenseType": "Raw Material|Travel|Utilities|Equipment|Services|Others (default: Others)",
  "extractionConfidence": "high|medium|low",
  "taxBreakdown": { "cgst": number|null, "sgst": number|null, "igst": number|null }
}`
            },
            {
              role: 'user',
              content: `RAW_OCR_TEXT:\n${ocrText}\n\nLOCAL_HINTS:\n${hintsJSON}\n\nReturn final JSON only.`
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
      const extracted = JSON.parse(jsonStr);
      setExtractionProgress(100);
      return extracted;
    } catch (err) {
      throw err;
    }
  };

  const processExtractedData = (data) => {
    const snapRate = (r) => {
      const valid = [5, 12, 18, 28];
      if (!r || r <= 0) return 0;
      const nearest = valid.reduce((p, c) =>
        Math.abs(c - r) < Math.abs(p - r) ? c : p
      );
      return Math.abs(nearest - r) <= 3 ? nearest : nearest;
    };

    // Compute a tax percent from available data when AI didn't return an explicit rate.
    const computePercent = (r, src) => {
      // If explicit value present, snap it
      if (r && r > 0) return snapRate(r);

      // Try breakdown (cgst+sgst or igst)
      const breakdown = src?.taxBreakdown || {};
      const bdSum = (Number(breakdown.cgst) || 0) + (Number(breakdown.sgst) || 0) + (Number(breakdown.igst) || 0);
      if (bdSum > 0 && Number(src?.amount) > 0) {
        const inferred = Math.round((bdSum / Number(src.amount)) * 100);
        const snapped = snapRate(inferred);
        if (snapped > 0) return snapped;
      }

      // Try taxAmount and amount
      if (Number(src?.taxAmount) > 0 && Number(src?.amount) > 0) {
        const inferred = Math.round((Number(src.taxAmount) / Number(src.amount)) * 100);
        const snapped = snapRate(inferred);
        if (snapped > 0) return snapped;
      }

      // Try totalAmount and amount
      if (Number(src?.totalAmount) > 0 && Number(src?.amount) > 0) {
        const inferred = Math.round(((Number(src.totalAmount) / Number(src.amount)) - 1) * 100);
        const snapped = snapRate(inferred);
        if (snapped > 0) return snapped;
      }

      // As a last resort, if AI provided a rawPercent field, snap it
      if (src?.rawPercent) {
        const snapped = snapRate(Number(src.rawPercent));
        if (snapped > 0) return snapped;
      }

      // Unknown
      return 0;
    };

    let clean = {
      supplierName: (data.supplierName || 'Unknown Supplier').trim(),
      gstin: (data.gstin || '27XXXXX0000X0Z0').trim().substring(0, 15),
      invoiceNumber: (data.invoiceNumber || `INV-${Date.now()}`).trim(),
      invoiceDate: data.invoiceDate || new Date().toISOString().split('T')[0],
      amount: Number(data.amount) || 0,
      taxPercent: computePercent(Number(data.taxPercent) || 0, data),
      taxAmount: Number(data.taxAmount) || 0,
      totalAmount: Number(data.totalAmount) || 0,
      expenseType: data.expenseType || 'Others',
      taxBreakdown: {
        cgst: data?.taxBreakdown?.cgst != null ? Number(data.taxBreakdown.cgst) : null,
        sgst: data?.taxBreakdown?.sgst != null ? Number(data.taxBreakdown.sgst) : null,
        igst: data?.taxBreakdown?.igst != null ? Number(data.taxBreakdown.igst) : null,
      },
      extractionConfidence: data.extractionConfidence || 'medium'
    };

    // Reconciliation paths
    const recomputeFromPercent = () => {
      if (clean.amount > 0) {
        clean.taxAmount = Math.round(clean.amount * (clean.taxPercent / 100));
        clean.totalAmount = clean.amount + clean.taxAmount;
      }
    };

    const recomputeFromTotals = () => {
      if (clean.totalAmount > 0 && clean.amount > 0 && clean.taxAmount === 0) {
        clean.taxAmount = clean.totalAmount - clean.amount;
        clean.taxPercent = snapRate(Math.round((clean.taxAmount / clean.amount) * 100));
        clean.totalAmount = clean.amount + clean.taxAmount;
      }
    };

    const backwardFromTotalAndPercent = () => {
      if (clean.totalAmount > 0 && clean.amount === 0) {
        clean.amount = Math.round(clean.totalAmount / (1 + clean.taxPercent / 100));
        clean.taxAmount = clean.totalAmount - clean.amount;
      }
    };

    if (clean.amount > 0 && clean.taxAmount === 0) recomputeFromPercent();
    else if (clean.amount > 0 && clean.taxAmount > 0 && clean.totalAmount === 0)
      clean.totalAmount = clean.amount + clean.taxAmount;
    else if (clean.totalAmount > 0 && clean.amount > 0) recomputeFromTotals();
    else if (clean.totalAmount > 0 && clean.amount === 0) backwardFromTotalAndPercent();

    // If breakdown exists but taxAmount mismatch, fix
    const breakdownSum =
      (clean.taxBreakdown.cgst || 0) +
      (clean.taxBreakdown.sgst || 0) +
      (clean.taxBreakdown.igst || 0);
    if (breakdownSum > 0 && Math.abs(breakdownSum - clean.taxAmount) > 2) {
      clean.taxAmount = breakdownSum;
      clean.totalAmount = clean.amount + clean.taxAmount;
      clean.taxPercent = snapRate(Math.round((clean.taxAmount / clean.amount) * 100));
    }

    // Final sanity
    if (clean.amount > 0 && clean.totalAmount === 0)
      clean.totalAmount = clean.amount + clean.taxAmount;
    if (clean.amount === 0 && clean.totalAmount > 0) {
      clean.amount = Math.max(clean.totalAmount - clean.taxAmount, 0);
    }

    // Confidence downgrade if math off
    const delta = Math.abs((clean.amount + clean.taxAmount) - clean.totalAmount);
    if (delta > 10) clean.extractionConfidence = 'low';
    else if (delta > 4 && clean.extractionConfidence === 'high') clean.extractionConfidence = 'medium';

    // Allow extraction with graceful degradation if values are missing (e.g., on low-quality camera photos)
    if (clean.amount <= 0 && clean.totalAmount <= 0) {
      // Both missing: do NOT invent amounts. Leave fields zero and mark low confidence.
      clean.extractionConfidence = 'low';
      // Notify user to correct values manually. Do not overwrite with arbitrary defaults.
      setNotification({ message: 'Could not confidently extract monetary values. Please verify and enter amounts manually.', type: 'warning' });
    } else if (clean.amount <= 0 && clean.totalAmount > 0) {
      // Only total found: derive amount conservatively if taxPercent available
      if (clean.taxPercent > 0) {
        clean.amount = Math.round(clean.totalAmount / (1 + clean.taxPercent / 100));
        clean.taxAmount = clean.totalAmount - clean.amount;
        clean.extractionConfidence = 'low';
      } else {
        clean.extractionConfidence = 'low';
      }
    } else if (clean.amount > 0 && clean.totalAmount <= 0) {
      // Only amount found: compute total if taxPercent present
      if (clean.taxPercent > 0) {
        clean.taxAmount = Math.round(clean.amount * (clean.taxPercent / 100));
        clean.totalAmount = clean.amount + clean.taxAmount;
        clean.extractionConfidence = 'medium';
      } else {
        clean.extractionConfidence = 'low';
      }
    }

    setExtractedData(clean);
    setLoading(false);
    setExtractionProgress(100);
    // If notification already set above, avoid overwriting; otherwise show a success/low-confidence message
    if (!notification || notification.type !== 'warning') {
      setNotification({
        message: `GST @ ${clean.taxPercent}% • Tax ₹${clean.taxAmount.toLocaleString()} • Confidence: ${clean.extractionConfidence}`,
        type: clean.extractionConfidence === 'low' ? 'warning' : 'success'
      });
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
      let ocrText = '';

      if (activeFile.type.startsWith('image/')) {
        // Step 1: OCR extraction
        setNotification({ message: 'Scanning image with OCR...', type: 'info' });
        ocrText = await extractTextWithOCR(activeFile);

        // Allow shorter OCR text for camera photos (min 10 chars instead of 20)
        const minOCRLength = file?.isCameraCapture ? 10 : 20;
        if (!ocrText || ocrText.trim().length < minOCRLength) {
          throw new Error('Could not extract enough text from image. Please upload a clearer image or try again.');
        }

        // Step 2: AI parsing
        setNotification({ message: 'AI is analyzing invoice data...', type: 'info' });
        const extractedInfo = await extractDataWithAI(ocrText);

        processExtractedData(extractedInfo);
      } else if (activeFile.type === 'application/pdf') {
        setNotification({ message: 'PDF extraction not yet implemented. Please upload an image.', type: 'warning' });
        setLoading(false);
        return;
      }
    } catch (error) {
      handleExtractionError(error);
    }
  };

  const handleExtractionError = (error) => {
    setLoading(false);
    setExtractionProgress(0);
    setNotification({
      message: error.message || 'Extraction failed. Please try with a clearer image or enter details manually.',
      type: 'error'
    });
  };

  const handleFieldChange = (field, value) => {
    setExtractedData(prev => {
      const updated = { ...prev, [field]: value };

      if (field === 'amount' || field === 'taxPercent') {
        updated.taxAmount = Math.round(Number(updated.amount) * (Number(updated.taxPercent) / 100));
        updated.totalAmount = Number(updated.amount) + updated.taxAmount;
      }

      return updated;
    });
  };

  const handleConfirm = () => {
    if (!extractedData) return;

    const savedBills = JSON.parse(localStorage.getItem('bills') || '[]');
    const newBill = {
      id: Date.now(),
      ...extractedData,
      uploadedAt: new Date().toISOString(),
      filed: false,
      userId: user?.id,
    };

    savedBills.push(newBill);
    localStorage.setItem('bills', JSON.stringify(savedBills));

    // Dispatch custom event for bill upload (triggers dashboard update)
    window.dispatchEvent(new CustomEvent('billUpdated', { detail: { bills: savedBills } }));

    setNotification({ message: 'Bill saved successfully! Redirecting to GST Forms...', type: 'success' });

    setTimeout(() => {
      window.location.href = '/gst-forms';
    }, 1500);
  };

  const handleCancel = () => {
    setExtractedData(null);
    setFile(null);
    setPreview(null);
    setExtractionProgress(0);
  };

  const handleVoiceInput = async () => {
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
      setNotification({ message: 'Listening... Speak invoice details', type: 'info' });
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(transcript);
      setNotification({ message: 'Processing voice input with AI...', type: 'info' });
      setLoading(true); // Show loading indicator during AI processing
      setExtractionProgress(20);

      try {
        const extractedInfo = await extractDataFromVoice(transcript);
        setExtractionProgress(80);
        processExtractedData(extractedInfo);
      } catch (error) {
        handleExtractionError(error);
      }
    };

    recognition.onerror = (event) => {
      setIsRecording(false);
      setNotification({ message: `Voice input error: ${event.error}`, type: 'error' });
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const extractDataFromVoice = async (voiceText) => {
    try {
      setNotification({ message: 'Analyzing voice with AI...', type: 'info' });

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
              content: `You are an expert Indian GST invoice extraction specialist. Extract ALL invoice details from voice/text input and return ONLY a valid JSON object (no markdown, no explanation).

RETURN THIS JSON STRUCTURE:
{
  "supplierName": "vendor name or 'Unknown'",
  "gstin": "15-char GSTIN or '27XXXXX0000X0Z0'",
  "invoiceNumber": "invoice number or 'INV-AUTO'",
  "invoiceDate": "YYYY-MM-DD (use today if not mentioned)",
  "amount": <positive number for taxable amount>,
  "taxPercent": <5, 12, 18, or 28>,
  "taxAmount": <calculated tax>,
  "totalAmount": <amount + taxAmount>,
  "expenseType": "Raw Material|Travel|Utilities|Equipment|Services|Others",
  "extractionConfidence": "high|medium|low",
  "taxBreakdown": {"cgst": <number or null>, "sgst": <number or null>, "igst": <number or null>}
}

RULES:
- Handle Indian numbers: "10 lakh" = 1000000, "1 crore" = 10000000
- Parse dates: "today" = today's date, "15 Nov" = 2025-11-15, etc.
- GST rates: 5%, 12%, 18%, 28% only. Default to 18% if not mentioned.
- Calculate missing values: if total and amount exist, tax = total - amount
- ALWAYS return a complete JSON object with all fields populated (use reasonable defaults if needed)

EXAMPLES:
"Bill from XYZ Store for 50000 rupees with 18% GST"
→ {"supplierName":"XYZ Store","gstin":"27XXXXX0000X0Z0","invoiceNumber":"INV-AUTO","invoiceDate":"2025-11-15","amount":50000,"taxPercent":18,"taxAmount":9000,"totalAmount":59000,"expenseType":"Others","extractionConfidence":"high","taxBreakdown":{"cgst":4500,"sgst":4500,"igst":null}}

"Fuel from Shell, 5000 rupees, 5% tax, invoice 123"
→ {"supplierName":"Shell","gstin":"27XXXXX0000X0Z0","invoiceNumber":"123","invoiceDate":"2025-11-15","amount":5000,"taxPercent":5,"taxAmount":250,"totalAmount":5250,"expenseType":"Travel","extractionConfidence":"high","taxBreakdown":{"cgst":null,"sgst":null,"igst":250}}

CRITICAL: Always output raw JSON only. No markdown, no backticks, no explanation.`
            },
            {
              role: 'user',
              content: `Extract invoice data from this input and return ONLY the JSON object:\n\n${voiceText}`
            }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error ${response.status}: ${response.statusText}. Details: ${errorData}`);
      }

      const data = await response.json();

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      // Try to extract JSON from various formats
      let extracted = null;

      // Try markdown code blocks first
      let jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[1]);
      } else {
        // Try plain code blocks
        jsonMatch = content.match(/```\s*([\s\S]*?)```/);
        if (jsonMatch) {
          extracted = JSON.parse(jsonMatch[1]);
        } else {
          // Try direct JSON
          jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extracted = JSON.parse(jsonMatch[0]);
          }
        }
      }

      if (!extracted) {
        throw new Error('Could not parse AI response as JSON');
      }

      return extracted;
    } catch (error) {
      throw error;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neutral-50)' }}>
      <Navbar user={user} />

      {notification && (
        <div className="notification" style={{
          background: notification.type === 'success' ? 'var(--success-light)' :
            notification.type === 'error' ? 'var(--error-light)' :
              notification.type === 'warning' ? 'var(--warning-light)' : 'var(--info-light)',
          borderLeft: `4px solid ${notification.type === 'success' ? 'var(--success)' :
            notification.type === 'error' ? 'var(--error)' :
              notification.type === 'warning' ? 'var(--warning)' : 'var(--info)'
            }`,
        }}>
          <div className="notification-content">
            <p className="notification-message">{notification.message}</p>
          </div>
        </div>
      )}

      <div className="container section">
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
          {/* Upload Section */}
          <div className="card">
            <div className="card-header">
              <h1 className="card-title">
                <div className="card-title-icon">📄</div>
                <span>{t('bill_extraction')}</span>
              </h1>
              {extractedData && (
                <span className="badge badge-success">✓ Extracted</span>
              )}
            </div>

            {/* Voice Input Button */}
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                onClick={handleVoiceInput}
                disabled={loading || isRecording}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: isRecording ? 'var(--error-light)' : 'white',
                  color: isRecording ? 'var(--error)' : 'var(--neutral-700)',
                  border: `2px ${isRecording ? 'solid' : 'dashed'} ${isRecording ? 'var(--error)' : 'var(--neutral-300)'}`,
                }}
              >
                <IconMicrophone recording={isRecording} />
                <span style={{ fontWeight: 600 }}>
                  {isRecording ? 'Listening...' : t('Speak Invoice Details')}
                </span>
              </button>
              {voiceTranscript && (
                <p style={{
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  color: 'var(--neutral-600)',
                  fontStyle: 'italic',
                  textAlign: 'center',
                }}>
                  Heard: "{voiceTranscript}"
                </p>
              )}
            </div>

            {/* Camera Scan Button (hidden file input with capture) */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              ref={cameraInputRef}
            />
            <div style={{ marginTop: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => { openCameraModal(); }}
                disabled={loading || isRecording}
                className="btn btn-outline"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                aria-label={t('Scan with Camera')}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="7" width="18" height="14" rx="2" ry="2" />
                  <circle cx="12" cy="14" r="3" />
                  <path d="M7 7L9 5h6l2 2" />
                </svg>
                <span style={{ fontWeight: 600 }}>{t('Scan with Camera')}</span>
              </button>
            </div>

            {/* Camera modal for live capture */}
            {showCameraModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
                <div style={{ width: '100%', maxWidth: '900px', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ position: 'relative', background: 'black' }}>
                    {!modalCapturedPreview ? (
                      <>
                        <video ref={videoRef} style={{ width: '100%', height: 'auto', display: 'block' }} playsInline muted />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '8px' }}>
                          <button onClick={switchCameraFacing} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.9)' }}>Switch</button>
                          <button onClick={closeCameraModal} className="btn btn-sm btn-secondary">Close</button>
                        </div>
                        <div style={{ position: 'absolute', bottom: '12px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                          <button onClick={captureFromCamera} className="btn btn-primary btn-lg" style={{ borderRadius: '9999px', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>●</button>
                        </div>
                      </>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <img src={modalCapturedPreview} alt="Captured preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '8px' }}>
                          <button onClick={retakeCapture} className="btn btn-sm btn-secondary">Retake</button>
                        </div>
                        <div style={{ position: 'absolute', bottom: '12px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '12px' }}>
                          <button onClick={retakeCapture} className="btn btn-outline">Retake</button>
                          <button onClick={acceptCapture} className="btn btn-primary">Accept & Scan</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div style={{
              textAlign: 'center',
              color: 'var(--neutral-500)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              fontWeight: 500,
            }}>
              — OR —
            </div>

            <label style={{
              display: 'block',
              border: '2px dashed var(--primary-400)',
              borderRadius: 'var(--radius-xl)',
              padding: preview ? '1rem' : '3rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--primary-50)',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-600)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--primary-400)'}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />

              {preview ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-md)',
                      display: 'block'
                    }}
                  />

                  {(file?.isCameraCapture || cameraCapturedAt) && (
                    <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 10px', borderRadius: '999px', fontSize: '0.75rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19 12v.01" /></svg>
                      <span>Camera</span>
                      <span style={{ opacity: 0.9, marginLeft: '6px', fontSize: '0.7rem' }}>{new Date(file?.cameraCapturedAt || cameraCapturedAt).toLocaleString()}</span>
                    </div>
                  )}

                  <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>📸</span>
                  <p style={{ fontWeight: 600, color: 'var(--neutral-700)', marginBottom: '0.5rem', fontSize: '1.125rem' }}>
                    {file ? file.name : t('upload_invoice_image')}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--neutral-500)' }}>
                    {t('Supports PNG, JPG, WEBP (Max 10MB)')}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--primary-600)', marginTop: '0.75rem', fontWeight: 600 }}>
                    {t('🤖 AI + OCR will extract invoice details automatically')}
                  </p>
                </div>
              )}
            </label>

            {loading && extractionProgress > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--neutral-200)',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${extractionProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--primary-600), var(--primary-400))',
                    transition: 'width 0.3s ease',
                  }}></div>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--neutral-600)', marginTop: '0.5rem', textAlign: 'center' }}>
                  {extractionProgress < 50 ? 'Scanning image...' :
                    extractionProgress < 85 ? 'AI is analyzing...' :
                      'Almost done...'}
                </p>
              </div>
            )}

            <button
              onClick={handleExtract}
              disabled={!file || loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '1.5rem' }}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{t('Extract with AI + OCR')}</span>
                </>
              )}
            </button>

            <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', textAlign: 'center', marginTop: '1rem' }}>
              {t('By uploading, you agree to our Terms of Service and Privacy Policy.')}
            </p>
          </div>

          {/* Extracted Data Section */}
          {extractedData && (
            <div className="card animate-slide-up">
              <div className="card-header">
                <h2 className="card-title">
                  <div className="card-title-icon">📋</div>
                  <span>Extracted Invoice Details</span>
                </h2>
                <span className="badge badge-info">✎ Editable</span>
              </div>

              {extractedData.extractionConfidence === 'low' && (
                <div style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: '8px', padding: '12px', marginBottom: '1rem', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: '4px' }}>Low Confidence Extraction</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--neutral-700)', margin: 0 }}>We had difficulty reading this invoice clearly. Please verify and correct the details below before saving.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <div>
                  <label>{t('supplier_name')}</label>
                  <input
                    type="text"
                    value={extractedData.supplierName}
                    onChange={(e) => handleFieldChange('supplierName', e.target.value)}
                  />
                </div>
                <div>
                  <label>GSTIN</label>
                  <input
                    type="text"
                    value={extractedData.gstin}
                    onChange={(e) => handleFieldChange('gstin', e.target.value)}
                    maxLength={15}
                  />
                </div>
                <div>
                  <label>Invoice Number</label>
                  <input
                    type="text"
                    value={extractedData.invoiceNumber}
                    onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label>{t('date')}</label>
                  <input
                    type="date"
                    value={extractedData.invoiceDate}
                    onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                  />
                </div>
                <div>
                  <label>{t('amount')} (Taxable)</label>
                  <input
                    type="number"
                    value={extractedData.amount}
                    onChange={(e) => handleFieldChange('amount', e.target.value)}
                  />
                </div>

                <div>
                  <label>{t('tax_percent')}</label>
                  <input
                    type="text"
                    value={extractedData.taxPercent}
                    onChange={(e) => {
                      const input = e.target.value.trim();

                      if (input.includes(',') || input.includes('+') || /\d+\s+\d+/.test(input)) {
                        // Extract all numbers from the input
                        const numbers = input.match(/\d+\.?\d*/g);
                        if (numbers && numbers.length > 0) {
                          // Sum all the tax rates
                          const totalTax = numbers.reduce((sum, num) => sum + parseFloat(num), 0);
                          handleFieldChange('taxPercent', totalTax);
                          // Store individual rates for display
                          handleFieldChange('allTaxRates', numbers.map(n => parseFloat(n)));
                        }
                      } else {
                        // Single value - convert to number
                        const val = Number(input || 0);
                        handleFieldChange('taxPercent', val);
                        // Clear allTaxRates for single value
                        handleFieldChange('allTaxRates', null);
                      }
                    }}
                    placeholder="e.g., 9+9 or 18"
                  />
                  {extractedData.allTaxRates && extractedData.allTaxRates.length > 1 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.25rem', fontWeight: 600 }}>
                      ✓ Multiple rates detected: {extractedData.allTaxRates.join(' + ')}% = {extractedData.taxPercent}%
                    </p>
                  )}
                  {extractedData.taxPercent > 0 && (!extractedData.allTaxRates || extractedData.allTaxRates.length <= 1) && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--neutral-600)', marginTop: '0.25rem' }}>
                      → Single rate: {extractedData.taxPercent}% will be applied to taxable amount
                    </p>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--neutral-600)', marginTop: '0.5rem', lineHeight: '1.5' }}>
                    <p style={{ margin: '0.25rem 0', fontWeight: 500, color: 'var(--neutral-700)' }}>📋 How to enter tax:</p>
                    <ul style={{ margin: '0.25rem 0 0 1rem', paddingLeft: '0.5rem', listStyle: 'none' }}>
                      <li><strong>Single rate:</strong> Type 5, 12, 18, or 28 → Applied as-is</li>
                      <li><strong>Multiple rates:</strong> Type 9+9 or 5+12+18 → Auto-summed to one total</li>
                      <li><strong>CGST+SGST:</strong> Enter as 9+9 for dual tax states</li>
                      <li><strong>IGST:</strong> Enter single value for integrated tax (interstate)</li>
                      <li><strong>Auto-detect:</strong> System extracts from invoice breakdown if available</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <label>Tax Amount</label>
                  <input
                    type="number"
                    value={extractedData.taxAmount}
                    readOnly
                    style={{ background: 'var(--neutral-100)' }}
                  />
                </div>
                <div>
                  <label>Total Amount</label>
                  <input
                    type="number"
                    value={extractedData.totalAmount}
                    readOnly
                    style={{ background: 'var(--neutral-100)', fontWeight: 700 }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label>{t('expense_type')}</label>
                  <select
                    value={extractedData.expenseType}
                    onChange={(e) => handleFieldChange('expenseType', e.target.value)}
                  >
                    <option value="Raw Material">Raw Material</option>
                    <option value="Travel">Travel</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Services">Services</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button onClick={handleConfirm} className="btn btn-primary btn-lg" style={{ flex: 1 }}>
                  <span>✓</span>
                  <span>Save Bill</span>
                </button>
                <button onClick={handleCancel} className="btn btn-secondary btn-lg" style={{ flex: 1 }}>
                  <span>✕</span>
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BillUpload;
