import * as React from 'react';
import { Admin, Resource, Layout, AppBar as RaAppBar } from 'react-admin';
import christusTheme from './christusTheme';
import { Box, Typography, Card, CardActionArea, CardContent, Grid, CircularProgress, Button, Stack } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';

// Logo URL
const logoUrl = 'https://christussinergia.com/info/Colaboradores/LogoCSS_Intranet.png';

// Custom AppBar that extends the default and adds logo/title, and forces icons to white
const CustomAppBar = (props) => (
  <RaAppBar
    {...props}
    sx={{
      backgroundColor: '#512698',
      minHeight: 51,
      boxShadow: 'none',
      '& .MuiSvgIcon-root, & .MuiIconButton-root svg': {
        color: '#fff',
        fill: '#fff',
      },
    }}
  >
    <Box display="flex" alignItems="center" pl={2} pr={2} style={{ minHeight: 51, height: 51 }}>
      <img src={logoUrl} alt="CHRISTUS Health" style={{ height: 40, padding: 0, borderRadius: 0, marginRight: 16 }} />
      <Typography variant="h6" sx={{ flexGrow: 1, fontSize: 22, color: '#fff' }}>
        CHRISTUS Health File Navigator
      </Typography>
    </Box>
    {props.children}
  </RaAppBar>
);

// Custom Layout with only the AppBar
const CustomLayout = (props) => <Layout {...props} appBar={CustomAppBar} />;

// SharePointLibraries component
const SharePointLibraries = () => {
  const [libraries, setLibraries] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [selectedLibrary, setSelectedLibrary] = React.useState(null);
  const [folders, setFolders] = React.useState([]);
  const [files, setFiles] = React.useState([]);
  const [loadingContents, setLoadingContents] = React.useState(false);
  const [folderStack, setFolderStack] = React.useState([]); // Stack for folder navigation

  React.useEffect(() => {
    setLoading(true);
    fetch('/api/sharepoint/libraries')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch libraries');
        return res.json();
      })
      .then((data) => {
        setLibraries(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Fetch folders and files for the current folder (or root)
  const fetchContents = React.useCallback((library, parentId = null) => {
    setLoadingContents(true);
    const folderUrl = parentId
      ? `/api/sharepoint/folders?drive_id=${library.id}&parent_id=${parentId}`
      : `/api/sharepoint/folders?drive_id=${library.id}`;
    const fileUrl = parentId
      ? `/api/sharepoint/files?drive_id=${library.id}&parent_id=${parentId}`
      : `/api/sharepoint/files?drive_id=${library.id}`;
    Promise.all([
      fetch(folderUrl).then((res) => (res.ok ? res.json() : [])),
      fetch(fileUrl).then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([foldersData, filesData]) => {
        setFolders(foldersData);
        setFiles(filesData);
        setLoadingContents(false);
      })
      .catch(() => {
        setFolders([]);
        setFiles([]);
        setLoadingContents(false);
      });
  }, []);

  // Fetch root folders/files when a library is selected or folderStack changes
  React.useEffect(() => {
    if (!selectedLibrary) return;
    const parentId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null;
    fetchContents(selectedLibrary, parentId);
  }, [selectedLibrary, folderStack, fetchContents]);

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Box p={4}><Typography color="error">{error}</Typography></Box>;

  // Library selection view
  if (!selectedLibrary) {
    return (
      <Box p={2}>
        <Typography variant="subtitle1" color="primary" gutterBottom sx={{ fontWeight: 500, fontSize: '1.1rem', lineHeight: 1.2 }}>
          SharePoint Libraries
        </Typography>
        <Grid container spacing={2}>
          {libraries.map((lib) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={lib.id}>
              <Card
                sx={{
                  border: '1px solid #eee',
                  boxShadow: 1,
                }}
              >
                <CardActionArea onClick={() => setSelectedLibrary(lib)}>
                  <CardContent>
                    <Typography variant="body1" color="primary" sx={{ fontWeight: 500, fontSize: '1rem', lineHeight: 1.2 }}>{lib.name}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Selected library or folder view
  const handleFolderClick = (folder) => {
    setFolderStack((prev) => [...prev, folder]);
  };

  const handleBack = () => {
    if (folderStack.length > 0) {
      setFolderStack((prev) => prev.slice(0, -1));
    } else {
      setSelectedLibrary(null);
      setFolders([]);
      setFiles([]);
    }
  };

  const handleFileClick = (file) => {
    // Open file preview in new tab
    const url = `/api/sharepoint/file_content?drive_id=${selectedLibrary.id}&item_id=${file.id}`;
    window.open(url, '_blank');
  };

  return (
    <Box p={2}>
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back
        </Button>
        <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 500, fontSize: '1.1rem', lineHeight: 1.2 }}>
          {selectedLibrary.name}
          {folderStack.length > 0 &&
            folderStack.map((f, idx) => (
              <span key={f.id}> / {f.name}</span>
            ))}
        </Typography>
      </Stack>
      {loadingContents ? (
        <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>
      ) : (
        <>
          <Typography variant="body2" color="primary" gutterBottom sx={{ fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.2 }}>Folders</Typography>
          <Grid container spacing={2} mb={2}>
            {folders.map((folder) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={folder.id}>
                <Card>
                  <CardActionArea onClick={() => handleFolderClick(folder)}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                      <FolderIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="body2" sx={{ fontWeight: 400, fontSize: '0.95rem', lineHeight: 1.2 }}>{folder.name}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
            {folders.length === 0 && <Grid item><Typography color="textSecondary">No folders</Typography></Grid>}
          </Grid>
          <Typography variant="body2" color="primary" gutterBottom sx={{ fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.2 }}>Files</Typography>
          <Grid container spacing={2}>
            {files.map((file) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                <Card>
                  <CardActionArea onClick={() => handleFileClick(file)}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                      <DescriptionIcon color="action" sx={{ mr: 1 }} />
                      <Typography variant="body2" sx={{ fontWeight: 400, fontSize: '0.95rem', lineHeight: 1.2 }}>{file.name}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
            {files.length === 0 && <Grid item><Typography color="textSecondary">No files</Typography></Grid>}
          </Grid>
        </>
      )}
    </Box>
  );
};

function App() {
  return (
    <Admin theme={christusTheme} layout={CustomLayout}>
      <Resource name="libraries" list={SharePointLibraries} icon={LibraryBooksIcon} />
    </Admin>
  );
}

export default App;
