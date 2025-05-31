import React, { useEffect } from 'react'; // Added useEffect
import SharePointExplorerContent from './SharePointExplorerContent';
import useSharePointState from './hooks/useSharePointState';
import useSharePointApi from './hooks/useSharePointApi';
import useSharePointHandlers from './hooks/useSharePointHandlers'; // Added useSharePointHandlers
import useSharePointMetrics from './hooks/useSharePointMetrics';

const SharePointExplorerContentWrapper = ({
  config,
  onSelectionChange,
  onExecutionUpdate,
  multiSelect,
  metrics,
  setMetrics,
  selectedItems,
  handleSelectItem,
  isItemSelected,
  handleFileSelectionChange,
  setSelectedItems,
  prevDetailedSelectionComparableRef,
}) => {
  const {
    libraries, setLibraries,
    selectedLibrary, setSelectedLibrary,
    currentPath, setCurrentPath,
    items, setItems,
    loading, setLoading,
    error, setError,
    fileStatuses, setFileStatuses,
  } = useSharePointState();

  const { fetchLibraries, fetchFolderContents } = useSharePointApi(setLibraries, setLoading, setError);

  const {
    handleLibrarySelect,
    handleFolderClick,
    handleBackNavigation,
    // Placeholders from the hook, will be passed down
    handleSelectItem: handlerHandleSelectItem,
    isItemSelected: handlerIsItemSelected,
    handleFileSelectionChange: handlerHandleFileSelectionChange
  } = useSharePointHandlers(
    setSelectedLibrary,
    setCurrentPath,
    setItems,
    setLoading,
    setError,
    fetchFolderContents
  );

  // Fetch libraries on component mount
  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  return (
    <SharePointExplorerContent
      libraries={libraries}
      // setLibraries is not directly needed by SharePointExplorerContent if API hook handles it
      selectedLibrary={selectedLibrary}
      setSelectedLibrary={setSelectedLibrary} // Still needed for UI updates if any
      currentPath={currentPath}
      setCurrentPath={setCurrentPath} // Still needed for UI updates if any
      items={items}
      // setItems is not directly needed by SharePointExplorerContent if API/Handler hooks handle it
      loading={loading}
      // setLoading is not directly needed by SharePointExplorerContent if API/Handler hooks handle it
      error={error}
      // setError is not directly needed by SharePointExplorerContent if API/Handler hooks handle it
      fetchLibraries={fetchLibraries}
      handleLibrarySelect={handleLibrarySelect} // Pass down actual handler
      handleFolderClick={handleFolderClick}   // Pass down actual handler
      handleBackNavigation={handleBackNavigation} // Pass down back navigation handler
      selectedItems={selectedItems}
      handleSelectItem={handleSelectItem || handlerHandleSelectItem} // Use prop if provided, else from hook
      isItemSelected={isItemSelected || handlerIsItemSelected}     // Use prop if provided, else from hook
      handleFileSelectionChange={handleFileSelectionChange || handlerHandleFileSelectionChange} // Use prop if provided, else from hook
      fileStatuses={fileStatuses}
      setFileStatuses={setFileStatuses}
      prevDetailedSelectionComparableRef={prevDetailedSelectionComparableRef}
      metrics={metrics}
      setMetrics={setMetrics}
      config={config}
      onSelectionChange={onSelectionChange}
      onExecutionUpdate={onExecutionUpdate}
      multiSelect={multiSelect}
      setSelectedItems={setSelectedItems}
    />
  );
};

export default SharePointExplorerContentWrapper;