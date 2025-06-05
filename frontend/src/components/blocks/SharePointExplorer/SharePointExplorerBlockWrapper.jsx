import React from 'react';
import SharePointExplorerContentWrapper from './SharePointExplorerContentWrapper';
import useSharePointMetrics from './hooks/useSharePointMetrics';
import useSharePointSelection from './hooks/useSharePointSelection';

const SharePointExplorerBlockWrapper = ({ config, onSelectionChange, onExecutionUpdate, multiSelect = true, onMetricsUpdate, items }) => {
  const {
    metrics,
    setMetrics,
    getSessionDuration,
    trackInteraction,
    trackResponseTime,
    updateCurrentView,
    trackCacheHit,
    trackCacheMiss,
    trackDataTransfer
  } = useSharePointMetrics();
  const { selectedItems, handleSelectItem, isItemSelected, handleFileSelectionChange, setSelectedItems, prevDetailedSelectionComparableRef } = useSharePointSelection(items, multiSelect, onSelectionChange, onExecutionUpdate);


  // Pass metrics back to parent component if callback provided
  React.useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate({ metrics, setMetrics, getSessionDuration });
    }
  }, [metrics, setMetrics, getSessionDuration, onMetricsUpdate]);

  return (
    <SharePointExplorerContentWrapper
      config={config}
      onSelectionChange={onSelectionChange}
      onExecutionUpdate={onExecutionUpdate}
      multiSelect={multiSelect}
      metrics={metrics}
      setMetrics={setMetrics}
      trackInteraction={trackInteraction}
      trackResponseTime={trackResponseTime}
      updateCurrentView={updateCurrentView}
      trackCacheHit={trackCacheHit}
      trackCacheMiss={trackCacheMiss}
      trackDataTransfer={trackDataTransfer}
      selectedItems={selectedItems}
      handleSelectItem={handleSelectItem}
      isItemSelected={isItemSelected}
      handleFileSelectionChange={handleFileSelectionChange}
      setSelectedItems={setSelectedItems}
      prevDetailedSelectionComparableRef={prevDetailedSelectionComparableRef}
    />
  );
};

export default SharePointExplorerBlockWrapper;