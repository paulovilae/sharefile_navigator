import React from 'react';
import SharePointNavigatorContentWrapper from './SharePointNavigatorContentWrapper';
import useSharePointMetrics from './hooks/useSharePointMetrics';
import useSharePointSelection from './hooks/useSharePointSelection';

const SharePointNavigatorBlockWrapper = ({ config, onSelectionChange, onExecutionUpdate, multiSelect = true }) => {
  const { metrics, setMetrics } = useSharePointMetrics();
  const { selectedItems, handleSelectItem, isItemSelected, handleFileSelectionChange, setSelectedItems, prevDetailedSelectionComparableRef } = useSharePointSelection(null, multiSelect, onSelectionChange, onExecutionUpdate);

  return (
    <SharePointNavigatorContentWrapper
      config={config}
      onSelectionChange={onSelectionChange}
      onExecutionUpdate={onExecutionUpdate}
      multiSelect={multiSelect}
      metrics={metrics}
      setMetrics={setMetrics}
      selectedItems={selectedItems}
      handleSelectItem={handleSelectItem}
      isItemSelected={isItemSelected}
      handleFileSelectionChange={handleFileSelectionChange}
      setSelectedItems={setSelectedItems}
      prevDetailedSelectionComparableRef={prevDetailedSelectionComparableRef}
    />
  );
};

export default SharePointNavigatorBlockWrapper;