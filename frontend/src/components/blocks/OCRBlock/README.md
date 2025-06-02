# OCR Block

A unified, modular OCR processing block that combines PDF and image OCR capabilities with comprehensive metrics tracking.

## Structure

```
OCRBlock/
├── OCRBlock.jsx                 # Main component with tabbed interface
├── index.js                     # Export definitions
├── components/                  # UI Components
│   ├── OCRMetrics.jsx          # Metrics display component
│   ├── OCRSettings.jsx         # Settings configuration component
│   ├── PdfOcrProcessor.jsx     # PDF OCR processing logic
│   ├── ImageOcrProcessor.jsx   # Image OCR processing logic
│   └── PdfResultsDisplay.jsx   # PDF results visualization
└── hooks/                      # Custom hooks
    ├── useOcrMetrics.js        # Metrics tracking hook
    └── useFileProcessor.js     # File processing utilities hook
```

## Features

### Main Component (OCRBlock.jsx)
- **Tabbed Interface**: Switch between PDF OCR and Image OCR modes
- **Unified Metrics**: Global metrics tracking across all OCR operations
- **Modular Architecture**: Clean separation of concerns

### Components

#### OCRMetrics.jsx
- Collapsible metrics display
- Real-time performance tracking
- Success rate calculations
- Processing time analytics

#### OCRSettings.jsx
- PDF conversion settings (DPI, format, color mode, page range)
- OCR engine configuration (Tesseract GPU/CPU, PaddleOCR, EasyOCR)
- Language selection
- GPU acceleration toggle
- Batch processing options

#### PdfOcrProcessor.jsx
- PDF to image conversion
- Text extraction from embedded PDF text
- OCR fallback for image-only PDFs
- SharePoint file integration
- Progress tracking with step indicators

#### ImageOcrProcessor.jsx
- Direct image OCR processing
- Multiple image upload support
- Simulated OCR results (for demo)
- File validation

#### PdfResultsDisplay.jsx
- Image grid display of PDF pages
- Detailed page view dialog
- Text extraction preview
- Processing status indicators

### Hooks

#### useOcrMetrics.js
- Centralized metrics tracking
- Action-based metric updates
- Derived metrics calculations
- Parent component integration

#### useFileProcessor.js
- File to base64 conversion
- SharePoint file content fetching
- File type validation
- File size formatting
- Batch file processing

## Usage

### Basic Usage
```jsx
import OCRBlock from './components/blocks/OCRBlock';

<OCRBlock
  config={{}}
  onExecutionUpdate={handleUpdate}
  selectedFiles={sharePointFiles}
/>
```

### With Custom Configuration
```jsx
<OCRBlock
  config={{
    defaultTab: 0, // 0 for PDF OCR, 1 for Image OCR
    autoProcess: true
  }}
  onExecutionUpdate={(update) => {
    console.log('OCR Update:', update);
  }}
  selectedFiles={selectedSharePointFiles}
/>
```

## Integration

The OCR Block integrates with:
- **SharePoint Explorer**: Processes files selected from SharePoint
- **Backend OCR API**: Calls `/api/ocr/pdf_ocr` for processing
- **Metrics System**: Reports to parent components for workflow tracking

## Metrics Tracked

- **Processing Stats**: Files processed, success rate, session duration
- **Content Stats**: Total words, characters, average words per page
- **Performance Stats**: Processing times, GPU utilization, memory usage
- **File Stats**: Image sizes, conversion times, OCR times

## API Integration

### PDF OCR Endpoint
```javascript
POST /api/ocr/pdf_ocr
{
  file_data: "base64_encoded_pdf",
  filename: "document.pdf",
  settings: {
    dpi: 300,
    imageFormat: "PNG",
    ocrEngine: "tesseract-gpu",
    language: "eng",
    enableGpuAcceleration: true
  }
}
```

### Expected Response
```javascript
{
  filename: "document.pdf",
  pageCount: 5,
  totalWords: 1250,
  totalCharacters: 6800,
  processingTime: 3500,
  hasEmbeddedText: false,
  status: "completed",
  pages: [
    {
      id: "page_1",
      pageNumber: 1,
      imageUrl: "/static/images/page_1.png",
      extractedText: "Page content...",
      wordCount: 250,
      characterCount: 1360,
      confidence: 0.95,
      status: "ocr_processed",
      hasEmbeddedText: false,
      processingTime: 700
    }
  ]
}
```

## Migration Notes

This unified OCR Block replaces:
- `OcrProcessingBlock.jsx` (985 lines → modular components)
- `PdfOcrBlock.jsx` (985 lines → modular components)

Benefits:
- **Reduced Complexity**: Large files broken into focused components
- **Better Maintainability**: Clear separation of concerns
- **Reusability**: Components can be used independently
- **Unified Interface**: Single entry point for all OCR operations
- **Enhanced Metrics**: Comprehensive tracking across all operations