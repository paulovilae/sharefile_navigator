import { useState } from 'react';

const useOcrState = () => {
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [ocrResults, setOcrResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const resetState = () => {
    setFiles([]);
    setCurrentFile(null);
    setOcrResults({});
    setProcessing(false);
    setError(null);
    setProgress(0);
  };

  const addOcrResult = (fileId, result) => {
    setOcrResults(prev => ({
      ...prev,
      [fileId]: result
    }));
  };

  const removeOcrResult = (fileId) => {
    setOcrResults(prev => {
      const newResults = { ...prev };
      delete newResults[fileId];
      return newResults;
    });
  };

  const clearError = () => {
    setError(null);
  };

  return {
    // State
    files,
    currentFile,
    ocrResults,
    processing,
    error,
    progress,
    
    // Setters
    setFiles,
    setCurrentFile,
    setOcrResults,
    setProcessing,
    setError,
    setProgress,
    
    // Helper functions
    resetState,
    addOcrResult,
    removeOcrResult,
    clearError,
  };
};

export default useOcrState;