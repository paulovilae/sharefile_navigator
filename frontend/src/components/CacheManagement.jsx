import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert,
    CircularProgress,
    Divider,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    LinearProgress
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Delete as DeleteIcon,
    Storage as StorageIcon,
    Memory as MemoryIcon,
    Cloud as CloudIcon,
    Info as InfoIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import sharePointCache from '../utils/cacheUtils';
import { useTranslate } from 'react-admin';

const CacheManagement = () => {
    const translate = useTranslate();
    const [backendStats, setBackendStats] = useState(null);
    const [frontendStats, setFrontendStats] = useState(null);
    const [localStorageStats, setLocalStorageStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clearDialog, setClearDialog] = useState({ open: false, type: '', title: '' });

    // Fetch backend cache statistics
    const fetchBackendStats = async () => {
        try {
            const response = await fetch('/api/cache/stats');
            if (!response.ok) throw new Error('Failed to fetch backend cache stats');
            const data = await response.json();
            setBackendStats(data.data);
        } catch (err) {
            console.error('Error fetching backend cache stats:', err);
            setError('Failed to fetch backend cache statistics');
        }
    };

    // Get frontend cache statistics
    const getFrontendStats = () => {
        const stats = sharePointCache.getStats();
        const cacheEntries = [];
        
        // Get detailed cache entries
        for (const [key, entry] of sharePointCache.cache.entries()) {
            const isExpired = Date.now() > entry.expiresAt;
            const ageMs = Date.now() - entry.createdAt;
            const ttlMs = entry.expiresAt - entry.createdAt;
            
            cacheEntries.push({
                key,
                type: key.split('|')[0],
                age: formatDuration(ageMs),
                ttl: formatDuration(ttlMs),
                expired: isExpired,
                size: JSON.stringify(entry.data).length
            });
        }

        setFrontendStats({
            ...stats,
            entries: cacheEntries
        });
    };

    // Get localStorage statistics
    const getLocalStorageStats = () => {
        const keys = Object.keys(localStorage);
        let totalSize = 0;
        const entries = [];

        keys.forEach(key => {
            const value = localStorage.getItem(key);
            const size = new Blob([value]).size;
            totalSize += size;
            
            entries.push({
                key,
                size,
                type: getLocalStorageType(key),
                value: value.length > 100 ? value.substring(0, 100) + '...' : value
            });
        });

        setLocalStorageStats({
            totalKeys: keys.length,
            totalSize,
            entries: entries.sort((a, b) => b.size - a.size)
        });
    };

    // Helper function to categorize localStorage keys
    const getLocalStorageType = (key) => {
        if (key.includes('theme')) return 'Theme';
        if (key.includes('Library') || key.includes('Folder') || key.includes('Items')) return 'App State';
        if (key.includes('Cache')) return 'Legacy Cache';
        return 'Other';
    };

    // Format duration in human readable format
    const formatDuration = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    // Format bytes in human readable format
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Clear cache functions
    const clearBackendCache = async (type = 'all') => {
        try {
            const response = await fetch('/api/cache/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cache_type: type })
            });
            if (!response.ok) throw new Error('Failed to clear backend cache');
            await fetchBackendStats();
        } catch (err) {
            console.error('Error clearing backend cache:', err);
            setError('Failed to clear backend cache');
        }
    };

    const clearFrontendCache = () => {
        sharePointCache.clear();
        getFrontendStats();
    };

    const clearLocalStorage = (key = null) => {
        if (key) {
            localStorage.removeItem(key);
        } else {
            localStorage.clear();
        }
        getLocalStorageStats();
    };

    // Load all statistics
    const loadAllStats = async () => {
        setLoading(true);
        setError(null);
        try {
            await fetchBackendStats();
            getFrontendStats();
            getLocalStorageStats();
        } catch (err) {
            setError('Failed to load cache statistics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllStats();
    }, []);

    const handleClearConfirm = async () => {
        const { type } = clearDialog;
        
        switch (type) {
            case 'backend':
                await clearBackendCache();
                break;
            case 'frontend':
                clearFrontendCache();
                break;
            case 'localStorage':
                clearLocalStorage();
                break;
            default:
                break;
        }
        
        setClearDialog({ open: false, type: '', title: '' });
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    {translate('cache.management')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Use the global refresh button in the header to refresh all data and clear caches
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Backend Cache */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <CloudIcon color="primary" sx={{ mr: 1 }} />
                                <Typography variant="h6">{translate('cache.backend_cache')}</Typography>
                            </Box>
                            
                            {backendStats && (
                                <>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="textSecondary">{translate('cache.ocr_results')}</Typography>
                                            <Typography variant="h6">{backendStats.ocr_results?.size || 0}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="textSecondary">{translate('cache.sharepoint')}</Typography>
                                            <Typography variant="h6">{backendStats.sharepoint_files?.size || 0}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="textSecondary">{translate('cache.llm_scores')}</Typography>
                                            <Typography variant="h6">{backendStats.llm_scores?.size || 0}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="textSecondary">{translate('cache.file_cache')}</Typography>
                                            <Typography variant="h6">{backendStats.file_cache?.file_count || 0}</Typography>
                                        </Grid>
                                    </Grid>
                                    
                                    {backendStats.file_cache && (
                                        <Box mt={2}>
                                            <Typography variant="body2" color="textSecondary">
                                                {translate('cache.total_size')}: {formatBytes(backendStats.file_cache.total_size_bytes)}
                                            </Typography>
                                        </Box>
                                    )}
                                </>
                            )}
                            
                            <Box mt={2}>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    startIcon={<DeleteIcon />}
                                    onClick={() => setClearDialog({
                                        open: true,
                                        type: 'backend',
                                        title: translate('cache.clear_backend')
                                    })}
                                    fullWidth
                                >
                                    {translate('cache.clear_backend')}
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Frontend Cache */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <MemoryIcon color="secondary" sx={{ mr: 1 }} />
                                <Typography variant="h6">{translate('cache.frontend_cache')}</Typography>
                            </Box>
                            
                            {frontendStats && (
                                <>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="textSecondary">{translate('cache.total_entries')}</Typography>
                                            <Typography variant="h6">{frontendStats.totalEntries}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="textSecondary">{translate('cache.valid')}</Typography>
                                            <Typography variant="h6" color="success.main">{frontendStats.validEntries}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="textSecondary">{translate('cache.expired')}</Typography>
                                            <Typography variant="h6" color="warning.main">{frontendStats.expiredEntries}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="textSecondary">{translate('cache.hit_rate')}</Typography>
                                            <Typography variant="h6">{(frontendStats.hitRate * 100).toFixed(1)}%</Typography>
                                        </Grid>
                                    </Grid>
                                </>
                            )}
                            
                            <Box mt={2}>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    startIcon={<DeleteIcon />}
                                    onClick={() => setClearDialog({
                                        open: true,
                                        type: 'frontend',
                                        title: translate('cache.clear_frontend')
                                    })}
                                    fullWidth
                                >
                                    {translate('cache.clear_frontend')}
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* LocalStorage */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <StorageIcon color="info" sx={{ mr: 1 }} />
                                <Typography variant="h6">{translate('cache.local_storage')}</Typography>
                            </Box>
                            
                            {localStorageStats && (
                                <>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="textSecondary">{translate('cache.total_keys')}</Typography>
                                            <Typography variant="h6">{localStorageStats.totalKeys}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="textSecondary">{translate('cache.total_size')}</Typography>
                                            <Typography variant="h6">{formatBytes(localStorageStats.totalSize)}</Typography>
                                        </Grid>
                                    </Grid>
                                </>
                            )}
                            
                            <Box mt={2}>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    startIcon={<DeleteIcon />}
                                    onClick={() => setClearDialog({
                                        open: true,
                                        type: 'localStorage',
                                        title: translate('cache.clear_local_storage')
                                    })}
                                    fullWidth
                                >
                                    {translate('cache.clear_local_storage')}
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Frontend Cache Details */}
                {frontendStats && frontendStats.entries.length > 0 && (
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {translate('cache.entries')} - {translate('cache.frontend_cache')}
                                </Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>{translate('table.key')}</TableCell>
                                                <TableCell>{translate('table.type')}</TableCell>
                                                <TableCell>{translate('table.age')}</TableCell>
                                                <TableCell>{translate('table.ttl')}</TableCell>
                                                <TableCell>{translate('table.size')}</TableCell>
                                                <TableCell>{translate('table.status')}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {frontendStats.entries.map((entry, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{entry.key}</TableCell>
                                                    <TableCell>
                                                        <Chip label={entry.type} size="small" />
                                                    </TableCell>
                                                    <TableCell>{entry.age}</TableCell>
                                                    <TableCell>{entry.ttl}</TableCell>
                                                    <TableCell>{formatBytes(entry.size)}</TableCell>
                                                    <TableCell>
                                                        {entry.expired ? (
                                                            <Chip label="Expired" color="warning" size="small" />
                                                        ) : (
                                                            <Chip label="Valid" color="success" size="small" />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {/* LocalStorage Details */}
                {localStorageStats && localStorageStats.entries.length > 0 && (
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {translate('cache.entries')} - {translate('cache.local_storage')}
                                </Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>{translate('table.key')}</TableCell>
                                                <TableCell>{translate('table.type')}</TableCell>
                                                <TableCell>{translate('table.size')}</TableCell>
                                                <TableCell>{translate('table.value_preview')}</TableCell>
                                                <TableCell>{translate('table.actions')}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {localStorageStats.entries.map((entry, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{entry.key}</TableCell>
                                                    <TableCell>
                                                        <Chip label={entry.type} size="small" />
                                                    </TableCell>
                                                    <TableCell>{formatBytes(entry.size)}</TableCell>
                                                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {entry.value}
                                                    </TableCell>
                                                    <TableCell>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => clearLocalStorage(entry.key)}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>

            {/* Clear Confirmation Dialog */}
            <Dialog open={clearDialog.open} onClose={() => setClearDialog({ open: false, type: '', title: '' })}>
                <DialogTitle>{clearDialog.title}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {translate('dialog.confirm_clear_cache')}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setClearDialog({ open: false, type: '', title: '' })}>
                        {translate('common.cancel')}
                    </Button>
                    <Button onClick={handleClearConfirm} color="error" variant="contained">
                        {clearDialog.title}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CacheManagement;