import { useState, useCallback } from 'react';

const useSharePointFolderStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFolderStats = useCallback(async (driveId, folderId = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ drive_id: driveId });
      if (folderId) {
        params.append('folder_id', folderId);
      }
      
      const response = await fetch(`/api/sharepoint/folder_stats?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching folder stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearStats = useCallback(() => {
    setStats(null);
    setError(null);
  }, []);

  return {
    stats,
    loading,
    error,
    fetchFolderStats,
    clearStats
  };
};

export default useSharePointFolderStats;