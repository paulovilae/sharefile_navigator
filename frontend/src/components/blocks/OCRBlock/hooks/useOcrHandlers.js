import { useCallback } from 'react';

const useOcrHandlers = ({
  files,
  setFiles,
  ocrResults,
  setOcrResults,
  setCurrentFile,
  setError,
  updateMetrics,
  processFile,
  onExecutionUpdate,
}) => {
  const handleFileAdd = useCallback((newFiles) => {
    const validFiles = newFiles.filter(file => 
      file.name && file.name.toLowerCase().endsWith('.pdf')
    );
    
    setFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const uniqueFiles = validFiles.filter(f => !existingIds.has(f.id));
      return [...prev, ...uniqueFiles];
    });
    
    updateMetrics('filesReceived', validFiles.length);
  }, [setFiles, updateMetrics]);

  const handleFileRemove = useCallback((fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    
    // Remove OCR results for this file
    setOcrResults(prev => {
      const newResults = { ...prev };
      delete newResults[fileId];
      return newResults;
    });
    
    setCurrentFile(prev => prev?.id === fileId ? null : prev);
  }, [setFiles, setOcrResults, setCurrentFile]);

  const handleFileProcess = useCallback(async (file) => {
    try {
      setCurrentFile(file);
      setError(null);
      updateMetrics('processingStarted');
      
      await processFile(file);
      
      // Get the result to update metrics
      const result = ocrResults[file.id];
      if (result) {
        updateMetrics('processingCompleted', {
          processingTime: result.processingTime,
          confidence: result.confidence,
          charactersExtracted: result.text.length,
          pages: result.pages,
        });
      }
      
      // Notify parent component
      if (onExecutionUpdate) {
        onExecutionUpdate({
          status: 'file_processed',
          result: {
            fileId: file.id,
            fileName: file.name,
            success: true,
            ocrResult: result,
          },
        });
      }
      
    } catch (error) {
      console.error('File processing failed:', error);
      updateMetrics('processingFailed');
      setError(`Failed to process ${file.name}: ${error.message}`);
      
      // Notify parent component of failure
      if (onExecutionUpdate) {
        onExecutionUpdate({
          status: 'file_processing_failed',
          result: {
            fileId: file.id,
            fileName: file.name,
            success: false,
            error: error.message,
          },
        });
      }
    } finally {
      setCurrentFile(null);
    }
  }, [
    setCurrentFile,
    setError,
    updateMetrics,
    processFile,
    ocrResults,
    onExecutionUpdate,
  ]);

  const handleBatchProcess = useCallback(async (filesToProcess = null) => {
    const targetFiles = filesToProcess || files.filter(f => !ocrResults[f.id]);
    
    if (targetFiles.length === 0) {
      setError('No files to process');
      return;
    }

    for (const file of targetFiles) {
      try {
        await handleFileProcess(file);
      } catch (error) {
        console.error(`Batch processing failed for ${file.name}:`, error);
        // Continue with next file even if one fails
      }
    }

    // Notify completion of batch
    if (onExecutionUpdate) {
      onExecutionUpdate({
        status: 'batch_processing_completed',
        result: {
          totalFiles: targetFiles.length,
          processedFiles: targetFiles.filter(f => ocrResults[f.id]).length,
          results: ocrResults,
        },
      });
    }
  }, [files, ocrResults, handleFileProcess, setError, onExecutionUpdate]);

  const handleResultEdit = useCallback((fileId, newText) => {
    setOcrResults(prev => {
      if (!prev[fileId]) return prev;
      
      return {
        ...prev,
        [fileId]: {
          ...prev[fileId],
          text: newText,
          edited: true,
          editedAt: new Date().toISOString(),
        },
      };
    });
  }, [setOcrResults]);

  const handleResultDelete = useCallback((fileId) => {
    setOcrResults(prev => {
      const newResults = { ...prev };
      delete newResults[fileId];
      return newResults;
    });
  }, [setOcrResults]);

  const handleExportResults = useCallback((format = 'json') => {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalFiles: files.length,
      processedFiles: Object.keys(ocrResults).length,
      results: Object.entries(ocrResults).map(([fileId, result]) => {
        const file = files.find(f => f.id === fileId);
        return {
          fileId,
          fileName: file?.name || 'Unknown',
          text: result.text,
          confidence: result.confidence,
          processingTime: result.processingTime,
          pages: result.pages,
          timestamp: result.timestamp,
          edited: result.edited || false,
        };
      }),
    };

    let content, mimeType, filename;

    switch (format) {
      case 'json':
        content = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        filename = `ocr_results_${new Date().toISOString().split('T')[0]}.json`;
        break;
      
      case 'txt':
        content = exportData.results
          .map(r => `=== ${r.fileName} ===\n${r.text}\n\n`)
          .join('');
        mimeType = 'text/plain';
        filename = `ocr_results_${new Date().toISOString().split('T')[0]}.txt`;
        break;
      
      case 'csv':
        const csvHeaders = 'File Name,Text,Confidence,Processing Time,Pages,Timestamp\n';
        const csvRows = exportData.results
          .map(r => `"${r.fileName}","${r.text.replace(/"/g, '""')}",${r.confidence},${r.processingTime},${r.pages},"${r.timestamp}"`)
          .join('\n');
        content = csvHeaders + csvRows;
        mimeType = 'text/csv';
        filename = `ocr_results_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    // Create and trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [files, ocrResults]);

  const handleClearAll = useCallback(() => {
    setFiles([]);
    setOcrResults({});
    setCurrentFile(null);
    setError(null);
    updateMetrics('reset');
  }, [setFiles, setOcrResults, setCurrentFile, setError, updateMetrics]);

  return {
    handleFileAdd,
    handleFileRemove,
    handleFileProcess,
    handleBatchProcess,
    handleResultEdit,
    handleResultDelete,
    handleExportResults,
    handleClearAll,
  };
};

export default useOcrHandlers;