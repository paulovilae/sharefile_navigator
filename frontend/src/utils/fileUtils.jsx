import React from 'react';
import FolderIcon from '@mui/icons-material/Folder';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

// File icon helper
export function getFileIcon(filename, iconColor) {
    const ext = filename.split('.').pop().toLowerCase();
    const colorStyle = iconColor ? { color: iconColor + ' !important' } : {};
    if (["pdf"].includes(ext)) return <PictureAsPdfIcon sx={{ ...colorStyle, fontSize: 20, mr: 1 }} />;
    if (["doc", "docx"].includes(ext)) return <DescriptionIcon sx={{ ...colorStyle, fontSize: 20, mr: 1 }} />;
    if (["xls", "xlsx", "csv"].includes(ext)) return <TableChartIcon sx={{ ...colorStyle, fontSize: 20, mr: 1 }} />;
    if (["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext)) return <ImageIcon sx={{ ...colorStyle, fontSize: 20, mr: 1 }} />;
    if (["folder"].includes(ext)) return <FolderIcon sx={{ ...colorStyle, fontSize: 20, mr: 1 }} />; // Adjusted folder icon size for consistency
    return <InsertDriveFileIcon sx={{ ...colorStyle, fontSize: 20, mr: 1 }} />;
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