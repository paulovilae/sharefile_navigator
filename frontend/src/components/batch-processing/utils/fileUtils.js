/**
 * File-related utility functions for batch processing
 */
import axios from 'axios';

/**
 * Expand folders to get all PDF files recursively
 * @param {Array} selectedItems - Array of selected files and folders
 * @returns {Promise<Array>} Array of PDF files
 */
export const expandFoldersToFiles = async (selectedItems) => {
    const files = [];
    const folders = [];
    
    // Separate files and folders from selection
    selectedItems.forEach(item => {
        if (item.itemType === 'file' && item.name.toLowerCase().endsWith('.pdf')) {
            files.push(item);
        } else if (item.itemType === 'folder') {
            folders.push(item);
        }
    });

    // For each folder, recursively fetch all PDF files
    for (const folder of folders) {
        try {
            const response = await axios.get(`/api/sharepoint/list_files_recursive`, {
                params: {
                    libraryId: folder.drive_id || folder.driveId,
                    folderId: folder.id,
                    fileType: 'pdf'
                }
            });
            
            if (response.data && response.data.files) {
                files.push(...response.data.files.map(file => ({
                    ...file,
                    itemType: 'file',
                    drive_id: folder.drive_id || folder.driveId
                })));
            }
        } catch (error) {
            console.error(`Error expanding folder ${folder.name}:`, error);
            throw new Error(`Error expanding folder ${folder.name}: ${error.message}`);
        }
    }

    return files;
};

/**
 * Filter out already processed files
 * @param {Array} files - Array of files to filter
 * @param {boolean} skipProcessed - Whether to skip already processed files
 * @returns {Promise<Array>} Array of unprocessed files
 */
export const filterUnprocessedFiles = async (files, skipProcessed = true) => {
    if (!skipProcessed) {
        return files;
    }

    try {
        // Get list of already processed files from the database
        const processedFilesResponse = await axios.get('/api/ocr/processed-files');
        const processedFileIds = new Set(processedFilesResponse.data.map(f => f.item_id));
        
        const unprocessedFiles = files.filter(file => !processedFileIds.has(file.id));
        
        console.log(`Filtered ${files.length - unprocessedFiles.length} already processed files`);
        return unprocessedFiles;
    } catch (error) {
        console.warn('Could not fetch processed files list, processing all files:', error);
        return files;
    }
};

/**
 * Split files into chunks for paginated processing
 * @param {Array} files - Array of files to split
 * @param {number} chunkSize - Size of each chunk
 * @returns {Array} Array of file chunks
 */
export const splitIntoChunks = (files, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < files.length; i += chunkSize) {
        chunks.push(files.slice(i, i + chunkSize));
    }
    return chunks;
};

/**
 * Prepare files for batch processing API
 * @param {Array} files - Array of files to prepare
 * @returns {Array} Array of files formatted for API
 */
export const prepareFilesForProcessing = (files) => {
    return files.map(file => ({
        name: file.name,
        item_id: file.id || file.file_id,
        drive_id: file.driveId || file.drive_id,
        size: file.size || 0,
        modified: file.lastModifiedDateTime || file.modified
    }));
};

/**
 * Get file type counts from selection
 * @param {Array} selectedItems - Array of selected items
 * @returns {Object} Object with file and folder counts
 */
export const getSelectionSummary = (selectedItems) => {
    const files = selectedItems.filter(item => item.itemType === 'file');
    const folders = selectedItems.filter(item => item.itemType === 'folder');
    const pdfFiles = files.filter(file => file.name.toLowerCase().endsWith('.pdf'));
    
    return {
        totalItems: selectedItems.length,
        files: files.length,
        folders: folders.length,
        pdfFiles: pdfFiles.length
    };
};