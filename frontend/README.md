# SharePoint OCR File Explorer - Frontend

This directory contains the React frontend for the SharePoint OCR File Explorer project, built with Vite for fast development and optimized production builds.

## Overview

The frontend provides:
- SharePoint document library browsing
- File listing with sorting and filtering
- File preview capabilities (PDF, images, text, etc.)
- OCR processing interface
- Workflow block management
- Batch processing monitoring
- Responsive, modern UI

## Directory Structure

```
frontend/
├── public/                   # Static assets
├── src/                      # Source code
│   ├── components/           # React components
│   │   ├── batch-processing/ # Batch processing components
│   │   ├── blocks/           # Block workflow components
│   │   │   └── SharePointExplorer/ # SharePoint explorer components
│   │   ├── common/           # Common UI components
│   │   └── ...               # Other component directories
│   ├── constants/            # Application constants
│   ├── contexts/             # React contexts
│   ├── flows/                # Workflow flow components
│   ├── hooks/                # Custom React hooks
│   ├── services/             # API service functions
│   ├── utils/                # Utility functions
│   ├── App.jsx               # Main application component
│   ├── main.jsx              # Application entry point
│   └── ...                   # Other source files
├── index.html                # HTML entry point
├── package.json              # NPM dependencies and scripts
├── vite.config.js            # Vite configuration
└── README.md                 # This file
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend server running (see backend README)

### Installation

```bash
# Install dependencies
npm install
# or
yarn
```

### Running the Development Server

```bash
# Start the development server
npm run dev
# or
yarn dev
```

The development server will start at http://localhost:5173 by default.

### Building for Production

```bash
# Build for production
npm run build
# or
yarn build
```

The production build will be output to the `dist` directory.

## Features

### SharePoint Integration

The frontend communicates with the backend to:
- List available SharePoint document libraries
- Browse folder structures
- List files with sorting and filtering
- Download and preview files

### File Preview

The application supports previewing various file types:
- PDF files (using PDF.js)
- Images (JPG, PNG, etc.)
- Text files
- CSV files (as tables)
- Markdown files (rendered)

### Block Workflow System

The frontend implements a visual interface for the block workflow system:
- Viewing and managing block categories
- Creating and configuring block templates
- Building workflows from blocks
- Monitoring workflow executions

### Batch Processing

The application provides a batch processing interface for:
- Selecting files for processing
- Monitoring processing progress
- Viewing processing results
- Managing the processing queue

## Development Notes

- The application uses React 18+ with hooks and functional components
- Vite is used for fast development and optimized builds
- Material UI provides the component library and theming
- The frontend communicates with the backend via RESTful APIs
