import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, List, ListItem, ListItemText, IconButton, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Typography, Divider, Snackbar, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';

// Helper for API calls
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

export default function SidebarMenuEditor() {
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: '', icon: '', page_ref: '', category_id: '', order: 0, enabled: true });
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Load menus and categories
  const load = async () => {
    const menusResp = await api('/api/blocks/sidebar_menus');
    const catsResp = await api('/api/blocks/sidebar_menu_categories');
    console.log('menusResp', menusResp);
    console.log('catsResp', catsResp);
    setMenus(Array.isArray(menusResp) ? menusResp : []);
    setCategories(Array.isArray(catsResp) ? catsResp : []);
  };
  useEffect(() => { load(); }, []);

  // CRUD handlers
  const handleSave = async () => {
    try {
      if (selected) await api(`/api/blocks/sidebar_menus/${selected.id}`, 'PUT', form);
      else await api('/api/blocks/sidebar_menus', 'POST', form);
      setOpen(false);
      setForm({ label: '', icon: '', page_ref: '', category_id: '', order: 0, enabled: true });
      setSelected(null);
      load();
      setSnackbar({ open: true, message: 'Menu item saved successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error saving menu item:', error);
      setSnackbar({ open: true, message: 'Failed to save menu item.', severity: 'error' });
    }
  };
  
  const handleDelete = async id => {
    try {
      await api(`/api/blocks/sidebar_menus/${id}`, 'DELETE');
      load();
      setSnackbar({ open: true, message: 'Menu item deleted successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error deleting menu item:', error);
      setSnackbar({ open: true, message: 'Failed to delete menu item.', severity: 'error' });
    }
  };
  
  const handleEdit = menu => { setSelected(menu); setForm(menu); setOpen(true); };

  // Category handlers
  const handleCatSave = async () => {
    try {
      if (catForm.id) await api(`/api/blocks/sidebar_menu_categories/${catForm.id}`, 'PUT', catForm);
      else await api('/api/blocks/sidebar_menu_categories', 'POST', catForm);
      setCatOpen(false);
      setCatForm({ name: '', description: '' });
      load();
      setSnackbar({ open: true, message: 'Category saved successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error saving category:', error);
      setSnackbar({ open: true, message: 'Failed to save category.', severity: 'error' });
    }
  };
  
  const handleCatDelete = async id => {
    try {
      await api(`/api/blocks/sidebar_menu_categories/${id}`, 'DELETE');
      load();
      setSnackbar({ open: true, message: 'Category deleted successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error deleting category:', error);
      setSnackbar({ open: true, message: 'Failed to delete category.', severity: 'error' });
    }
  };
  
  const handleCatEdit = cat => { setCatForm(cat); setCatOpen(true); };

  // Import/export
  const handleExport = async () => {
    const data = await api('/api/blocks/sidebar_menus/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sidebar_menus.json'; a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async evt => {
      await fetch('/api/blocks/sidebar_menus/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: evt.target.result,
      });
      load();
    };
    reader.readAsText(file);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Sidebar Menu Editor</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setSelected(null); setForm({ label: '', icon: '', page_ref: '', category_id: '', order: 0, enabled: true }); setOpen(true); }}>Add Menu</Button>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCatOpen(true)}>Add Category</Button>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>Export JSON</Button>
        <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>Import JSON
          <input type="file" accept="application/json" hidden onChange={handleImport} />
        </Button>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="h6">Categories</Typography>
      <List dense>
        {Array.isArray(categories) && categories.map(cat => (
          <ListItem key={cat.id} secondaryAction={
            <>
              <IconButton onClick={() => handleCatEdit(cat)}><EditIcon /></IconButton>
              <IconButton onClick={() => handleCatDelete(cat.id)}><DeleteIcon /></IconButton>
            </>
          }>
            <ListItemText primary={cat.name} secondary={cat.description} />
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6">Menu Items</Typography>
      <List>
        {Array.isArray(menus) && menus.map(menu => (
          <ListItem key={menu.id} secondaryAction={
            <>
              <IconButton onClick={() => handleEdit(menu)}><EditIcon /></IconButton>
              <IconButton onClick={() => handleDelete(menu.id)}><DeleteIcon /></IconButton>
            </>
          }>
            <ListItemText
              primary={<span>{menu.icon} {menu.label}</span>}
              secondary={<>
                <span>Page: {menu.page_ref}</span><br />
                <span>Category: {categories.find(c => c.id === menu.category_id)?.name || '-'}</span><br />
                <span>Order: {menu.order} | Enabled: {menu.enabled ? 'Yes' : 'No'}</span>
              </>}
            />
          </ListItem>
        ))}
      </List>
      {/* Menu Form Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{selected ? 'Edit Menu' : 'Add Menu'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350 }}>
          <TextField label="Label" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} fullWidth />
          <TextField label="Icon (MUI icon name)" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} fullWidth />
          <TextField label="Page Reference" value={form.page_ref} onChange={e => setForm({ ...form, page_ref: e.target.value })} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select value={form.category_id || ''} label="Category" onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <MenuItem value="">None</MenuItem>
              {categories.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Order" type="number" value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} fullWidth />
          <FormControlLabel control={<Switch checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />} label="Enabled" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      {/* Category Form Dialog */}
      <Dialog open={catOpen} onClose={() => setCatOpen(false)}>
        <DialogTitle>{catForm.id ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350 }}>
          <TextField label="Name" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} fullWidth />
          <TextField label="Description" value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatOpen(false)}>Cancel</Button>
          <Button onClick={handleCatSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}