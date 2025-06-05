import { useCallback } from 'react';

const useSharePointHandlers = (
  // State setters from useSharePointState
  setSelectedLibrary,
  setCurrentPath,
  setItems,
  setLoading, // Needed for fetchFolderContents
  setError,   // Needed for fetchFolderContents
  // API functions from useSharePointApi
  fetchFolderContents,
  // Metrics tracking functions
  trackInteraction,
  updateCurrentView,
  trackResponseTime
) => {
  const handleLibrarySelect = useCallback(async (library) => {
    if (!library || !library.id) {
      console.error("handleLibrarySelect called with invalid library:", library);
      setError("Invalid library selected.");
      return;
    }
    
    // Track library selection interaction
    if (trackInteraction) {
      trackInteraction('library_select', { libraryId: library.id });
    }
    
    setSelectedLibrary(library);
    const initialPath = [{ id: library.id, name: library.name, type: 'library' }];
    setCurrentPath(initialPath);
    setItems([]); // Clear previous items

    try {
      const startTime = Date.now();
      const folderItems = await fetchFolderContents(library.id, null);
      const responseTime = Date.now() - startTime;
      
      // Track response time
      if (trackResponseTime) {
        trackResponseTime(responseTime);
      }
      
      setItems(folderItems || []);
      
      // Update current view metrics
      if (updateCurrentView && folderItems) {
        const folders = folderItems.filter(item => item.type === 'folder');
        const files = folderItems.filter(item => item.type === 'file');
        updateCurrentView(folders, files);
      }
    } catch (err) {
      console.error(`Error fetching contents for library ${library.name}:`, err);
      setError(err.message || `Failed to load contents for ${library.name}`);
      setItems([]); // Clear items on error
      
      // Track error
      if (trackInteraction) {
        trackInteraction('error');
      }
    }
  }, [setSelectedLibrary, setCurrentPath, setItems, fetchFolderContents, setLoading, setError, trackInteraction, updateCurrentView, trackResponseTime]);

  const handleFolderClick = useCallback(async (folder) => {
    console.log('Folder clicked:', folder);
    
    // Track folder click interaction
    if (trackInteraction) {
      trackInteraction('folder_click', {
        depth: folder.depth || 0,
        folderId: folder.id
      });
    }
    
    setCurrentPath(prevPath => [...prevPath, { id: folder.id, name: folder.name, type: 'folder' }]);
    setItems([]); // Clear previous items
    setLoading(true);
    setError(null);
    
    if (folder.drive_id && folder.id) { // Ensure drive_id and item_id are present
        try {
            const startTime = Date.now();
            const folderItems = await fetchFolderContents(folder.drive_id, folder.id);
            const responseTime = Date.now() - startTime;
            
            // Track response time
            if (trackResponseTime) {
              trackResponseTime(responseTime);
            }
            
            setItems(folderItems || []);
            
            // Update current view metrics
            if (updateCurrentView && folderItems) {
              const folders = folderItems.filter(item => item.type === 'folder');
              const files = folderItems.filter(item => item.type === 'file');
              updateCurrentView(folders, files);
            }
        } catch (err) {
            console.error(`Error fetching contents for folder ${folder.name}:`, err);
            setError(err.message || `Failed to load contents for ${folder.name}`);
            setItems([]);
            
            // Track error
            if (trackInteraction) {
              trackInteraction('error');
            }
        } finally {
            setLoading(false);
        }
    } else {
        console.warn("Folder click on item without drive_id or id:", folder);
        setError("Invalid folder data");
        setLoading(false);
        
        // Track error
        if (trackInteraction) {
          trackInteraction('error');
        }
    }

  }, [setCurrentPath, setItems, fetchFolderContents, setLoading, setError, trackInteraction, updateCurrentView, trackResponseTime]);

  const handleBackNavigation = useCallback(async (newPath, libraryId) => {
    if (!newPath || newPath.length === 0) {
      // Going back to library selection
      setSelectedLibrary(null);
      setCurrentPath([]);
      setItems([]);
      
      // Clear metrics when going back to library selection
      if (updateCurrentView) {
        updateCurrentView([], []);
      }
      return;
    }

    setCurrentPath(newPath);
    setItems([]); // Clear previous items

    try {
      const startTime = Date.now();
      let folderItems;
      
      if (newPath.length === 1) {
        // Back to library root
        folderItems = await fetchFolderContents(libraryId, null);
      } else {
        // Back to a specific folder
        const targetFolder = newPath[newPath.length - 1];
        folderItems = await fetchFolderContents(libraryId, targetFolder.id);
      }
      
      const responseTime = Date.now() - startTime;
      
      // Track response time
      if (trackResponseTime) {
        trackResponseTime(responseTime);
      }
      
      setItems(folderItems || []);
      
      // Update current view metrics
      if (updateCurrentView && folderItems) {
        const folders = folderItems.filter(item => item.type === 'folder');
        const files = folderItems.filter(item => item.type === 'file');
        updateCurrentView(folders, files);
      }
    } catch (err) {
      console.error('Error fetching contents during back navigation:', err);
      setError(err.message || 'Failed to load folder contents');
      setItems([]);
      
      // Track error
      if (trackInteraction) {
        trackInteraction('error');
      }
    }
  }, [setSelectedLibrary, setCurrentPath, setItems, fetchFolderContents, setError, trackInteraction, updateCurrentView, trackResponseTime]);
  
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