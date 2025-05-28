import * as React from "react";
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton, ListItemText, CircularProgress, TextField, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SharePointLibrariesExplorer from '../sharepoint/SharePointLibrariesExplorer';
import { useEffect, useState } from 'react';

// Auto-import all deployed blocks
const blockModules = import.meta.glob('../../blocks/*.jsx', { eager: true });

// Build a mapping from sanitized filename to component
const blockComponentMap = {};
for (const path in blockModules) {
  // Extract filename without extension
  const match = path.match(/\/([^\/]+)\.jsx$/) || path.match(/\/([^\/]+)\.jsx$/);
  if (match) {
    // Use the filename as the key (replace underscores with spaces for display_name match)
    const name = match[1].replace(/_/g, ' ');
    blockComponentMap[name] = blockModules[path].default;
  }
}

export default function WorkflowEngine() {
  const [blocks, setBlocks] = React.useState([]);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [templates, setTemplates] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [personalizeDialogOpen, setPersonalizeDialogOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState(null);
  const [paramValues, setParamValues] = React.useState({});
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const [workflowName, setWorkflowName] = React.useState('My Workflow');
  const [workflowDescription, setWorkflowDescription] = React.useState('');

  // Export workflow as JSON
  const handleExportWorkflow = () => {
    const workflow = {
      name: workflowName,
      description: workflowDescription,
      blocks: blocks.map((block, idx) => ({
        block_template_id: block.block_template_id || block.id.replace('block-', ''),
        order: idx,
        config: block.params || {},
        name_override: block.display_name,
        enabled: true
      }))
    };
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '_') || 'workflow'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import workflow from JSON
  const handleImportWorkflow = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        setWorkflowName(data.name || 'Imported Workflow');
        setWorkflowDescription(data.description || '');
        setBlocks((data.blocks || []).map((block, idx) => ({ ...block, id: `block-${block.block_template_id || idx}` })));
        setSnackbar({ open: true, message: 'Workflow imported!', severity: 'success' });
      } catch (err) {
        setSnackbar({ open: true, message: 'Invalid workflow JSON', severity: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleAddBlock = () => {
    setAddDialogOpen(true);
    setLoading(true);
    fetch('/api/blocks/block_templates')
      .then(res => res.json())
      .then(data => { setTemplates(data); setLoading(false); });
  };

  const handleSelectTemplate = (tpl) => {
    if (tpl.config_schema && Object.keys(tpl.config_schema).length > 0) {
      setSelectedTemplate(tpl);
      // Set default values if any
      const defaults = {};
      for (const key in tpl.config_schema) {
        defaults[key] = tpl.config_schema[key].default || '';
      }
      setParamValues(defaults);
      setPersonalizeDialogOpen(true);
    } else {
      setBlocks([{ ...tpl, id: `block-${tpl.id}` }]);
    }
    setAddDialogOpen(false);
  };

  const handleParamChange = (e) => {
    setParamValues(v => ({ ...v, [e.target.name]: e.target.value }));
  };

  const handlePersonalizeSubmit = () => {
    setBlocks([{ ...selectedTemplate, id: `block-${selectedTemplate.id}`, params: paramValues }]);
    setPersonalizeDialogOpen(false);
    setSelectedTemplate(null);
    setParamValues({});
  };

  const handleSaveWorkflow = async () => {
    try {
      if (!workflowName) {
        setSnackbar({ open: true, message: 'Workflow name is required', severity: 'error' });
        return;
      }
      const blocksPayload = blocks.map((block, idx) => ({
        block_template_id: block.block_template_id || block.id.replace('block-', ''),
        order: idx,
        config: block.params || {},
        name_override: block.display_name,
        enabled: true
      }));
      const res = await fetch('/api/blocks/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowName,
          description: workflowDescription,
          blocks: blocksPayload
        }),
      });
      if (!res.ok) throw new Error('Failed to save workflow');
      setSnackbar({ open: true, message: 'Workflow saved!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 700, mb: 3, display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'flex-start' }}>
        <TextField
          label="Workflow Name"
          value={workflowName}
          onChange={e => setWorkflowName(e.target.value)}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Description"
          value={workflowDescription}
          onChange={e => setWorkflowDescription(e.target.value)}
          sx={{ flex: 2 }}
          multiline
          minRows={1}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
          <Button variant="outlined" onClick={handleExportWorkflow} sx={{ minWidth: 120 }}>Export JSON</Button>
          <Button variant="outlined" component="label" sx={{ minWidth: 120 }}>
            Import JSON
            <input type="file" accept="application/json" hidden onChange={handleImportWorkflow} />
          </Button>
        </Box>
      </Box>
      {blocks.length === 0 ? (
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon sx={{ fontSize: 40 }} />}
          sx={{ fontSize: 24, px: 5, py: 3, borderRadius: 3, boxShadow: 4 }}
          onClick={handleAddBlock}
        >
          Add Block
        </Button>
      ) : (
        <>
          {blocks.map((block, idx) => {
            // Try to match display_name to filename (with or without underscores)
            let displayName = (block.display_name || '').replace(' (template)', '');
            let BlockComponent = blockComponentMap[displayName];
            if (!BlockComponent) {
              // Try with underscores (for cases like ShareFile_Manager)
              BlockComponent = blockComponentMap[displayName.replace(/ /g, '_')];
            }
            return BlockComponent ? (
              <Box key={idx} sx={{ mt: 4, p: 4, border: '2px dashed #90caf9', borderRadius: 3, minWidth: 320, minHeight: 120, bgcolor: 'background.paper', boxShadow: 2 }}>
                <BlockComponent {...block.params} />
              </Box>
            ) : (
              <Box key={idx} sx={{ mt: 4, p: 4, border: '2px dashed #90caf9', borderRadius: 3, minWidth: 320, minHeight: 120, bgcolor: 'background.paper', boxShadow: 2 }}>
                <div style={{ fontWeight: 600 }}>{block.display_name} (template)</div>
                {block.params && (
                  <Box sx={{ mt: 2, fontSize: 16 }}>
                    {Object.entries(block.params).map(([k, v]) => (
                      <div key={k}><b>{k}:</b> {v}</div>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
          <Button
            variant="contained"
            color="success"
            sx={{ mt: 3, fontSize: 18, px: 4, py: 1.5, borderRadius: 2, boxShadow: 2 }}
            onClick={handleSaveWorkflow}
          >
            Save Workflow
          </Button>
        </>
      )}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Select a Block Template</DialogTitle>
        <DialogContent>
          {loading ? <CircularProgress /> : (
            <List>
              {templates.map(tpl => (
                <ListItem key={tpl.id} disablePadding>
                  <ListItemButton onClick={() => handleSelectTemplate(tpl)}>
                    <ListItemText primary={tpl.display_name} secondary={tpl.description} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={personalizeDialogOpen} onClose={() => setPersonalizeDialogOpen(false)}>
        <DialogTitle>Personalize Block: {selectedTemplate?.display_name}</DialogTitle>
        <DialogContent>
          {selectedTemplate && selectedTemplate.config_schema && Object.keys(selectedTemplate.config_schema).length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {Object.entries(selectedTemplate.config_schema).map(([key, schema]) => (
                <TextField
                  key={key}
                  name={key}
                  label={schema.title || key}
                  value={paramValues[key] || ''}
                  onChange={handleParamChange}
                  helperText={schema.description || ''}
                  fullWidth
                />
              ))}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPersonalizeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePersonalizeSubmit} variant="contained">Add Block</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 