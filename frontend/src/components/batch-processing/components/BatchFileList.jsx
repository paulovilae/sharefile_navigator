/**
 * Component to display selected files and processing summary
 */
import React from 'react';
import { Box, Typography, Chip, Paper } from '@mui/material';
import { PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { getSelectionSummary } from '../utils/fileUtils';
import { UI_CONSTANTS } from '../constants/batchConstants';

const BatchFileList = ({
    selectedFiles = [],
    processableFiles = [],
    title = "Selection Summary",
    showDetails = true,
    maxDisplayedFiles = UI_CONSTANTS.MAX_DISPLAYED_FILES
}) => {
    const summary = getSelectionSummary(selectedFiles);

    if (selectedFiles.length === 0) {
        return null;
    }

    return (
        <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
                {title}:
            </Typography>
            
            {showDetails && (
                <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Selected: {summary.files} files, {summary.folders} folders
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        PDF files found: {processableFiles.length}
                    </Typography>
                </Box>
            )}
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {processableFiles.slice(0, maxDisplayedFiles).map((file, index) => (
                    <Chip
                        key={index}
                        label={file.name}
                        size="small"
                        variant="outlined"
                        icon={<PdfIcon />}
                        sx={{
                            maxWidth: '200px',
                            '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }
                        }}
                    />
                ))}
                {processableFiles.length > maxDisplayedFiles && (
                    <Chip
                        label={`+${processableFiles.length - maxDisplayedFiles} more PDF files`}
                        size="small"
                        variant="outlined"
                        color="primary"
                    />
                )}
            </Box>
        </Paper>
    );
};

export default BatchFileList;