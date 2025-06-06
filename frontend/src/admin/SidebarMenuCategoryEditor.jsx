import { useRef as DropRef } from 'react';
import { CSSProperties } from 'react';
import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, List, ListItem, ListItemText, IconButton, Typography, Tabs, Tab, CircularProgress, Paper, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Snackbar, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import GenericFileEditor from '../components/GenericFileEditor';
import { useTranslate } from 'react-admin';

const api = async (url, method = 'GET', body) => {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
};

function BulkCreateDialog({ open, onClose, onBulkCreate, label, example, dialogTitle }) {
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0); // 0: Paste, 1: File, 2: URL
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const theme = useTheme();
  const dropRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files ? e.target.files[0] : e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setError('File must be a .json file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        JSON.parse(evt.target.result);
        setJson(evt.target.result);
        setError('');
      } catch (e) {
        setError('Invalid JSON in file');
      }
    };
    reader.readAsTextranslate(file);
  };

  const handleDrop = (e) => {
    e.preventDefaultranslate();
    setDragOver(false);
    handleFile(e);
  };

  const handleDragOver = (e) => {
    e.preventDefaultranslate();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefaultranslate();
    setDragOver(false);
  };

  const handleFetchUrl = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch URL');
      const text = await res.textranslate();
      JSON.parse(text);
      setJson(text);
      setError('');
    } catch (e) {
      setError('Could not fetch or parse JSON from URL');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{
        sx: theme.palette ? {
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderRadius: 3,
          boxShadow: 8,
        } : {}
      }}
    >
      <DialogTitle sx={theme.palette ? { background: theme.palette.primary.main, color: theme.palette.primary.contrastText, fontWeight: 600, letterSpacing: 0.5 } : {}}>
        {dialogTitle || `Upload ${label} from JSON`}
      </DialogTitle>
      <DialogContent
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        sx={dragOver ? { border: '2px dashed #51247A', background: '#f3eaff' } : {}}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Paste JSON" />
          <Tab label="Upload File" />
          <Tab label="From URL" />
        </Tabs>
        <Box sx={{ mb: 2, fontWeight: 500, color: '#51247A' }}>
          Drag and drop a .json file anywhere in this dialog to upload
        </Box>
        {tab === 0 && (
          <>
            <Box sx={{ mb: 2 }}>
              Paste a JSON array of {label.toLowerCase()} below. Example:
              <pre style={{ background: theme.palette ? theme.palette.mode === 'dark' ? '#23202b' : '#f6f6f6' : '#f6f6f6', padding: 8, borderRadius: 4, fontSize: 13 }}>{example}</pre>
            </Box>
            <TextField
              label="JSON Array"
              multiline
              minRows={6}
              fullWidth
              value={json}
              onChange={e => setJson(e.target.value)}
              error={!!error}
              helperText={error || ''}
            />
          </>
        )}
        {tab === 1 && (
          <Box sx={{ mb: 2 }}>
            <Button variant="outlined" component="label">
              Select JSON File
              <input type="file" accept="application/json" hidden onChange={handleFile} />
            </Button>
            {error && <Box sx={{ color: 'error.main', mt: 1 }}>{error}</Box>}
            <TextField
              label="File Contents"
              multiline
              minRows={6}
              fullWidth
              value={json}
              onChange={e => setJson(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        )}
        {tab === 2 && (
          <Box sx={{ mb: 2 }}>
            <TextField
              label="JSON URL"
              fullWidth
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/data.json"
              sx={{ mb: 2 }}
            />
            <Button variant="outlined" onClick={handleFetchUrl} disabled={loading || !url} sx={{ mb: 2 }}>
              {loading ? 'Loading...' : 'Fetch JSON'}
            </Button>
            {error && <Box sx={{ color: 'error.main', mt: 1 }}>{error}</Box>}
            <TextField
              label="Fetched JSON"
              multiline
              minRows={6}
              fullWidth
              value={json}
              onChange={e => setJson(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={theme.palette ? { background: theme.palette.grey[theme.palette.mode === 'dark' ? 900 : 100] } : {}}>
        <Button onClick={onClose} color="secondary" variant="outlined">Cancel</Button>
        <Button onClick={() => {
          try {
            const arr = JSON.parse(json);
            if (!Array.isArray(arr)) throw new Error('Must be a JSON array');
            setError('');
            onBulkCreate(arr);
            setJson('');
            setError('');
            setUrl('');
            setTab(0);
          } catch (e) {
            setError(e.message);
          }
        }} variant="contained" color="primary">Upload</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SidebarMenuCategoryEditor() {
  const translate = useTranslate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [selected, setSelected] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const catsResp = await api('/api/blocks/sidebar_menu_categories');
    setCategories(Array.isArray(catsResp) ? catsResp : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (selected) await api(`/api/blocks/sidebar_menu_categories/${selected.id}`, 'PUT', form);
    else await api('/api/blocks/sidebar_menu_categories', 'POST', form);
    setOpen(false); setForm({ name: '', description: '' }); setSelected(null); load();
  };
  const handleDelete = async id => { await api(`/api/blocks/sidebar_menu_categories/${id}`, 'DELETE'); load(); };
  const handleEdit = cat => { setSelected(cat); setForm(cat); setOpen(true); };

  const downloadJsonFile = (data, filename) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElementranslate('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkCreate = async (arr) => {
    setBulkOpen(false);
    let success = 0, fail = 0;
    for (const item of arr) {
      try {
        await api('/api/blocks/sidebar_menu_categories', 'POST', item);
        success++;
      } catch {
        fail++;
      }
    }
    setSnackbar({ open: true, message: `Created ${success} categories${fail ? ', failed ' + fail : ''}`, severity: fail ? 'warning' : 'success' });
    load();
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelected(categories.map(cat => cat.id));
    else setSelected([]);
  };
  const handleSelect = (id) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };
  const handleDeleteSelected = async () => {
    setConfirmDeleteOpen(false);
    let success = 0, fail = 0;
    for (const id of selected) {
      try {
        await api(`/api/blocks/sidebar_menu_categories/${id}`, 'DELETE');
        success++;
      } catch {
        fail++;
      }
    }
    setSnackbar({ open: true, message: `Deleted ${success} categories${fail ? ', failed ' + fail : ''}`, severity: fail ? 'warning' : 'success' });
    setSelected([]);
    load();
  };

  const categoryColumns = [
    { field: 'id', title: 'ID' },
    { field: 'name', title: translate('table.column.name') },
    { field: 'description', title: translate('table.column.description') },
  ];

  return (
    <Box>
      <GenericFileEditor 
        data={categories}
        columns={categoryColumns}
      />
    </Box>
  );
}