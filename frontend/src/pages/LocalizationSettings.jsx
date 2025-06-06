import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Tooltip,
  TablePagination,
  InputAdornment,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Language as LanguageIcon,
  Translate as TranslateIcon
} from '@mui/icons-material';
import { useTranslate } from 'react-admin';

const api = async (url, method = 'GET', body) => {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  
  return res.json();
};

const LocalizationSettings = () => {
  const translate = useTranslate();
  const [localizations, setLocalizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ language: 'en', key: '', value: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tab, setTab] = useState(0);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
  ];

  useEffect(() => {
    loadLocalizations();
  }, []);

  const loadLocalizations = async () => {
    try {
      setLoading(true);
      const data = await api('/api/settings/localizations');
      setLocalizations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading localizations:', err);
      setError(translate('localization.load_failed') || 'Failed to load localizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        await api(`/api/settings/localizations/${editingItem.id}`, 'PUT', form);
        setSnackbar({ open: true, message: translate('localization.updated_success'), severity: 'success' });
      } else {
        await api('/api/settings/localization', 'POST', form);
        setSnackbar({ open: true, message: translate('localization.created_success'), severity: 'success' });
      }
      setOpen(false);
      setForm({ language: 'en', key: '', value: '' });
      setEditingItem(null);
      loadLocalizations();
    } catch (err) {
      console.error('Error saving localization:', err);
      setSnackbar({ open: true, message: translate('localization.save_failed'), severity: 'error' });
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({ language: item.language, key: item.key, value: item.value });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(translate('localization.delete_confirm'))) return;
    
    try {
      await api(`/api/settings/localizations/${id}`, 'DELETE');
      setSnackbar({ open: true, message: translate('localization.deleted_success'), severity: 'success' });
      loadLocalizations();
    } catch (err) {
      console.error('Error deleting localization:', err);
      setSnackbar({ open: true, message: translate('localization.delete_failed'), severity: 'error' });
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(localizations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElementranslate('a');
    link.href = url;
    link.download = 'localizations.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (!Array.isArray(importedData)) {
          throw new Error('Invalid file format');
        }

        for (const item of importedData) {
          if (item.language && item.key && item.value) {
            await api('/api/settings/localization', 'POST', {
              language: item.language,
              key: item.key,
              value: item.value
            });
          }
        }
        
        setSnackbar({ open: true, message: translate('localization.imported_success'), severity: 'success' });
        loadLocalizations();
      } catch (err) {
        console.error('Error importing localizations:', err);
        setSnackbar({ open: true, message: translate('localization.import_failed'), severity: 'error' });
      }
    };
    reader.readAsTextranslate(file);
    event.target.value = '';
  };

  const filteredLocalizations = localizations.filter(item => {
    const matchesSearch = !searchTerm || 
      item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.value.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = languageFilter === 'all' || item.language === languageFilter;
    return matchesSearch && matchesLanguage;
  });

  const paginatedLocalizations = filteredLocalizations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getLanguageStats = () => {
    const stats = {};
    localizations.forEach(item => {
      stats[item.language] = (stats[item.language] || 0) + 1;
    });
    return stats;
  };

  const getLanguageName = (code) => {
    const lang = languages.find(l => l.code === code);
    return lang ? `${lang.flag} ${lang.name}` : code.toUpperCase();
  };

  const renderOverview = () => {
    const stats = getLanguageStats();
    const totalKeys = new Set(localizations.map(l => l.key)).size;
    
    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <LanguageIcon sx={{ mr: 1 }} />
                  {translate('localization.language_stats')}
                </Typography>
                {Object.entries(stats).map(([lang, count]) => (
                  <Box key={lang} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{getLanguageName(lang)}</Typography>
                    <Chip label={count} size="small" color="primary" />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <TranslateIcon sx={{ mr: 1 }} />
                  {translate('localization.translation_coverage')}
                </Typography>
                <Typography variant="h4" color="primary" gutterBottom>
                  {totalKeys}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {translate('localization.unique_keys')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {translate('localization.total_entries')}: {localizations.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderTable = () => (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField
          placeholder={translate('localization.search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1 }}
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{translate('form.label.language')}</InputLabel>
          <Select
            value={languageFilter}
            label={translate('form.label.language')}
            onChange={(e) => setLanguageFilter(e.target.value)}
          >
            <MenuItem value="all">{translate('localization.all_languages')}</MenuItem>
            {languages.map(lang => (
              <MenuItem key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingItem(null);
            setForm({ language: 'en', key: '', value: '' });
            setOpen(true);
          }}
        >
          {translate('common.add')}
        </Button>

        <Tooltip title={translate('localization.export_tooltip')}>
          <IconButton onClick={handleExport}>
            <DownloadIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={translate('localization.import_tooltip')}>
          <IconButton component="label">
            <UploadIcon />
            <input
              type="file"
              accept=".json"
              hidden
              onChange={handleImport}
            />
          </IconButton>
        </Tooltip>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{translate('form.label.language')}</TableCell>
              <TableCell>{translate('table.column.key')}</TableCell>
              <TableCell>{translate('table.column.value')}</TableCell>
              <TableCell align="right">{translate('table.column.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLocalizations.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Chip 
                    label={getLanguageName(item.language)} 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {item.key}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {item.value}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={translate('common.edit')}>
                    <IconButton size="small" onClick={() => handleEditranslate(item)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={translate('common.delete')}>
                    <IconButton size="small" onClick={() => handleDelete(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredLocalizations.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>{translate('localization.loading')}</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <LanguageIcon sx={{ mr: 2 }} />
        {translate('localization.title')}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {translate('localization.description')}
      </Typography>

      <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab label={translate('localization.tab.overview')} />
        <Tab label={translate('localization.tab.manage')} />
      </Tabs>

      {tab === 0 && renderOverview()}
      {tab === 1 && renderTable()}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? translate('localization.edit_dialog_title') : translate('localization.add_dialog_title')}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>{translate('form.label.language')}</InputLabel>
            <Select
              value={form.language}
              label={translate('form.label.language')}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              {languages.map(lang => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label={translate('table.column.key')}
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            fullWidth
            placeholder={translate('localization.key_placeholder')}
            helperText={translate('localization.key_helper')}
          />
          
          <TextField
            label={translate('table.column.value')}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            fullWidth
            multiline
            rows={3}
            placeholder={translate('localization.value_placeholder')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{translate('common.cancel')}</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={!form.key || !form.value || !form.language}
          >
            {editingItem ? translate('common.update') : translate('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LocalizationSettings;