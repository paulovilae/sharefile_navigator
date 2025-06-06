# Batch Processing Components

This folder contains all components related to batch OCR processing functionality.

## Structure

```
batch-processing/
├── README.md                          # This file
├── index.js                          # Main exports
├── components/                       # UI Components
│   ├── BatchOcrProcessor.jsx         # Main batch processor
│   ├── PaginatedBatchProcessor.jsx   # Paginated batch processor
│   ├── BatchControls.jsx            # Control buttons (start/stop/pause)
│   ├── BatchProgress.jsx            # Progress displays
│   ├── BatchFileList.jsx            # File selection display
│   ├── BatchSettings.jsx            # Settings configuration
│   └── BatchStatusChip.jsx          # Status indicator chip
├── hooks/                           # Custom hooks
│   ├── useBatchPolling.js          # Polling logic
│   ├── useBatchControls.js         # Control actions
│   └── useBatchState.js            # State management
├── utils/                          # Utility functions
│   ├── batchUtils.js               # Common batch utilities
│   ├── fileUtils.js                # File processing utilities
│   └── timeUtils.js                # Time formatting utilities
└── constants/                      # Constants and enums
    └── batchConstants.js           # Status constants, etc.
```

## Components Overview

### Main Components
- **BatchOcrProcessor**: Standard batch processing for smaller file sets
- **PaginatedBatchProcessor**: Chunked processing for large file sets

### Shared Components
- **BatchControls**: Reusable control buttons (start, pause, resume, stop)
- **BatchProgress**: Progress bars and statistics
- **BatchFileList**: Display selected files and processing status
- **BatchSettings**: Configuration options
- **BatchStatusChip**: Status indicator with enhanced queued state

### Hooks
- **useBatchPolling**: Handles status polling with adaptive intervals
- **useBatchControls**: Manages batch control actions
- **useBatchState**: Centralized state management

### Utilities
- **batchUtils**: Common batch processing utilities
- **fileUtils**: File expansion and filtering utilities
- **timeUtils**: Time formatting and duration calculations