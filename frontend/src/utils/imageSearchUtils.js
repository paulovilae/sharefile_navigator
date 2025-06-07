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
    
    // Sort terms by length (longest first) to avoid nested highlights
    const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
    
    sortedTerms.forEach(term => {
        if (term.trim()) {
            // Escape special regex characters and create word boundary-aware regex when possible
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // For terms that are likely complete words, use word boundaries
            let regex;
            if (term.length > 3 && /^[a-zA-Z0-9]+$/.test(term)) {
                regex = new RegExp(`\\b(${escapedTerm})\\b`, 'gi');
            } else {
                regex = new RegExp(`(${escapedTerm})`, 'gi');
            }
            
            highlightedText = highlightedText.replace(regex, '<mark><strong>$1</strong></mark>');
        }
    });
    
    return highlightedText;
};

// Extract relevant text snippet around search terms
export const extractRelevantSnippet = (text, searchTerms, maxLength = 300) => {
    if (!text || !searchTerms) return '';
    
    const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
    const lowerText = text.toLowerCase();
    
    // Find all occurrences of search terms
    const occurrences = [];
    
    for (const term of terms) {
        if (!term.trim()) continue;
        
        const termLower = term.toLowerCase();
        let pos = lowerText.indexOf(termLower);
        
        while (pos !== -1) {
            occurrences.push({
                term,
                index: pos,
                length: term.length
            });
            pos = lowerText.indexOf(termLower, pos + 1);
        }
    }
    
    // Sort occurrences by position
    occurrences.sort((a, b) => a.index - b.index);
    
    // If no occurrences found, return beginning of text
    if (occurrences.length === 0) {
        return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }
    
    // Find the best occurrence to center the snippet around
    // Prioritize occurrences that have other occurrences nearby to show multiple matches
    let bestOccurrence = occurrences[0];
    let bestScore = 0;
    
    for (let i = 0; i < occurrences.length; i++) {
        const current = occurrences[i];
        let score = 0;
        
        // Count nearby occurrences within half the maxLength
        for (let j = 0; j < occurrences.length; j++) {
            if (i !== j) {
                const distance = Math.abs(current.index - occurrences[j].index);
                if (distance < maxLength / 2) {
                    score += 1;
                }
            }
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestOccurrence = current;
        }
    }
    
    // Extract snippet around the best occurrence
    const center = bestOccurrence.index + bestOccurrence.length / 2;
    const start = Math.max(0, Math.floor(center - maxLength / 2));
    const end = Math.min(text.length, Math.floor(start + maxLength));
    
    let snippet = text.substring(start, end);
    
    // Add ellipsis if needed
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return snippet;
};