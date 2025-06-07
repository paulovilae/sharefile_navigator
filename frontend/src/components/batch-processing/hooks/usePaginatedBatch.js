/**
 * Custom hook for paginated batch processing logic
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { expandFoldersToFiles, filterUnprocessedFiles, splitIntoChunks, prepareFilesForProcessing } from '../utils/fileUtils';
import { generateBatchId, startBatchProcessing } from '../utils/batchUtils';

export const usePaginatedBatch = (selectedFiles, settings, onProcessingUpdate) => {
    // Pagination state
    const [paginationState, setPaginationState] = useState({
        isActive: false,
        currentChunk: 0,
        totalChunks: 0,
        chunkSize: 200,
        processedChunks: 0,
        failedChunks: 0,
        totalFiles: 0,
        processedFiles: 0,
        failedFiles: 0,
        skippedFiles: 0,
        isExistingBatch: false
    });

    const [currentBatch, setCurrentBatch] = useState({
        batchId: null,
        status: null,
        isProcessing: false
    });

    const [chunkHistory, setChunkHistory] = useState([]);
    const [fileChunks, setFileChunks] = useState([]);
    
    // Refs for timeouts
    const pauseTimeoutRef = useRef(null);

    // Cleanup timeouts
    useEffect(() => {
        return () => {
            if (pauseTimeoutRef.current) {
                clearTimeout(pauseTimeoutRef.current);
            }
        };
    }, []);

    // Process a single chunk
    const processChunk = useCallback(async (files, chunkIndex) => {
        const batchId = generateBatchId('batch', chunkIndex);
        
        try {
            const filesForProcessing = prepareFilesForProcessing(files);

            console.log(`Starting chunk ${chunkIndex + 1} with ${filesForProcessing.length} files`);
            
            const response = await startBatchProcessing(batchId, filesForProcessing, settings);

            setCurrentBatch({
                batchId: batchId,
                status: response,
                isProcessing: true
            });

            // Add to chunk history
            setChunkHistory(prev => [...prev, {
                chunkIndex: chunkIndex,
                batchId: batchId,
                fileCount: filesForProcessing.length,
                status: 'processing',
                startTime: Date.now(),
                endTime: null
            }]);

            return { batchId, response };

        } catch (error) {
            console.error(`Error starting chunk ${chunkIndex + 1}:`, error);
            
            // Mark chunk as failed
            setChunkHistory(prev => [...prev, {
                chunkIndex: chunkIndex,
                batchId: batchId,
                fileCount: files.length,
                status: 'error',
                startTime: Date.now(),
                endTime: Date.now(),
                error: error.message
            }]);
            
            setPaginationState(prev => ({
                ...prev,
                failedChunks: prev.failedChunks + 1
            }));
            
            throw error;
        }
    }, [settings]);

    // Process next chunk in sequence
    const processNextChunk = useCallback(async () => {
        if (!paginationState.isActive) return;
        
        const nextChunkIndex = paginationState.currentChunk + 1;
        
        if (nextChunkIndex >= paginationState.totalChunks) {
            // All chunks processed
            setPaginationState(prev => ({
                ...prev,
                isActive: false,
                currentChunk: 0
            }));
            setCurrentBatch({
                batchId: null,
                status: null,
                isProcessing: false
            });
            return;
        }
        
        setPaginationState(prev => ({
            ...prev,
            currentChunk: nextChunkIndex,
            processedChunks: prev.processedChunks + 1
        }));
        
        // Add pause between chunks if enabled
        if (settings.pauseBetweenChunks) {
            console.log(`Pausing ${settings.pauseDuration}ms before next chunk...`);
            pauseTimeoutRef.current = setTimeout(() => {
                if (fileChunks[nextChunkIndex]) {
                    processChunk(fileChunks[nextChunkIndex], nextChunkIndex);
                }
            }, settings.pauseDuration);
        } else {
            // Continue immediately with next chunk
            if (fileChunks[nextChunkIndex]) {
                processChunk(fileChunks[nextChunkIndex], nextChunkIndex);
            }
        }
    }, [paginationState, settings, fileChunks, processChunk]);

    // Start paginated processing
    const startPaginatedProcessing = useCallback(async (continueFromCurrent = false) => {
        try {
            if (!continueFromCurrent) {
                // Reset state for new processing
                setPaginationState(prev => ({
                    ...prev,
                    isActive: true,
                    currentChunk: 0,
                    processedChunks: 0,
                    failedChunks: 0,
                    processedFiles: 0,
                    failedFiles: 0,
                    skippedFiles: 0,
                    chunkSize: settings.chunkSize || 200
                }));
                setChunkHistory([]);
            }
            
            // Expand folders to get all files
            const allFiles = await expandFoldersToFiles(selectedFiles);
            
            if (allFiles.length === 0) {
                throw new Error('No PDF files found in selection');
            }
            
            // Filter out processed files if enabled
            const filesToProcess = await filterUnprocessedFiles(allFiles, settings.skipProcessed);
            
            if (filesToProcess.length === 0) {
                throw new Error('All files have already been processed');
            }
            
            // Split into chunks
            const chunks = splitIntoChunks(filesToProcess, settings.chunkSize || 200);
            
            if (!continueFromCurrent) {
                // Store chunks for later use
                setFileChunks(chunks);
                setPaginationState(prev => ({
                    ...prev,
                    totalChunks: chunks.length,
                    totalFiles: filesToProcess.length
                }));
            }
            
            // Start processing the current chunk
            const chunkIndex = continueFromCurrent ? paginationState.currentChunk : 0;
            const chunksToUse = continueFromCurrent ? fileChunks : chunks;
            if (chunkIndex < chunksToUse.length) {
                const result = await processChunk(chunksToUse[chunkIndex], chunkIndex);
                return result;
            }
            
        } catch (error) {
            console.error('Error starting paginated processing:', error);
            setPaginationState(prev => ({
                ...prev,
                isActive: false
            }));
            throw error;
        }
    }, [selectedFiles, settings, expandFoldersToFiles, filterUnprocessedFiles, processChunk, paginationState.currentChunk, fileChunks]);

    // Stop paginated processing
    const stopPaginatedProcessing = useCallback(() => {
        // Clear timeouts
        if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
            pauseTimeoutRef.current = null;
        }
        
        // Update state
        setPaginationState(prev => ({
            ...prev,
            isActive: false
        }));
        
        setCurrentBatch({
            batchId: null,
            status: null,
            isProcessing: false
        });
    }, []);

    // Handle chunk completion
    const handleChunkCompletion = useCallback((batchId, status) => {
        // Skip if this batch has already been processed
        if (status._chunkProcessed) {
            return;
        }
        
        // Mark as processed to prevent duplicate handling
        status._chunkProcessed = true;
        
        // Update chunk history
        setChunkHistory(prev => prev.map(chunk =>
            chunk.batchId === batchId
                ? { ...chunk, status: status.status, endTime: Date.now() }
                : chunk
        ));
        
        // Update pagination state - use the counts from status directly
        // instead of adding to existing counts to avoid exceeding totalFiles
        setPaginationState(prev => {
            // Get counts from status
            const processedCount = status.processed_count || 0;
            const failedCount = status.failed_count || 0;
            const skippedCount = status.skipped_count || 0;
            
            // Calculate total processed files
            const totalProcessed = processedCount + failedCount + skippedCount;
            
            // When reprocessing files, we want to keep the original totalFiles count
            // to avoid showing more files than are actually being processed
            let totalFiles = prev.totalFiles;
            if (totalProcessed > totalFiles) {
                console.log(`[handleChunkCompletion] Processed count (${totalProcessed}) exceeds total_files (${totalFiles}), but keeping original count to avoid double-counting`);
                
                // Keep the original totalFiles count
                return {
                    ...prev,
                    processedFiles: processedCount,
                    failedFiles: failedCount,
                    skippedFiles: skippedCount
                };
            }
            
            return {
                ...prev,
                processedFiles: processedCount,
                failedFiles: failedCount,
                skippedFiles: skippedCount
            };
        });
        
        // If this chunk completed successfully, process next chunk
        // But only if we're still active and not already processing the next chunk
        if (status.status === 'completed' && paginationState.isActive &&
            paginationState.currentChunk < paginationState.totalChunks - 1) {
            // Use setTimeout to break the synchronous state update chain
            setTimeout(() => {
                processNextChunk();
            }, 0);
        }
    }, [paginationState.isActive, paginationState.currentChunk, paginationState.totalChunks, processNextChunk]);

    return {
        paginationState,
        setPaginationState,
        currentBatch,
        setCurrentBatch,
        chunkHistory,
        setChunkHistory,
        fileChunks,
        setFileChunks,
        startPaginatedProcessing,
        stopPaginatedProcessing,
        processNextChunk,
        handleChunkCompletion
    };
};