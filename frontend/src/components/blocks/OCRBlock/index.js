// Main OCR Block export
export { default } from './OCRBlock';

// Component exports
export { default as OCRBlock } from './OCRBlock';
export { default as OCRMetrics } from './components/OCRMetrics';
export { default as OCRSettings } from './components/OCRSettings';
export { default as PdfOcrProcessor } from './components/PdfOcrProcessor';
export { default as ImageOcrProcessor } from './components/ImageOcrProcessor';
export { default as PdfResultsDisplay } from './components/PdfResultsDisplay';

// Hook exports
export { default as useOcrMetrics } from './hooks/useOcrMetrics';
export { default as useFileProcessor } from './hooks/useFileProcessor';