import { useState, useEffect, useCallback, useRef } from 'react';

const useOcrEngine = ({ setProcessing, setError, setProgress, setOcrResults }) => {
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [engineError, setEngineError] = useState(null);
  const workerRef = useRef(null);
  const cancelRef = useRef(false);

  // Initialize Tesseract worker
  useEffect(() => {
    initializeEngine();
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const initializeEngine = async () => {
    try {
      setEngineError(null);
      
      // Dynamically import Tesseract.js
      const Tesseract = await import('tesseract.js');
      
      // Create worker
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(m.progress * 100);
          }
        }
      });

      workerRef.current = worker;
      setIsEngineReady(true);
      console.log('OCR Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OCR engine:', error);
      setEngineError(`Failed to initialize OCR engine: ${error.message}`);
      setIsEngineReady(false);
    }
  };

  const processFile = useCallback(async (file) => {
    if (!isEngineReady || !workerRef.current) {
      throw new Error('OCR engine not ready');
    }

    setProcessing(true);
    setError(null);
    setProgress(0);
    cancelRef.current = false;

    const startTime = Date.now();

    try {
      let fileData;
      
      // Handle different file sources
      if (file.url) {
        // File from SharePoint or external URL
        const response = await fetch(file.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        fileData = await response.arrayBuffer();
      } else if (file.file) {
        // File from file input
        fileData = await file.file.arrayBuffer();
      } else {
        throw new Error('No valid file source found');
      }

      // Check if processing was cancelled
      if (cancelRef.current) {
        throw new Error('Processing cancelled');
      }

      // Convert PDF to images using pdf.js
      const images = await convertPdfToImages(fileData);
      
      if (cancelRef.current) {
        throw new Error('Processing cancelled');
      }

      // Process each page with OCR
      let allText = '';
      let totalConfidence = 0;
      const pageResults = [];

      for (let i = 0; i < images.length; i++) {
        if (cancelRef.current) {
          throw new Error('Processing cancelled');
        }

        setProgress((i / images.length) * 100);
        
        const result = await workerRef.current.recognize(images[i]);
        
        pageResults.push({
          pageNumber: i + 1,
          text: result.data.text,
          confidence: result.data.confidence
        });
        
        allText += result.data.text + '\n\n';
        totalConfidence += result.data.confidence;
      }

      const processingTime = Date.now() - startTime;
      const averageConfidence = totalConfidence / images.length;

      const ocrResult = {
        text: allText.trim(),
        confidence: averageConfidence,
        processingTime,
        pages: images.length,
        pageResults,
        timestamp: new Date().toISOString(),
      };

      // Update results
      setOcrResults(prev => ({
        ...prev,
        [file.id]: ocrResult
      }));

      setProgress(100);
      console.log(`OCR completed for ${file.name} in ${processingTime}ms`);
      
    } catch (error) {
      if (error.message !== 'Processing cancelled') {
        console.error('OCR processing error:', error);
        setError(`OCR processing failed: ${error.message}`);
      }
      throw error;
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }, [isEngineReady, setProcessing, setError, setProgress, setOcrResults]);

  const convertPdfToImages = async (pdfData) => {
    try {
      // Dynamically import pdf.js
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const images = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (cancelRef.current) {
          break;
        }

        const page = await pdf.getPage(pageNum);
        const scale = 2.0; // Higher scale for better OCR accuracy
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        // Convert canvas to image data
        const imageData = canvas.toDataURL('image/png');
        images.push(imageData);
      }

      return images;
    } catch (error) {
      console.error('PDF conversion error:', error);
      throw new Error(`Failed to convert PDF to images: ${error.message}`);
    }
  };

  const cancelProcessing = useCallback(() => {
    cancelRef.current = true;
    setProcessing(false);
    setProgress(0);
    setError('Processing cancelled by user');
  }, [setProcessing, setProgress, setError]);

  const reinitializeEngine = useCallback(async () => {
    if (workerRef.current) {
      await workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsEngineReady(false);
    await initializeEngine();
  }, []);

  return {
    isEngineReady,
    engineError,
    processFile,
    cancelProcessing,
    reinitializeEngine,
  };
};

export default useOcrEngine;