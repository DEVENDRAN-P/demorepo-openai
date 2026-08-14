import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { logUserActivity, uploadBillDocument, updateUserBill } from '../services/firebaseDataService';
import { auth } from '../config/firebase';
import { ENABLE_DOCUMENT_STORAGE } from '../config/features';
import { scrollToTop } from '../utils/scroll';
import { extractInvoiceData } from '../services/aiService';
import { fetchUsage, generateRequestId } from '../services/usageService';
import { useTranslation } from 'react-i18next';
import { useUpload } from '../context/UploadContext';

const dataURLtoFile = (dataurl, filename = 'uploaded_invoice.jpg') => {
  if (!dataurl || typeof dataurl !== 'string' || !dataurl.startsWith('data:')) return null;
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (e) {
    return null;
  }
};

const getApiUrl = (path) => {
  if (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port !== '5000') {
    return `http://localhost:5000${path}`;
  }
  return path;
};

// Configure the PDF.js worker (webpack 5 / CRA 5 compatible).
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

const validateFile = (file) => {
  const name = (file?.name || '').toLowerCase();
  const isAllowedType =
    (file?.type && (ALLOWED_IMAGE_TYPES.includes(file.type) || file.type === 'application/pdf')) ||
    ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!isAllowedType) {
    throw new Error('Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF invoice.');
  }
  if (file && file.size > MAX_FILE_SIZE) {
    throw new Error('File is too large. Please upload an invoice smaller than 10 MB.');
  }
  return true;
};

// Render the first page of a PDF to a JPEG data URL and extract any
// embedded text layer (works for both digital and scanned PDFs).
const renderPdfFirstPage = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  let pdfText = '';
  try {
    const textContent = await page.getTextContent();
    pdfText = textContent.items
      .map((item) => (typeof item.str === 'string' ? item.str : ''))
      .join(' ')
      .trim();
  } catch (e) {
    pdfText = '';
  }

  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { pdfText, dataUrl };
};

const mapAiError = (error) => {
  const friendly = {
    AI_RATE_LIMITED: 'AI analysis is temporarily busy. Your invoice is safe. Please retry analysis shortly.',
    AI_MISSING_KEY: 'AI analysis is temporarily unavailable. Your invoice is safe. Please try again later.',
    AI_TIMEOUT: 'AI analysis took too long to complete. Your invoice is safe. Please retry.',
    AI_SERVICE_ERROR: 'AI analysis is temporarily unavailable. Your invoice is safe. Please try again shortly.',
    AI_INVALID_OUTPUT: 'The AI could not read this document clearly. Your invoice is safe. Please retry with a clearer scan.',
    PAYLOAD_TOO_LARGE: 'This file is too large to analyze. Please upload a smaller file.',
    LIMIT_EXCEEDED: 'You have reached the monthly invoice limit on your current plan. Your invoice is saved. Upgrade to continue agent analysis.',
  };
  return friendly[error?.code] || error?.message || 'Invoice processing failed. Please review the document and retry.';
};

/**
 * Build business context from the user's stored profile.
 * The Sidebar/business selector writes `activeBusinessProfile` to localStorage
 * as a JSON object when the user selects a business.
 * We never hardcode fake businesses here.
 */
const getBusinessContext = () => {
  try {
    const raw = localStorage.getItem('activeBusinessProfile');
    if (raw) {
      const profile = JSON.parse(raw);
      if (profile && profile.name) return { name: profile.name, gstin: profile.gstin || '', state: profile.state || '' };
    }
    // Fallback: read individual keys written by older sidebar versions
    const name = localStorage.getItem('activeBusinessName');
    const gstin = localStorage.getItem('activeBusinessGSTIN');
    const state = localStorage.getItem('activeBusinessState');
    if (name) return { name, gstin: gstin || '', state: state || '' };
    return null;
  } catch (e) {
    return null;
  }
};

const IconCamera = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

