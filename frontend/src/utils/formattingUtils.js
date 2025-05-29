// Smart file size formatter
export function formatFileSize(bytes) {
    if (bytes === 0 || bytes == null) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let value = bytes;
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Date formatter
export function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d)) return date; // Return original if not a valid date
    return d.toLocaleString();
}