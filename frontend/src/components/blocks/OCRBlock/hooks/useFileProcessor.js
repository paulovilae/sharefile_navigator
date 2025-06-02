import { useCallback } from 'react';
import axios from 'axios';

/**
 * Custom hook for file processing utilities
 * Handles file conversion and SharePoint file fetching
 */
const useFileProcessor = () => {
  
  // Convert file to base64
  const fileToBase64 = useCallback(async (file) => {
    try {
      // Check if it's a real File/Blob object
      if (file instanceof File || file instanceof Blob) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const base64 = reader.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
            if (!base64 || base64.length === 0) {
              reject(new Error('File appears to be empty or corrupted'));
              return;
            }
            resolve(base64);
          };
          reader.onerror = error => reject(new Error(`Failed to read file: ${error.message}`));
        });
      } else {
        // For SharePoint files, fetch the content from SharePoint API
        console.log('Processing SharePoint file:', file.name, 'ID:', file.id);
        const base64Data = await fetchSharePointFileContent(file);
        if (!base64Data || base64Data.length === 0) {
          throw new Error('SharePoint file content is empty');
        }
        return base64Data;
      }
    } catch (error) {
      console.error('Error in fileToBase64:', error);
      throw error;
    }
  }, []);

  // Fetch SharePoint file content with retry mechanism
  const fetchSharePointFileContent = useCallback(async (sharePointFile, retryAttempt = 0) => {
    const maxRetries = 3;
    
    try {
      console.log(`Fetching SharePoint file content (attempt ${retryAttempt + 1}):`, {
        name: sharePointFile.name,
        drive_id: sharePointFile.drive_id,
        item_id: sharePointFile.id,
        size: sharePointFile.size
      });

      if (!sharePointFile.drive_id || !sharePointFile.id) {
        throw new Error('Missing SharePoint file identifiers (drive_id or item_id)');
      }

      const response = await axios.get(`/api/sharepoint/file_content`, {
        params: {
          drive_id: sharePointFile.drive_id,
          item_id: sharePointFile.id,
          // Add cache-busting parameter for retries
          _retry: retryAttempt > 0 ? Date.now() : undefined
        },
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        headers: {
          'Accept': 'application/octet-stream',
          // Add cache control for retries
          'Cache-Control': retryAttempt > 0 ? 'no-cache' : 'default'
        }
      });
      
      if (!response.data || response.data.byteLength === 0) {
        if (retryAttempt < maxRetries) {
          console.log(`Empty content received, retrying... (attempt ${retryAttempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryAttempt + 1))); // Progressive delay
          return fetchSharePointFileContent(sharePointFile, retryAttempt + 1);
        }
        throw new Error('SharePoint API returned empty file content after all retries');
      }

      console.log('SharePoint file content received:', response.data.byteLength, 'bytes');
      
      // Convert ArrayBuffer to base64
      const base64 = btoa(
        new Uint8Array(response.data)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      if (!base64 || base64.length === 0) {
        throw new Error('Failed to convert SharePoint file to base64');
      }

      console.log('Base64 conversion successful, length:', base64.length);
      return base64;
    } catch (error) {
      console.error(`SharePoint file fetch error (attempt ${retryAttempt + 1}):`, error);
      
      // Retry on specific errors
      if (retryAttempt < maxRetries && (
        error.message.includes('empty file content') ||
        error.message.includes('Network Error') ||
        (error.response && [502, 503, 504].includes(error.response.status))
      )) {
        console.log(`Retrying SharePoint file fetch... (attempt ${retryAttempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryAttempt + 1))); // Progressive delay
        return fetchSharePointFileContent(sharePointFile, retryAttempt + 1);
      }
      
      if (error.response) {
        throw new Error(`SharePoint API error (${error.response.status}): ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Network error: Unable to reach SharePoint API');
      } else {
        throw new Error(`SharePoint file processing error: ${error.message}`);
      }
    }
  }, []);

  // Validate file type
  const validateFileType = useCallback((file, allowedTypes = []) => {
    if (!file) return false;
    
    // For File objects
    if (file.type) {
      return allowedTypes.some(type => file.type.includes(type));
    }
    
    // For SharePoint files (check by extension)
    if (file.name) {
      const extension = file.name.toLowerCase().split('.').pop();
      return allowedTypes.some(type => type.includes(extension));
    }
    
    return false;
  }, []);

  // Get file size in human readable format
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Extract file info
  const getFileInfo = useCallback((file) => {
    const info = {
      name: file.name || 'Unknown',
      size: file.size || 0,
      type: file.type || 'Unknown',
      lastModified: file.lastModified || file.lastModifiedDateTime || null,
      isSharePointFile: !!(file.drive_id && file.id)
    };

    // Add formatted size
    info.formattedSize = formatFileSize(info.size);

    // Add file extension
    if (info.name.includes('.')) {
      info.extension = info.name.toLowerCase().split('.').pop();
    }

    return info;
  }, [formatFileSize]);

  // Process multiple files
  const processFiles = useCallback(async (files, processor) => {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await processor(file);
        results.push({ file, result, success: true });
      } catch (error) {
        errors.push({ file, error, success: false });
      }
    }

    return { results, errors };
  }, []);

  // Filter files by type
  const filterFilesByType = useCallback((files, allowedTypes) => {
    return files.filter(file => validateFileType(file, allowedTypes));
  }, [validateFileType]);

  return {
    fileToBase64,
    fetchSharePointFileContent,
    validateFileType,
    formatFileSize,
    getFileInfo,
    processFiles,
    filterFilesByType
  };
};

export default useFileProcessor;