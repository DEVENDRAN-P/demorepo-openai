import React, { createContext, useContext, useState } from 'react';

const UploadContext = createContext(null);

export function UploadProvider({ children }) {
  // Persistent state for BillUpload
  const [billFile, setBillFile] = useState(null);
  const [billPreview, setBillPreview] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [billExtractedText, setBillExtractedText] = useState('');
  const [billAnalysisResult, setBillAnalysisResult] = useState(null);

  // Persistent state for DocumentAssistant
  const [docFile, setDocFile] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [docExtracted, setDocExtracted] = useState(null);

  const clearBillUpload = () => {
    setBillFile(null);
    setBillPreview(null);
    setExtractedData(null);
    setBillExtractedText('');
    setBillAnalysisResult(null);
    try {
      sessionStorage.removeItem('gst_bill_upload_session');
    } catch (e) {}
  };

  const clearDocUpload = () => {
    setDocFile(null);
    setDocPreview(null);
    setDocExtracted(null);
  };

  return (
    <UploadContext.Provider
      value={{
        billFile,
        setBillFile,
        billPreview,
        setBillPreview,
        extractedData,
        setExtractedData,
        billExtractedText,
        setBillExtractedText,
        billAnalysisResult,
        setBillAnalysisResult,
        clearBillUpload,

        docFile,
        setDocFile,
        docPreview,
        setDocPreview,
        docExtracted,
        setDocExtracted,
        clearDocUpload,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
