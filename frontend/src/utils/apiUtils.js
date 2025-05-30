// Utility to fetch OCR status for multiple files
export const fetchOcrStatuses = async (fileIds) => {
    const results = {};
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return results;
    }

    await Promise.all(fileIds.map(async (id) => {
        try {
            // Updated to use path parameter as per backend changes
            const response = await fetch(`/api/ocr/status/${encodeURIComponent(id)}`);
            if (response.ok) {
                const data = await response.json();
                // The backend now returns the status directly in data.status for the specific file ID.
                // It also returns the original file_id in data.file_id.
                // We store the whole response object keyed by the original ID requested.
                results[id] = data;
            } else {
                const errorData = await response.json().catch(() => ({ detail: `Failed to fetch status: ${response.status}` }));
                console.error(`Failed to fetch OCR status for ID ${id}: ${response.status}`, errorData.detail);
                results[id] = { file_id: id, status: 'error_fetching_status', message: errorData.detail || `Failed to fetch status: ${response.status}` };
            }
        } catch (error) {
            console.error(`Error fetching OCR status for ID ${id}:`, error);
            results[id] = { file_id: id, status: 'error_network', message: 'Network error or server issue fetching status.' };
        }
    }));
    return results;
};

// Add other API utility functions here as needed, for example:
// export const fetchSharePointLibraries = async () => { ... };
// export const fetchSharePointFolders = async (driveId, parentId) => { ... };
// export const fetchSharePointFiles = async (driveId, parentId) => { ... };

export const processSharePointItem = async (itemData) => {
    // itemData should be an object like { drive_id: "...", item_id: "...", item_type: "file" | "folder" }
    const response = await fetch('/api/ocr/process_sharepoint_item', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: "Unknown error processing item." }));
        throw new Error(errorBody.detail || `HTTP error ${response.status}`);
    }
    return response.json(); // Returns { message, file_id/folder_id, status }
};
export const searchFiles = async (query, limit = 10, offset = 0) => {
    const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, limit, offset }),
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: "Unknown error during search." }));
        throw new Error(errorBody.detail || `HTTP error ${response.status}`);
    }
    return response.json(); // Returns { query, offset, limit, total_hits, hits: [...] }
};