// Parse invoice dates that come in many shapes (ISO, DD-MM-YYYY,
// DD/MM/YYYY, DD.MM.YYYY) and NEVER return an invalid Date — unreadable
// values ("Not Found", "N/A", garbage) fall back to today. Without this,
// `new Date(invoiceDate).toISOString()` throws "RangeError: Invalid time
// value" and blocks saving the invoice.
const parseInvoiceDate = (raw) => {
  if (!raw || typeof raw !== 'string') return new Date();
  const s = raw.trim();
  if (!s) return new Date();

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d; // ISO / US formats parse natively

  // Indian invoice format: DD-MM-YYYY | DD/MM/YYYY | DD.MM.YYYY
  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10) - 1;
    let yy = parseInt(m[3], 10);
    if (yy < 100) yy += 2000;
    const parsed = new Date(yy, mm, dd);
    if (parsed.getFullYear() === yy && parsed.getMonth() === mm && parsed.getDate() === dd) {
      return parsed;
    }
  }

  return new Date(); // unreadable → fall back to today
};

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

// Session-persistence key for the in-progress upload. Keeping the selected
// file (name/type/dataURL) + extracted data in sessionStorage means the user
// can navigate to other pages and come back without losing their upload. It
// is only removed when the user explicitly clears/resets or the upload is
// confirmed (tab close clears it automatically since it is session-scoped).
const UPLOAD_SESSION_KEY = 'billUpload_pending_v1';

