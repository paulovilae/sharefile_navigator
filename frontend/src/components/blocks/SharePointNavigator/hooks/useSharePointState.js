import { useState, useRef } from 'react';

const useSharePointState = () => {
  const [libraries, setLibraries] = useState([]);
  const [selectedLibrary, setSelectedLibrary] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [fileStatuses, setFileStatuses] = useState({});
  const prevDetailedSelectionComparableRef = useRef(JSON.stringify([]));
  const [metricsExpanded, setMetricsExpanded] = useState(false);

  return {
    libraries, setLibraries,
    selectedLibrary, setSelectedLibrary,
    currentPath, setCurrentPath,
    items, setItems,
    loading, setLoading,
    error, setError,
    selectedItems, setSelectedItems,
    fileStatuses, setFileStatuses,
    prevDetailedSelectionComparableRef, // This ref is part of selection logic, might move with selection effects
    metricsExpanded, setMetricsExpanded,
  };
};

export default useSharePointState;