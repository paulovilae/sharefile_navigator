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

// Date formatter - compact version with full date on hover
export function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d)) return date; // Return original if not a valid date
    return d.toLocaleDateString(); // Just the date part, more compact
}

// Full date formatter for tooltips
export function formatFullDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d)) return date; // Return original if not a valid date
    return d.toLocaleString(); // Full date and time
}

// Name formatter - truncate long names
export function formatName(name, maxLength = 15) {
    if (!name) return '-';
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength)}...`;
}

// Extract display name from email or full name
export function formatUserName(userInfo) {
    if (!userInfo) return '-';
    
    // If it's a string, try to extract name from email format
    if (typeof userInfo === 'string') {
        // Check if it's an email format
        if (userInfo.includes('@')) {
            const namePart = userInfo.split('@')[0];
            // Convert dot notation to space and capitalize
            return namePart.split('.').map(part =>
                part.charAt(0).toUpperCase() + part.slice(1)
            ).join(' ');
        }
        return formatName(userInfo);
    }
    
    // If it's an object with displayName or name property
    if (userInfo.displayName) {
        return formatName(userInfo.displayName);
    }
    
    if (userInfo.name) {
        return formatName(userInfo.name);
    }
    
    // Fallback to email if available
    if (userInfo.email) {
        return formatUserName(userInfo.email);
    }
    
    return '-';
}