function BillUpload() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uploadCtx = useUpload();
  
  const file = uploadCtx.billFile;
  const setFile = uploadCtx.setBillFile;
  const preview = uploadCtx.billPreview;
  const setPreview = uploadCtx.setBillPreview;
  const extractedData = uploadCtx.extractedData;
  const setExtractedData = uploadCtx.setExtractedData;
  const clearUpload = uploadCtx.clearBillUpload;

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notification, setNotification] = useState(null);
  const [hoveredField, setHoveredField] = useState(null);

  // Camera integration states
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const [modalCapturedPreview, setModalCapturedPreview] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Real monthly usage from the backend (GET /api/usage)
  const [usage, setUsage] = useState(null);
  const [billsCount, setBillsCount] = useState(0);
  const uploadIdRef = useRef(null);

  const activePlan = usage?.plan || 'free';
  const invoiceLimitInfo = usage?.limits?.invoiceUploads || { limit: Number.MAX_SAFE_INTEGER, display: 'Unlimited', fairUse: false };
  const rawLimit = invoiceLimitInfo.limit;
  const limit = invoiceLimitInfo.fairUse || !rawLimit || rawLimit >= Number.MAX_SAFE_INTEGER || String(rawLimit) === '9007199254740991' ? Infinity : Number(rawLimit);

  const extractionLimitInfo = usage?.limits?.aiExtractions || { limit: Number.MAX_SAFE_INTEGER, display: 'Unlimited', fairUse: false };
  const extractionLimit = extractionLimitInfo.fairUse || !extractionLimitInfo.limit || extractionLimitInfo.limit >= Number.MAX_SAFE_INTEGER || String(extractionLimitInfo.limit) === '9007199254740991' ? Infinity : Number(extractionLimitInfo.limit);
  const extractionUsed = typeof usage?.counts?.aiExtractions === 'number' ? usage.counts.aiExtractions : 0;
  const extractionExhausted = extractionUsed >= extractionLimit;

  // True when an AI error is a quota rejection.
  const isQuotaError = (err) =>
    err?.code === 'LIMIT_EXCEEDED' ||
    err?.code === 'PLAN_LIMIT_REACHED' ||
    err?.code === 'FAIR_USE_LIMIT_REACHED' ||
    /limit reached/i.test(err?.message || '');

  // Build limit-reached message.
  const quotaBlockMessage = () => {
    if (limit !== Infinity && billsCount >= limit) {
      return `Monthly invoice limit reached. You've used all ${limit} invoice uploads for this month. Upgrade to ${activePlan === 'free' ? 'Pro for 50 invoice uploads/month' : 'Business for higher/fair-use processing'}.`;
    }
    if (extractionLimit !== Infinity && extractionExhausted) {
      return `Monthly AI extraction limit reached. You've used all ${extractionLimit} AI extractions for this month. Upgrade to ${activePlan === 'free' ? 'Pro for 50 AI extractions/month' : 'Business for higher/fair-use processing'}.`;
    }
    return null;
  };

  // Single place to handle a quota rejection: instant dialog to upgrade
  const handleQuotaBlock = (message) => {
    setNotification({ message, type: 'warning' });
    localStorage.setItem('selectedPlan', activePlan === 'free' ? 'pro' : 'business');
    const goPricing = window.confirm(`${message}\n\nWould you like to navigate to the pricing page to upgrade your plan?`);
    if (goPricing) {
      navigate('/pricing');
    }
  };

  const refreshUsage = (force = false) => {
    return fetchUsage(force).then((u) => {
      setUsage(u);
      setBillsCount(typeof u?.counts?.invoiceUploads === 'number' ? u.counts.invoiceUploads : 0);
      return u;
    }).catch(() => null);
  };

  useEffect(() => {
    refreshUsage();
    const handlePlanChanged = () => refreshUsage(true);
    const handleUsageChanged = () => refreshUsage(true);
    window.addEventListener('planChanged', handlePlanChanged);
    window.addEventListener('usageChanged', handleUsageChanged);
    return () => {
      window.removeEventListener('planChanged', handlePlanChanged);
      window.removeEventListener('usageChanged', handleUsageChanged);
    };
  }, []);

  // Sync file restoration from preview dataURL if file object is missing
  useEffect(() => {
    if (preview && (!file || typeof file.arrayBuffer !== 'function')) {
      const restoredFile = dataURLtoFile(preview, file?.name || 'restored_invoice.jpg');
      if (restoredFile) setFile(restoredFile);
    }
  }, [preview, file]);

  useEffect(() => {
    if (notification) {
      scrollToTop();
    }
  }, [notification]);

  // File Select Handler with INSTANT quota pre-check
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Instant limit pre-check BEFORE file upload/AI processing
    const currentBlockMsg = quotaBlockMessage();
    if (currentBlockMsg) {
      handleQuotaBlock(currentBlockMsg);
      e.target.value = '';
      return;
    }

    try {
      validateFile(selectedFile);
    } catch (err) {
      setNotification({ message: err.message, type: 'error' });
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
    setExtractedData(null);
    setNotification(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  // OCR Text Extraction using Tesseract.js
  const extractTextWithOCR = async (targetFile) => {
    console.log("[OCR] Starting Tesseract");
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
      const text = result.data.text;
      console.log("[OCR] Tesseract completed, extracted characters:", text.length);
      return text;
    } catch (err) {
      console.error("[OCR] Tesseract error:", err);
      throw new Error('Failed to parse text from image using OCR. Please check image clarity.');
    }
  };

  // Gemini AI Invoice Details Extractor (server-side via /api/ai)
  const extractDataWithAI = async (ocrText) => {
    console.log("[OCR] Tesseract completed, extracted characters:", ocrText.length);
    console.log("[AI] Sending OCR text to Gemini, text length:", ocrText.length);
    setProgress(75);
    try {
      if (!ocrText || !ocrText.trim()) {
        throw new Error("Tesseract OCR produced no readable text. Please ensure the document is clear.");
      }
      const result = await extractInvoiceData({
        ocrText,
        business: getBusinessContext(),
      });
      console.log("[AI] OCR extraction completed");
      setProgress(100);
      return result.data;
    } catch (err) {
      console.error("[AI] OCR extraction failed:", err);
      throw err;
    }
  };

  // Gemini Vision AI Details & Bounding Box Extractor (server-side via /api/ai)
  const extractDataWithVisionAI = async (base64DataUrl) => {
    console.log("[OCR] Starting Vision AI extraction");
    console.log("[AI] Vision extraction started, image length:", base64DataUrl.length);
    setProgress(70);
    try {
      if (!base64DataUrl || base64DataUrl.length < 100) {
        throw new Error("Image data is invalid or too short for Vision AI.");
      }
      // Compress image to ensure it is under the 4MB limit and uploads quickly
      const optimizedBase64 = await compressImage(base64DataUrl);
      console.log("[AI] Image compressed, sending to server...");
      const result = await extractInvoiceData({
        image: optimizedBase64,
        business: getBusinessContext(),
      });
      console.log("[OCR] Vision AI extraction completed");
      setProgress(100);
      return result.data;
    } catch (err) {
      console.error("[AI] Vision extraction failed:", err);
      throw err;
    }
  };

  // Run Extraction Trigger
  const handleExtract = async () => {
    if (!file) {
      setNotification({ message: 'Please select an invoice file first', type: 'warning' });
      return;
    }

    // Pre-upload limit check: never start expensive OCR/AI work when EITHER
    // monthly quota (invoice uploads OR AI extractions) is exhausted. The
    // authoritative check still happens server-side on save. Refresh usage
    // first so the counters are current (no stale 15s cache) — the block is
    // INSTANT, no Vision/OCR work is started. The fresh usage object is used
    // directly (state updates are async, so reading state right after await
    // would still show stale counters).
    const freshUsage = await refreshUsage(true);
    if (freshUsage) {
      const freshInvLimit = freshUsage.limits?.invoiceUploads || {};
      const freshInvCeiling = freshInvLimit.fairUse || freshInvLimit.limit >= Number.MAX_SAFE_INTEGER ? Infinity : freshInvLimit.limit;
      const freshInvUsed = typeof freshUsage.counts?.invoiceUploads === 'number' ? freshUsage.counts.invoiceUploads : 0;
      const freshExtLimit = freshUsage.limits?.aiExtractions || {};
      const freshExtCeiling = freshExtLimit.fairUse || freshExtLimit.limit >= Number.MAX_SAFE_INTEGER ? Infinity : freshExtLimit.limit;
      const freshExtUsed = typeof freshUsage.counts?.aiExtractions === 'number' ? freshUsage.counts.aiExtractions : 0;

      if (freshInvUsed >= freshInvCeiling || freshExtUsed >= freshExtCeiling) {
        const which = freshInvUsed >= freshInvCeiling ? 'invoice' : 'AI extraction';
        const shown = which === 'invoice' ? (freshInvCeiling === Infinity ? 'your monthly' : `all ${freshInvCeiling}`) : (freshExtCeiling === Infinity ? 'your monthly' : `all ${freshExtCeiling}`);
        handleQuotaBlock(
          `Monthly ${which} limit reached. You've used ${shown} ${which === 'invoice' ? 'invoice uploads' : 'AI extractions'} this month. Upgrade to ${activePlan === 'free' ? 'Pro' : 'Business'} for higher limits.`
        );
        return;
      }
    } else {
      // Usage fetch failed — fall back to the (possibly stale) state counters.
      const fallbackMessage = quotaBlockMessage();
      if (fallbackMessage) {
        handleQuotaBlock(fallbackMessage);
        return;
      }
    }

    // Reserve the idempotency key for THIS file so a retry after a failed
    // save never double-counts (Part 7 — the backend counts it once).
    if (!uploadIdRef.current) {
      uploadIdRef.current = generateRequestId();
    }

    setLoading(true);
    setProgress(0);
    console.log("[AI] Extraction started for file:", file.name, "type:", file.type);

    try {
      let extractedInfo = null;
      const lowerName = file.name?.toLowerCase() || '';
      const isImage = file.type?.startsWith('image/') || lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.webp');
      const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');

      if (isImage && preview) {
        setNotification({ message: 'Processing invoice with Vision AI...', type: 'info' });
        try {
          extractedInfo = await extractDataWithVisionAI(preview);
          if (extractedInfo) extractedInfo.ocrSource = 'vision';
        } catch (visionErr) {
          // Quota exhaustion means Vision AND every other AI path will fail —
          // stop immediately instead of burning 30s on an OCR fallback.
          if (isQuotaError(visionErr)) {
            throw visionErr;
          }
          console.warn("[AI] Vision failed, falling back to OCR:", visionErr.message);
        }
      }

      // PDFs: extract the embedded text layer if present; otherwise render
      // the first page and run Gemini Vision (with Tesseract as fallback).
      // All of this happens client-side in memory — no cloud storage needed.
      if (!extractedInfo && isPdf) {
        setNotification({ message: 'Reading PDF invoice...', type: 'info' });
        const { pdfText, dataUrl } = await renderPdfFirstPage(file);
        if (pdfText && pdfText.trim().length >= 15) {
          setNotification({ message: 'AI is analyzing the PDF invoice...', type: 'info' });
          try {
            extractedInfo = await extractDataWithAI(pdfText);
            if (extractedInfo) extractedInfo.ocrSource = 'pdf_text';
          } catch (textErr) {
            if (isQuotaError(textErr)) {
              throw textErr;
            }
            console.warn('[AI] PDF text analysis failed, trying rendered page:', textErr.message);
          }
        }
        if (!extractedInfo) {
          setNotification({ message: 'Analyzing scanned PDF page via Vision AI...', type: 'info' });
          try {
            extractedInfo = await extractDataWithVisionAI(dataUrl);
            if (extractedInfo) extractedInfo.ocrSource = 'pdf_vision';
          } catch (visionErr) {
            if (isQuotaError(visionErr)) {
              throw visionErr;
            }
            console.warn('[AI] PDF Vision failed, falling back to OCR:', visionErr.message);
          }
        }
      }

      if (!extractedInfo && !isPdf) {
        setNotification({ message: 'Processing document with Tesseract OCR...', type: 'info' });
        console.log("[OCR] Starting Tesseract OCR");
        const ocrText = await extractTextWithOCR(file);
        console.log("[OCR] Tesseract completed, extracted characters:", ocrText.length);
        if (!ocrText || ocrText.trim().length < 15) {
          throw new Error('OCR returned insufficient text. Please ensure the document is clear.');
        }
        setNotification({ message: 'AI is analyzing invoice and compliance parameters...', type: 'info' });
        extractedInfo = await extractDataWithAI(ocrText);
        if (extractedInfo) extractedInfo.ocrSource = 'ocr';
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
      setNotification({ message: 'Invoice analyzed successfully! Review the details and confirm.', type: 'success' });
    } catch (error) {
      console.error("[AI] Extraction failed:", error);
      // Quota rejection: show instantly, ask before going to pricing. This is
      // the path hit when the aiExtractions quota is exhausted mid-extraction.
      if (isQuotaError(error)) {
        handleQuotaBlock(error.message || 'Monthly limit reached. Please upgrade your plan to continue.');
      } else {
        // The uploaded file remains in browser memory for retry — nothing to recover.
        setNotification({ message: mapAiError(error), type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Save to Firebase Handler — routed through the backend (POST /api/invoices)
  // so the monthly invoiceUploads limit is enforced server-side, atomically,
  // and idempotently (uploadId). The browser can no longer write invoices
  // directly and bypass the quota.
  const handleConfirm = async () => {
    if (!extractedData) return;
    // Never POST an empty invoice: the backend validates supplierName /
    // invoiceNumber. If AI extraction failed, tell the user instead of
    // sending a doomed request that consumes quota.
    if (!extractedData.supplierName && !extractedData.invoiceNumber) {
      setNotification({
        message: 'AI extraction did not return supplier or invoice details. Please retry the analysis before saving.',
        type: 'error',
      });
      return;
    }
    setLoading(true);

    try {
      const invoiceDateObj = parseInvoiceDate(extractedData.invoiceDate);
      const gstrDeadlineDate = new Date(invoiceDateObj.getFullYear(), invoiceDateObj.getMonth() + 1, 13);
      const businessId = localStorage.getItem('activeBusinessId') || null;

      const uploadId = uploadIdRef.current || generateRequestId();
      uploadIdRef.current = uploadId;

      const currentUser = auth.currentUser;
      if (!currentUser) {
        setNotification({ message: 'Please sign in again to save your invoice.', type: 'error' });
        return;
      }
      const token = await currentUser.getIdToken();

      setNotification({ message: 'Saving invoice and running AI agents...', type: 'info' });
      const res = await fetch(getApiUrl('/api/invoices'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uploadId,
          businessId,
          business: getBusinessContext(),
          invoice: {
            ...extractedData,
            businessId,
            gstrDeadline: gstrDeadlineDate.toISOString().split('T')[0],
            gstrForm: 'GSTR-1',
            filed: false,
            status: 'approved',
            createdAt: new Date().toISOString(),
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      // Limit reached — the backend rejected the upload (never 6/5).
      if (!res.ok && (data.code === 'PLAN_LIMIT_REACHED' || data.code === 'FAIR_USE_LIMIT_REACHED' || res.status === 403)) {
        const upgradeTarget = data.usage?.plan === 'pro' ? 'business' : 'pro';
        setNotification({
          message: data.error || 'Monthly invoice limit reached. Please upgrade your plan to continue.',
          type: 'warning',
        });
        localStorage.setItem('selectedPlan', upgradeTarget);
        // Ask the user before navigating (never force-redirect).
        const goPricing = window.confirm('You have reached your monthly invoice upload limit. Would you like to go to the pricing page to upgrade?');
        if (goPricing) {
          window.location.href = '/pricing';
        }
        return;
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invoice could not be saved. Please try again.');
      }

      const savedBillId = data.billId || null;

      // OPTIONAL document archive (default OFF): fire-and-forget, never blocks.
      if (ENABLE_DOCUMENT_STORAGE && file && savedBillId) {
        uploadBillDocument(file, savedBillId)
          .then((archive) => {
            if (archive?.storagePath) {
              return updateUserBill(savedBillId, { storagePath: archive.storagePath });
            }
            return null;
          })
          .catch((archiveErr) => {
            console.warn('[Archive] Optional document archive failed (non-blocking):', archiveErr);
          });
      }

      // Log user activity
      await logUserActivity({
        action: 'upload_bill',
        details: {
          invoiceNumber: extractedData.invoiceNumber || 'INV-AUTO'
        }
      }).catch(() => {});

      uploadIdRef.current = null; // consumed — next upload gets a fresh key
      sessionStorage.removeItem(UPLOAD_SESSION_KEY);
      setExtractedData(null);
      setFile(null);
      setPreview(null);
      setNotification({
        message: data.chainStatus === 'completed'
          ? 'Invoice synced! AI agents executed successfully.'
          : 'Invoice synced to your account successfully!',
        type: 'success',
      });
      window.dispatchEvent(new Event('billUpdated'));
      refreshUsage(true);
    } catch (err) {
      console.error('Error saving invoice via backend:', err);
      // The backend refunds the reserved slot when the save fails, so a
      // retry with the same uploadId is safe and never double-counts.
      setNotification({
        message: err.message || 'Error saving invoice details. Please try again.',
        type: 'error',
      });
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
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{t('billupload_title')}</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            {t('billupload_subtitle')}
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
          <div>{t('billupload_monthly_scans')}: <strong>{billsCount} / {limit === Infinity ? t('billupload_unlimited') : limit}</strong></div>
          <div style={{ width: '120px', background: 'var(--bg-tertiary)', height: '4px', borderRadius: '2px', display: 'inline-block', overflow: 'hidden', marginTop: '0.25rem' }}>
            <div style={{ width: `${limit === Infinity ? 100 : Math.min(100, (billsCount / limit) * 100)}%`, background: billsCount >= limit ? 'var(--error)' : 'var(--theme-primary)', height: '100%' }}></div>
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

      {/* Main scanner view */}
      <div className="ocr-viewer-container" style={{ display: 'grid', gridTemplateColumns: preview ? '1.1fr 0.9fr' : '1fr', gap: '2rem' }}>
        
        {/* Left Side: Invoice Preview & Highlights */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="pulse-dot"></span> {t('billupload_bounding_box')}
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
                <span style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1zM16 8H8m8 4H8m6 4H8"/>
                    </svg>
                  </span>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>{t('billupload_no_invoice')}</p>
                <p style={{ margin: '0.25rem 0 1.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('billupload_no_invoice_desc')}</p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <label className="btn btn-primary" style={{ display: 'inline-block', cursor: 'pointer', fontSize: '0.8rem' }}>
                    <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
                    {t('billupload_upload_invoice')}
                  </label>
                  <button onClick={openCamera} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem' }}>
                    <IconCamera /> {t('billupload_capture')}
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
                <button onClick={() => { clearUpload(); }} className="btn btn-outline" style={{ flex: 1 }}>{t('billupload_clear')}</button>
                <button onClick={handleExtract} disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
                  {loading ? `${t('billupload_extracting')}... (${progress}%)` : `⚡ ${t('billupload_run_extraction')}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Extraction Form & AI Insights */}
        {preview && (
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              {t('billupload_vetting_panel')}
            </h3>

            {loading && !extractedData ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 1.5rem', gap: '1rem' }}>
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></div>
                <strong style={{ fontSize: '0.9rem' }}>{t('billupload_ocr_active')}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('billupload_ocr_active_desc')}</span>
              </div>
            ) : extractedData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{t('billupload_confidence_index')}</span>
                  <span style={{ 
                    fontSize: '0.675rem', 
                    padding: '0.15rem 0.5rem', 
                    borderRadius: '4px', 
                    fontWeight: 700,
                    background: extractedData.extractionConfidence === 'high' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: extractedData.extractionConfidence === 'high' ? 'var(--success)' : 'var(--warning)',
                    textTransform: 'uppercase'
                  }}>
                    ● {extractedData.extractionConfidence} {t('billupload_confidence')}
                  </span>
                </div>

                {/* Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                  <div className="grid grid-cols-2" style={{ gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>{t('billupload_doc_type')}</label>
                      <input 
                        type="text" 
                        value={extractedData.gstDocumentType || 'Tax Invoice'} 
                        onChange={(e) => setExtractedData({ ...extractedData, gstDocumentType: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontWeight: 600 }}
                        readOnly
                      />
                    </div>
                    <div onMouseEnter={() => setHoveredField('supplierName')} onMouseLeave={() => setHoveredField(null)}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>{t('billupload_supplier_name')}</label>
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
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>{t('billupload_supplier_gstin')}</label>
                      <input 
                        type="text" 
                        value={extractedData.gstin} 
                        onChange={(e) => setExtractedData({ ...extractedData, gstin: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                      />
                    </div>
                    <div onMouseEnter={() => setHoveredField('invoiceNumber')} onMouseLeave={() => setHoveredField(null)}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>{t('billupload_invoice_number')}</label>
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
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>{t('billupload_invoice_date')}</label>
                      <input 
                        type="text" 
                        value={extractedData.invoiceDate} 
                        onChange={(e) => setExtractedData({ ...extractedData, invoiceDate: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>{t('billupload_classification')}</label>
                      <select 
                        value={extractedData.expenseType} 
                        onChange={(e) => setExtractedData({ ...extractedData, expenseType: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="Raw Material">{t('billupload_raw_material')}</option>
                        <option value="Utilities">{t('billupload_utilities')}</option>
                        <option value="Office Supplies">{t('billupload_office_supplies')}</option>
                        <option value="Services">{t('billupload_services')}</option>
                        <option value="Others">{t('billupload_others')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3" style={{ gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                    <div onMouseEnter={() => setHoveredField('amount')} onMouseLeave={() => setHoveredField(null)}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>{t('billupload_taxable_val')}</label>
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
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>{t('billupload_gst_tax')}</label>
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
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>{t('billupload_grand_total')}</label>
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
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>{t('billupload_tax_split')}</span>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{extractedData.taxAnalysis}</p>
                  </div>

                  {extractedData.riskAnalysis && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '3px solid var(--error)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--error)', fontWeight: 700, textTransform: 'uppercase' }}>{t('billupload_audit_risk')}</span>
                      <p style={{ margin: '0.15rem 0 0 0', color: 'var(--text-primary)', lineHeight: '1.4' }}>{extractedData.riskAnalysis}</p>
                    </div>
                  )}

                  {extractedData.aiSuggestions && extractedData.aiSuggestions.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>{t('billupload_ai_suggestions')}</span>
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
                    onClick={() => { sessionStorage.removeItem(UPLOAD_SESSION_KEY); setExtractedData(null); setFile(null); setPreview(null); }} 
                    className="btn btn-outline" 
                    style={{ flex: 1, padding: '0.5rem' }}
                  >
                    {t('billupload_reset')}
                  </button>
                  <button 
                    onClick={handleConfirm} 
                    disabled={loading} 
                    className="btn btn-primary" 
                    style={{ flex: 2, padding: '0.5rem' }}
                  >
                    {t('billupload_confirm_sync')}
                  </button>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 1.5rem' }}>
                {t('billupload_run_ocr_hint')}
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
                    <button onClick={() => setCameraFacingMode(prev => prev === 'environment' ? 'user' : 'environment')} className="btn" style={{ background: 'var(--bg-primary)', padding: '0.45rem 0.85rem', fontSize: '0.75rem' }}>{t('billupload_switch')}</button>
                    <button onClick={closeCameraModal} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem' }}>{t('billupload_close')}</button>
                  </div>
                  <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                    <button onClick={captureFromCamera} style={{ borderRadius: '50%', width: '56px', height: '56px', background: 'red', border: '4px solid white', cursor: 'pointer', outline: 'none' }}></button>
                  </div>
                </>
              ) : (
                <div style={{ position: 'relative' }}>
                  <img src={modalCapturedPreview} alt="Captured preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button onClick={() => setModalCapturedPreview(null)} className="btn btn-secondary" style={{ padding: '0.45rem 1.25rem', fontSize: '0.8rem' }}>{t('billupload_retake')}</button>
                    <button onClick={acceptCapture} className="btn btn-primary" style={{ padding: '0.45rem 1.25rem', fontSize: '0.8rem' }}>{t('billupload_accept_invoice')}</button>
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
