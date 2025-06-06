import React, { useEffect } from 'react'; // Added useEffect
import SharePointExplorerContent from './SharePointExplorerContent';
import useSharePointState from './hooks/useSharePointState';
import useSharePointApi from './hooks/useSharePointApi';
import useSharePointHandlers from './hooks/useSharePointHandlers'; // Added useSharePointHandlers
import useSharePointMetrics from './hooks/useSharePointMetrics';
import useSharePointSelection from './hooks/useSharePointSelection';

const SharePointExplorerContentWrapper = ({
  config,
  onSelectionChange,
  onExecutionUpdate,
  multiSelect,
  metrics,
  setMetrics,
  trackInteraction,
  trackResponseTime,
  updateCurrentView,
  trackCacheHit,
  trackCacheMiss,
  trackDataTransfer,
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

  // Add the selection hook here where we have access to items
  const {
    selectedItems: selectionSelectedItems,
    handleSelectItem: selectionHandleSelectItem,
    isItemSelected: selectionIsItemSelected,
    handleFileSelectionChange: selectionHandleFileSelectionChange,
    setSelectedItems: selectionSetSelectedItems,
    prevDetailedSelectionComparableRef: selectionPrevDetailedSelectionComparableRef
  } = useSharePointSelection(items, multiSelect, onSelectionChange, onExecutionUpdate);

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
    fetchFolderContents,
    // Pass metrics tracking functions
    trackInteraction,
    updateCurrentView,
    trackResponseTime
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
      selectedItems={selectionSelectedItems}
      handleSelectItem={selectionHandleSelectItem} // Use selection hook
      isItemSelected={selectionIsItemSelected}     // Use selection hook
      handleFileSelectionChange={selectionHandleFileSelectionChange} // Use selection hook
      fileStatuses={fileStatuses}
      setFileStatuses={setFileStatuses}
      prevDetailedSelectionComparableRef={selectionPrevDetailedSelectionComparableRef}
      metrics={metrics}
      setMetrics={setMetrics}
      config={config}
      onSelectionChange={onSelectionChange}
      onExecutionUpdate={(update) => {
        if (onExecutionUpdate) {
          // Add reload functionality
          onExecutionUpdate({
            ...update,
            onReload: () => {
              // Reload current view
              if (selectedLibrary) {
                if (currentPath.length > 0) {
                  // Reload current folder
                  fetchFolderContents(selectedLibrary.id, currentPath[currentPath.length - 1].id);
                } else {
                  // Reload library root
                  fetchFolderContents(selectedLibrary.id);
                }
              } else {
                // Reload libraries
                fetchLibraries();
              }
            }
          });
        }
      }}
      multiSelect={multiSelect}
      setSelectedItems={selectionSetSelectedItems}
    />
  );
};

export default SharePointExplorerContentWrapper;