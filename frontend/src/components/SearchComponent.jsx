import React, { useState, useCallback } from 'react';
import { Box, TextField, Button, Typography, List, ListItem, ListItemText, Paper, CircularProgress, Alert } from '@mui/material';
import { searchFiles } from '../utils/apiUtils'; // Assuming apiUtils.js is in ../utils

const SearchComponent = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalHits, setTotalHits] = useState(0);
    const [offset, setOffset] = useState(0);
    const limit = 10; // Number of results per page

    const handleSearch = useCallback(async (newSearch = false) => {
        if (!query.trim()) {
            setResults([]);
            setTotalHits(0);
            setError(null);
            return;
        }
        setLoading(true);
        setError(null);
        if (newSearch) {
            setOffset(0); // Reset offset for a new search
        }

        try {
            const searchOffset = newSearch ? 0 : offset;
            const data = await searchFiles(query, limit, searchOffset);
            setResults(newSearch ? data.hits : prevResults => [...prevResults, ...data.hits]);
            setTotalHits(data.total_hits);
            if (!newSearch) {
                setOffset(prevOffset => prevOffset + data.hits.length);
            } else {
                setOffset(data.hits.length);
            }
        } catch (err) {
            console.error("Search failed:", err);
            setError(err.message || "Failed to fetch search results.");
            setResults(newSearch ? [] : results); // Keep old results on pagination error if not a new search
            if (newSearch) setTotalHits(0);
        } finally {
            setLoading(false);
        }
    }, [query, offset, limit, results]); // Added results to dependency array for pagination error case

    const handleQueryChange = (event) => {
        setQuery(event.target.value);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        handleSearch(true); // True for new search
    };

    const handleLoadMore = () => {
        handleSearch(false); // False for pagination
    };

    return (
        <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>Search OCR Content</Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                    fullWidth
                    label="Search Query"
                    variant="outlined"
                    value={query}
                    onChange={handleQueryChange}
                    size="small"
                />
                <Button type="submit" variant="contained" disabled={loading || !query.trim()}>
                    {loading && offset === 0 ? <CircularProgress size={24} /> : "Search"}
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {totalHits > 0 && <Typography variant="subtitle1" sx={{mb:1}}>{totalHits} file(s) found.</Typography>}
            
            {results.length > 0 && (
                <List dense>
                    {results.map((hit) => (
                        <ListItem key={hit.id || hit.file_id} divider>
                            <ListItemText
                                primary={`File ID: ${hit.file_id}`}
                                secondary={
                                    <Typography 
                                        variant="body2" 
                                        color="text.secondary"
                                        dangerouslySetInnerHTML={{ __html: hit.snippet || "No snippet available." }}
                                    />
                                }
                            />
                        </ListItem>
                    ))}
                </List>
            )}
            
            {results.length > 0 && results.length < totalHits && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Button onClick={handleLoadMore} variant="outlined" disabled={loading}>
                        {loading && offset > 0 ? <CircularProgress size={24} /> : "Load More"}
                    </Button>
                </Box>
            )}

            {!loading && query.trim() && results.length === 0 && totalHits === 0 && !error && (
                 <Typography sx={{mt: 2, textAlign: 'center'}}>No results found for "{query}".</Typography>
            )}
        </Paper>
    );
};

export default SearchComponent;