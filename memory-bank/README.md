# Memory Bank

This directory contains documentation of all significant changes, fixes, and improvements made to the SharePoint OCR File Explorer project. It serves as a knowledge repository that can be referenced when working on the system.

## Purpose

The Memory Bank is designed to:
- Document all major changes and fixes
- Provide context for why certain decisions were made
- Serve as a reference for future development
- Preserve institutional knowledge

## Categories

The files in this directory are organized into several categories:

### Architecture & Standards
- [block-architecture-standards.md](./block-architecture-standards.md)
- [hybrid-block-architecture.md](./hybrid-block-architecture.md)
- [modular-block-architecture.md](./modular-block-architecture.md)
- [web-platform-blocks.md](./web-platform-blocks.md)
- [workflow-simplification.md](./workflow-simplification.md)

### Coding Practices
- [01-coding-style.md](./01-coding-style.md)
- [01-dependency-management.md](./01-dependency-management.md)
- [component-cleanup-analysis.md](./component-cleanup-analysis.md)

### Batch Processing
- [batch-processing-current-file-fix.md](./batch-processing-current-file-fix.md)
- [batch-processing-frontend-info-fix.md](./batch-processing-frontend-info-fix.md)
- [batch-processing-logs-display-issue.md](./batch-processing-logs-display-issue.md)
- [batch-processing-performance-optimization.md](./batch-processing-performance-optimization.md)
- [batch-processing-stuck-queue-fix.md](./batch-processing-stuck-queue-fix.md)
- [batch-processing-time-calculations-fix.md](./batch-processing-time-calculations-fix.md)
- [batch-processing-total-pages-words-fix.md](./batch-processing-total-pages-words-fix.md)
- [batch-processor-refactoring.md](./batch-processor-refactoring.md)
- [paginated-batch-time-estimates-fix.md](./paginated-batch-time-estimates-fix.md)
- [stop-paginated-processing-fix.md](./stop-paginated-processing-fix.md)

### OCR & Image Processing
- [gpu-acceleration-enabled.md](./gpu-acceleration-enabled.md)
- [image-search-system.md](./image-search-system.md)
- [ocr-language-settings-fix.md](./ocr-language-settings-fix.md)
- [ocr-status-sync-fix.md](./ocr-status-sync-fix.md)
- [ocr-variable-name-fixes.md](./ocr-variable-name-fixes.md)
- [ocr-workflow-improvements.md](./ocr-workflow-improvements.md)
- [pytorch-pin-memory-warning-fix.md](./pytorch-pin-memory-warning-fix.md)
- [tesseract-easyocr-fix.md](./tesseract-easyocr-fix.md)

### Caching & Preloading
- [CACHE_IMPLEMENTATION.md](./CACHE_IMPLEMENTATION.md)
- [PRELOAD_SYSTEM.md](./PRELOAD_SYSTEM.md)
- [preloaded-images-fix-complete.md](./preloaded-images-fix-complete.md)
- [preloaded-images-fix.md](./preloaded-images-fix.md)
- [preloaded-ocr-results-feature.md](./preloaded-ocr-results-feature.md)

### SharePoint Integration
- [persistent-sharepoint-filter-settings.md](./persistent-sharepoint-filter-settings.md)
- [sharepoint-empty-content-fix.md](./sharepoint-empty-content-fix.md)
- [sharepoint-pagination-next-button-fix.md](./sharepoint-pagination-next-button-fix.md)
- [sharepoint-status-and-settings-improvements.md](./sharepoint-status-and-settings-improvements.md)

### UI/UX Improvements
- [duplicate-buttons-fix.md](./duplicate-buttons-fix.md)
- [log-accordion-fix.md](./log-accordion-fix.md)
- [spanish-localization-implementation.md](./spanish-localization-implementation.md)

### Thumbnail System
- [thumbnail-analysis.md](./thumbnail-analysis.md)
- [thumbnail-fix-complete.md](./thumbnail-fix-complete.md)
- [thumbnail-solution-implemented.md](./thumbnail-solution-implemented.md)
- [thumbnail-system-complete-v2.md](./thumbnail-system-complete-v2.md)
- [thumbnail-system-implementation.md](./thumbnail-system-implementation.md)

### System Improvements
- [intelligent-retry-system.md](./intelligent-retry-system.md)
- [unified-processing-settings.md](./unified-processing-settings.md)

## Usage

When working on the project, it's recommended to:

1. **Read relevant files** before making changes to a specific area
2. **Document new changes** by creating new markdown files in this directory
3. **Update existing files** when making significant changes to previously documented areas
4. **Reference these files** in commit messages or pull requests when applicable

This approach ensures that knowledge is preserved and accessible to all team members, even as the project evolves over time.