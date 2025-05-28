import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Tooltip, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar, Alert, Toolbar, Typography, TableSortLabel, TablePagination, InputAdornment, Tabs, Tab } from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { alpha, useTheme } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import GenericFileEditor from '../components/GenericFileEditor';
import * as Icons from '@mui/icons-material'; // Import all icons
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  HelpOutline as HelpOutlineIcon // Import a fallback icon
} from '@mui/icons-material';

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
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFetchUrl = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch URL');
      const text = await res.text();
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

export default function SidebarMenuItemEditor() {
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: '', icon: '', page_ref: '', category_id: '', order: 0, enabled: true });
  const [selected, setSelected] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const theme = useTheme();

  const load = async () => {
    console.log('Loading menu items...');
    const menusResp = await api('/api/blocks/sidebar_menus');
    console.log('API response:', menusResp);
    const catsResp = await api('/api/blocks/sidebar_menu_categories');
    setMenus(
      (Array.isArray(menusResp) ? menusResp : []).map(m => ({
        id: m.id ?? '',
        icon: m.icon ?? '',
        label: m.label ?? '',
        page_ref: m.page_ref ?? '',
        category_id: m.category_id ?? '',
        order: m.order ?? 0, // Revert to original type
        enabled: m.enabled ?? true, // Revert to original type
        ...m,
      }))
    );
    console.log('Menus state updated:', menus);
    setCategories(Array.isArray(catsResp) ? catsResp : []);
  };
  useEffect(() => {
    console.log('useEffect triggered');
    load();
  }, []);

  const handleReorderMenus = async (reorderedMenus) => {
    console.log('Reordering menus:', reorderedMenus);
    try {
      for (let i = 0; i < reorderedMenus.length; i++) {
        const menu = reorderedMenus[i];
        // Update the order based on the new index
        const updatedMenu = { ...menu, order: i };
        // Call the backend API to update the menu item's order
        await api(`/api/blocks/sidebar_menus/${menu.id}`, 'PUT', updatedMenu);
      }
      // After successfully updating all items, reload the menus to reflect changes
      load();
      setSnackbar({ open: true, message: 'Menu order updated successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error reordering menus:', error);
      setSnackbar({ open: true, message: 'Failed to update menu order.', severity: 'error' });
    }
  };

  // Example Material Icon names (can be expanded)
  const iconOptions = [
    'Folder',
    'Category',
    'Settings',
    'Workflow',
    'Home',
    'Dashboard',
    'List',
    'Edit',
    'Delete',
    'Add',
  ];

  const menuItemColumns = [
    { field: 'id', title: 'ID' },
    {
      field: 'icon',
      title: 'Icon',
      render: (row) => {
        const IconComponent = Icons[row.icon];
        // Check if IconComponent is a function before rendering
        return typeof IconComponent === 'function' ? <IconComponent /> : <HelpOutlineIcon />; // Render icon or fallback
      },
      dialogRender: ({ value, onChange, label, name }) => (
        <FormControl fullWidth margin="dense">
          <InputLabel>{label}</InputLabel>
          <Select
            name={name}
            value={value}
            label={label}
            onChange={(e) => onChange(e.target.value)}
          >
            {iconOptions.map((iconName) => {
              const IconComponent = Icons[iconName];
              return (
                <MenuItem key={iconName} value={iconName}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {typeof IconComponent === 'function' ? <IconComponent /> : <HelpOutlineIcon />}
                    <Typography sx={{ ml: 1 }}>{iconName}</Typography>
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      )
    }, // Add the Icon column definition and render function
    { field: 'label', title: 'Label' },
    { field: 'page_ref', title: 'Page Ref' },
    { field: 'category_id', title: 'Category' },
    { field: 'enabled', title: 'Enabled', render: (row) => <Checkbox checked={row.enabled} /> }, // Correct mapping and render as Checkbox
    { field: 'order', title: 'Order', hidden: true, dialogVisible: false },   // Correct mapping and hide by default, hide in dialog
  ];

  const handleAddRow = (newRow) => {
    console.log('handleAddRow', newRow);
    // Implement your add row logic here
  };

  const handleRemoveRow = (rowId) => {
    console.log('handleRemoveRow', rowId);
    // Implement your remove row logic here
  };

  const handleUpdateRow = (updatedRow) => {
    console.log('handleUpdateRow', updatedRow);
    // Implement your update row logic here
  };

  const handleMenuChange = (updatedData) => {
    console.log('SidebarMenuItemEditor: handleMenuChange', updatedData);
  };

  const memoizedMenus = useMemo(() => {
    console.log('SidebarMenuItemEditor: useMemo menus', menus);
    return menus;
  }, [menus]);

  return (
    <Box>
      {console.log("menus:", menus)}
      {console.log("SidebarMenuItemEditor: data prop:", memoizedMenus)}
      {console.log("SidebarMenuItemEditor: columns prop:", menuItemColumns)}
      {memoizedMenus && memoizedMenus.length > 0 ? (
        <GenericFileEditor
          data={memoizedMenus}
          columns={menuItemColumns}
          onAddRow={handleAddRow}
          onRemoveRow={handleRemoveRow}
          onUpdateRow={handleUpdateRow}
          onReorder={handleReorderMenus} // Pass the reorder handler
        />
      ) : (
        <Typography variant="body1">Loading menu items...</Typography>
      )}
       <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}