import React from 'react';
import FolderIcon from '@mui/icons-material/Folder';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

// File icon helper with proper CHRISTUS theme colors
export function getFileIcon(filename, iconColor) {
    const ext = filename.split('.').pop().toLowerCase();
    
    // Define colors based on file type using CHRISTUS theme palette
    const getIconColor = (fileType) => {
        if (iconColor) return iconColor;
        
        switch (fileType) {
            case 'pdf':
                return '#6D247A'; // CHRISTUS purple for PDFs
            case 'doc':
                return '#3F6A98'; // CHRISTUS blue for documents
            case 'excel':
                return '#4D216D'; // CHRISTUS dark purple for spreadsheets
            case 'image':
                return '#B598C1'; // CHRISTUS light purple for images
            case 'folder':
                return '#6D247A'; // CHRISTUS purple for folders
            default:
                return '#636A6B'; // CHRISTUS gray for default
        }
    };
    
    const iconStyle = { fontSize: 20, mr: 1 };
    
    if (["pdf"].includes(ext)) {
        return <PictureAsPdfIcon sx={{ ...iconStyle, color: getIconColor('pdf') }} />;
    }
    if (["doc", "docx"].includes(ext)) {
        return <DescriptionIcon sx={{ ...iconStyle, color: getIconColor('doc') }} />;
    }
    if (["xls", "xlsx", "csv"].includes(ext)) {
        return <TableChartIcon sx={{ ...iconStyle, color: getIconColor('excel') }} />;
    }
    if (["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext)) {
        return <ImageIcon sx={{ ...iconStyle, color: getIconColor('image') }} />;
    }
    if (["folder"].includes(ext)) {
        return <FolderIcon sx={{ ...iconStyle, color: getIconColor('folder') }} />;
    }
    return <InsertDriveFileIcon sx={{ ...iconStyle, color: getIconColor('default') }} />;
}

// Helper to check if a file is previewable
export const isPreviewable = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return [
        'pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg',
        'txt', 'csv', 'json', 'log', 'md', 'xml', 'html',
        'js', 'ts', 'py', 'java', 'css'
    ].includes(ext);
};

// Helper to check if a file is digitizable (OCR)
export const isDigitizable = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return [
        'pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff', 'tif'
    ].includes(ext);
};