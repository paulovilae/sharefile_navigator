// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

function App() {
import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  CircularProgress,
  Button,
  Stack,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const SharePointMUIFileExplorer = () => {
  const [libraries, setLibraries] = React.useState([]);
  const [selectedLibrary, setSelectedLibrary] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [treeData, setTreeData] = React.useState([]); // [{ id, name, isFolder, children }]
  const [currentParentId, setCurrentParentId] = React.useState(null); // null = root

  // Fetch libraries on mount
  React.useEffect(() => {
    setLoading(true);
    fetch('/api/sharepoint/libraries')
      .then((res) => res.ok ? res.json() : Promise.reject('Failed to fetch libraries'))
      .then((data) => {
        setLibraries(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.toString());
        setLoading(false);
      });
  }, []);

  // Fetch folders and files for the current parent (root or folder)
  React.useEffect(() => {
    if (!selectedLibrary) return;
    setLoading(true);
    const driveId = selectedLibrary.id;
    const folderUrl = currentParentId
      ? `/api/sharepoint/folders?drive_id=${driveId}&parent_id=${currentParentId}`
      : `/api/sharepoint/folders?drive_id=${driveId}`;
    const fileUrl = currentParentId
      ? `/api/sharepoint/files?drive_id=${driveId}&parent_id=${currentParentId}`
      : `/api/sharepoint/files?drive_id=${driveId}`;
    Promise.all([
      fetch(folderUrl).then((res) => res.ok ? res.json() : []),
      fetch(fileUrl).then((res) => res.ok ? res.json() : []),
    ]).then(([folders, files]) => {
      console.log('Folders response:', folders);
      console.log('Files response:', files);
      const folderItems = folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        isFolder: true,
      }));
      const fileItems = files.map((file) => ({
        id: file.id,
        name: file.name,
        isFolder: false,
      }));
      setTreeData([...folderItems, ...fileItems]);
      setLoading(false);
    }).catch((err) => {
      setTreeData([]);
      setLoading(false);
    });
  }, [selectedLibrary, currentParentId]);

  const handleItemClick = (item) => {
    if (item.isFolder) {
      setCurrentParentId(item.id);
    } else {
      // Preview file
      window.open(`/api/sharepoint/file_content?drive_id=${selectedLibrary.id}&item_id=${item.id}`, '_blank');
    }
  };

  const handleBackClick = () => {
    if (currentParentId) {
      setCurrentParentId(null);
    } else {
      setSelectedLibrary(null);
    }
  };

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Box p={4}><Typography color="error">{error}</Typography></Box>;

  if (!selectedLibrary) {
    return (
      <Box p={2}>
        <Typography variant="subtitle1" color="primary" gutterBottom sx={{ fontWeight: 500, fontSize: '1.1rem', lineHeight: 1.2 }}>
          SharePoint Libraries
        </Typography>
        <List>
          {libraries.map((lib) => (
            <ListItem button key={lib.id} onClick={() => { setSelectedLibrary(lib); setCurrentParentId(null); }}>
              <ListItemText primary={lib.name} />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBackClick}>
          Back
        </Button>
        <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 500, fontSize: '1.1rem', lineHeight: 1.2 }}>{selectedLibrary.name}</Typography>
      </Stack>
      <List>
        {treeData.map((item) => (
          <ListItem button key={item.id} onClick={() => handleItemClick(item)}>
            <ListItemIcon>
              {item.isFolder ? <FolderIcon sx={{ color: '#51247A' }} /> : <InsertDriveFileIcon />}
            </ListItemIcon>
            <ListItemText primary={item.name} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default SharePointMUIFileExplorer;
