// Enhanced search utilities for image search functionality
export const searchImages = async (query, filters = {}, limit = 20, offset = 0) => {
    const searchParams = {
        query: query.trim(),
        limit,
        offset,
        search_type: 'image_search',
        ...filters
    };

    const response = await fetch('/api/search/images', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: "Unknown error during image search." }));
        throw new Error(errorBody.detail || `HTTP error ${response.status}`);
    }

    return response.json();
};

// Get image URL for display
export const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Handle JSON array format
    let paths;
    try {
        paths = typeof imagePath === 'string' ? JSON.parse(imagePath) : imagePath;
    } catch {
        paths = [imagePath];
    }
    
    if (Array.isArray(paths) && paths.length > 0) {
        // Convert Windows path to URL-friendly format
        const path = paths[0].replace(/\\/g, '/');
        return `/api/images/serve?path=${encodeURIComponent(path)}`;
    }
    
    return null;
};

// Advanced search with filters
export const advancedImageSearch = async (searchParams) => {
    const response = await fetch('/api/search/images/advanced', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: "Unknown error during advanced search." }));
        throw new Error(errorBody.detail || `HTTP error ${response.status}`);
    }

    return response.json();
};

// Get search suggestions based on existing text content
export const getSearchSuggestions = async (partialQuery) => {
    if (!partialQuery || partialQuery.length < 2) return [];
    
    const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(partialQuery)}`);
    
    if (!response.ok) {
        return [];
    }
    
    const data = await response.json();
    return data.suggestions || [];
};

// Highlight search terms in text
export const highlightSearchTerms = (text, searchTerms) => {
    if (!text || !searchTerms) return text;
    
    const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
    let highlightedText = text;
    
    terms.forEach(term => {
        if (term.trim()) {
            const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
        }
    });
    
    return highlightedText;
};

// Extract relevant text snippet around search terms
export const extractRelevantSnippet = (text, searchTerms, maxLength = 200) => {
    if (!text || !searchTerms) return '';
    
    const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
    const lowerText = text.toLowerCase();
    
    // Find the first occurrence of any search term
    let firstIndex = -1;
    let foundTerm = '';
    
    for (const term of terms) {
        const index = lowerText.indexOf(term.toLowerCase());
        if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
            firstIndex = index;
            foundTerm = term;
        }
    }
    
    if (firstIndex === -1) {
        return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }
    
    // Extract snippet around the found term
    const start = Math.max(0, firstIndex - maxLength / 2);
    const end = Math.min(text.length, start + maxLength);
    
    let snippet = text.substring(start, end);
    
    // Add ellipsis if needed
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return snippet;
};