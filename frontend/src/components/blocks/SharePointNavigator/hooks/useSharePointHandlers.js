import { useCallback } from 'react';

const useSharePointHandlers = (
  // State setters from useSharePointState
  setSelectedLibrary,
  setCurrentPath,
  setItems,
  setLoading, // Needed for fetchFolderContents
  setError,   // Needed for fetchFolderContents
  // API functions from useSharePointApi
  fetchFolderContents 
) => {
  const handleLibrarySelect = useCallback(async (library) => {
    if (!library || !library.id) {
      console.error("handleLibrarySelect called with invalid library:", library);
      setError("Invalid library selected.");
      return;
    }
    setSelectedLibrary(library);
    const initialPath = [{ id: library.id, name: library.name, type: 'library' }];
    setCurrentPath(initialPath);
    setItems([]); // Clear previous items

    try {
      // fetchFolderContents expects (libraryId, folderPath string or null for root)
      // For the root of a library, we might pass null or an empty string for folderPath
      // depending on how fetchFolderContents is implemented.
      // The current mock in useSharePointApi takes (libraryId, folderPath)
      // and doesn't really use folderPath yet.
      const folderItems = await fetchFolderContents(library.id, null); 
      setItems(folderItems || []);
    } catch (err) {
      console.error(`Error fetching contents for library ${library.name}:`, err);
      setError(err.message || `Failed to load contents for ${library.name}`);
      setItems([]); // Clear items on error
    }
  }, [setSelectedLibrary, setCurrentPath, setItems, fetchFolderContents, setLoading, setError]);

  const handleFolderClick = useCallback(async (folder) => {
    console.log('Folder clicked:', folder);
    setCurrentPath(prevPath => [...prevPath, { id: folder.id, name: folder.name, type: 'folder' }]);
    setItems([]); // Clear previous items
    setLoading(true);
    setError(null);
    
    if (folder.drive_id && folder.id) { // Ensure drive_id and item_id are present
        try {
            const folderItems = await fetchFolderContents(folder.drive_id, folder.id);
            setItems(folderItems || []);
        } catch (err) {
            console.error(`Error fetching contents for folder ${folder.name}:`, err);
            setError(err.message || `Failed to load contents for ${folder.name}`);
            setItems([]);
        } finally {
            setLoading(false);
        }
    } else {
        console.warn("Folder click on item without drive_id or id:", folder);
        setError("Invalid folder data");
        setLoading(false);
    }

  }, [setCurrentPath, setItems, fetchFolderContents, setLoading, setError]);

  const handleBackNavigation = useCallback(async (newPath, libraryId) => {
    if (!newPath || newPath.length === 0) {
      // Going back to library selection
      setSelectedLibrary(null);
      setCurrentPath([]);
      setItems([]);
      return;
    }

    setCurrentPath(newPath);
    setItems([]); // Clear previous items

    try {
      if (newPath.length === 1) {
        // Back to library root
        const folderItems = await fetchFolderContents(libraryId, null);
        setItems(folderItems || []);
      } else {
        // Back to a specific folder
        const targetFolder = newPath[newPath.length - 1];
        const folderItems = await fetchFolderContents(libraryId, targetFolder.id);
        setItems(folderItems || []);
      }
    } catch (err) {
      console.error('Error fetching contents during back navigation:', err);
      setError(err.message || 'Failed to load folder contents');
      setItems([]);
    }
  }, [setSelectedLibrary, setCurrentPath, setItems, fetchFolderContents, setError]);
  
  // Add other handlers here as per your plan (handleFileView, handleSelectItem, etc.)
  // For now, just returning the implemented ones.
  const handleSelectItem = useCallback((item, isFolder) => {
    console.log('handleSelectItem called (placeholder):', item, 'isFolder:', isFolder);
    // Actual selection logic will be added later
  }, []);

  const isItemSelected = useCallback((item, isFolder) => {
    // console.log('isItemSelected called (placeholder):', item, 'isFolder:', isFolder);
    return false; // Actual selection logic will be added later
  }, []);
  
  const handleFileSelectionChange = useCallback((selectedFileIds) => {
    console.log('handleFileSelectionChange called (placeholder):', selectedFileIds);
    // Actual selection logic will be added later
  }, []);


  return {
    handleLibrarySelect,
    handleFolderClick,
    handleBackNavigation,
    handleSelectItem, // Placeholder
    isItemSelected,   // Placeholder
    handleFileSelectionChange, // Placeholder
  };
};

export default useSharePointHandlers;