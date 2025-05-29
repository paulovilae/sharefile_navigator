// Utility to fetch OCR status for multiple files
export const fetchOcrStatuses = async (fileIds) => {
    const results = {};
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return results;
    }

    await Promise.all(fileIds.map(async (id) => {
        try {
            const response = await fetch(`/api/ocr/status?file_id=${encodeURIComponent(id)}`);
            if (response.ok) {
                const data = await response.json();
                results[id] = data;
            } else {
                console.error(`Failed to fetch OCR status for file_id ${id}: ${response.status}`);
                results[id] = { status: 'error', message: `Failed to fetch status: ${response.status}` };
            }
        } catch (error) {
            console.error(`Error fetching OCR status for file_id ${id}:`, error);
            results[id] = { status: 'error', message: 'Network error or server issue fetching status.' };
        }
    }));
    return results;
};

// Add other API utility functions here as needed, for example:
// export const fetchSharePointLibraries = async () => { ... };
// export const fetchSharePointFolders = async (driveId, parentId) => { ... };
// export const fetchSharePointFiles = async (driveId, parentId) => { ... };