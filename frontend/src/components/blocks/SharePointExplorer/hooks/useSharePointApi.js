import { useCallback } from 'react';
import sharePointCache, { withCache } from '../../../../utils/cacheUtils'; // Adjusted path

const useSharePointApi = (setLibraries, setLoading, setError) => {
  const fetchLibraries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sharepoint/libraries');
      if (!response.ok) {
        throw new Error(`Failed to fetch libraries: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setLibraries(data || []);
    } catch (err) {
      console.error("Error fetching libraries:", err);
      setError(err.message || 'Failed to fetch libraries');
      setLibraries([]); // Clear libraries on error
    } finally {
      setLoading(false);
    }
  }, [setLibraries, setLoading, setError]);

  const fetchFolderContents = useCallback(async (libraryId, folderPath) => {
    setLoading(true);
    setError(null);
    console.log(`Fetching contents for: ${libraryId}, Path: ${folderPath}`);
    try {
      // Fetch both folders and files
      const folderUrl = folderPath 
        ? `/api/sharepoint/folders?drive_id=${libraryId}&parent_id=${folderPath}`
        : `/api/sharepoint/folders?drive_id=${libraryId}`;
      const fileUrl = folderPath
        ? `/api/sharepoint/files?drive_id=${libraryId}&parent_id=${folderPath}`
        : `/api/sharepoint/files?drive_id=${libraryId}`;

      const [foldersResponse, filesResponse] = await Promise.all([
        fetch(folderUrl),
        fetch(fileUrl)
      ]);

      const folders = foldersResponse.ok ? await foldersResponse.json() : [];
      const files = filesResponse.ok ? await filesResponse.json() : [];

      // Mark folders and files with type and add drive_id
      const foldersWithType = folders.map(folder => ({
        ...folder,
        type: 'folder',
        drive_id: libraryId // Add drive_id to folders
      }));
      const filesWithType = files.map(file => ({
        ...file,
        type: 'file',
        drive_id: libraryId // Add drive_id to files
      }));

      const combinedData = [...foldersWithType, ...filesWithType];
      setLoading(false);
      return combinedData;
    } catch (err) {
      console.error("Error fetching folder contents:", err);
      setError(err.message || 'Failed to fetch folder contents');
      setLoading(false);
      return [];
    }
  }, [setLoading, setError]);

  return {
    fetchLibraries,
    fetchFolderContents,
    // Add cached versions if needed
    fetchLibrariesCached: withCache(fetchLibraries, 'sharepointLibraries'),
    fetchFolderContentsCached: withCache(fetchFolderContents, (libraryId, folderPath) => `sharepointFolder-${libraryId}-${folderPath || 'root'}`),
  };
};

export default useSharePointApi;