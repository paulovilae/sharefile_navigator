import { useState, useCallback, useEffect, useRef } from 'react';
import sharePointCache from '../../../../utils/cacheUtils';

const useSharePointSelection = (items, multiSelect, onSelectionChange, onExecutionUpdate, selectedLibrary, setFileStatuses, fetchOcrStatusesCached) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const prevDetailedSelectionComparableRef = useRef(JSON.stringify([]));

  const handleSelectItem = useCallback((item, isFolder) => {
    console.log('🔍 handleSelectItem called:', {
      itemName: item.name,
      itemId: item.id,
      isFolder,
      itemType: item.type
    });
    const itemId = isFolder ? `folder-${item.id}` : `file-${item.id}`;
    console.log('🔍 Generated itemId:', itemId);
    setSelectedItems(prev => {
      let newSelection;
      if (prev.includes(itemId)) {
        newSelection = prev.filter(id => id !== itemId);
      } else {
        if (multiSelect) {
          newSelection = [...prev, itemId];
        } else {
          newSelection = [itemId];
        }
      }
      return newSelection;
    });
  }, [multiSelect]);

  const isItemSelected = useCallback((item, isFolder) => {
    const itemId = isFolder ? `folder-${item.id}` : `file-${item.id}`;
    return selectedItems.includes(itemId);
  }, [selectedItems]);


  const fetchFolderContentsRecursively = useCallback(async (folder, selectedLibrary, currentFiles = []) => {
    if (!folder?.id) {
      console.warn("Invalid folder provided:", folder);
      return currentFiles;
    }

    console.log(`Fetching contents for folder: ${folder.name} (${folder.id})`);
    try {
      const response = await fetch(`/api/sharepoint/list_files?libraryId=${selectedLibrary.id}&folderId=${folder.id}`);
      if (!response.ok) {
        console.error(`Failed to fetch contents for folder ${folder.name}: ${response.status}`);
        return currentFiles;
      }
      const folderContents = await response.json();

      if (!folderContents?.value) {
        console.warn(`No contents found for folder: ${folder.name}`);
        return currentFiles;
      }

      const files = folderContents.value.filter(item => item.file);
      const subfolders = folderContents.value.filter(item => item.folder);

      files.forEach(file => {
        currentFiles.push(file);
      });

      for (const subfolder of subfolders) {
        await fetchFolderContentsRecursively(subfolder, selectedLibrary, currentFiles);
      }

      return currentFiles;
    } catch (error) {
      console.error(`Error fetching contents for folder ${folder.name}:`, error);
      return currentFiles;
    }
  }, []);

  const handleFileSelectionChange = useCallback(async (selectedFileIds) => {
    console.log('🔍 handleFileSelectionChange called with:', JSON.stringify(selectedFileIds));
    console.log('🔍 Current selectedItems:', JSON.stringify(selectedItems));
    console.log('🔍 Available items:', JSON.stringify(items?.map(i => ({ id: i.id, name: i.name, type: i.type }))));

    const folderSelections = selectedItems.filter(id => id.startsWith('folder-'));
    let newFileSelections = selectedFileIds
      .filter(fileId => {
        // Strip the "file-" prefix if it exists to match the actual item.id
        const actualFileId = fileId.startsWith('file-') ? fileId.substring(5) : fileId;
        const file = items && items.find(item => item.type === 'file' && String(item.id) === actualFileId);
        console.log('🔍 Checking file:', JSON.stringify({ fileId, actualFileId, fileName: file?.name, isPdf: file?.name.toLowerCase().endsWith('.pdf') }));
        return file && file.name.toLowerCase().endsWith('.pdf');
      })
      .map(id => {
        // Ensure we add the "file-" prefix for internal tracking, but strip it first if it already exists
        const actualId = id.startsWith('file-') ? id.substring(5) : id;
        return `file-${actualId}`;
      });

    console.log('🔍 folderSelections:', JSON.stringify(folderSelections));
    console.log('🔍 newFileSelections:', JSON.stringify(newFileSelections));

    // Process folder selections
    if (folderSelections.length > 0) {
      let allFilesFromFolders = [];
      for (const folderId of folderSelections) {
        const actualFolderId = folderId.substring(7); // Remove "folder-" prefix
        const folder = items && items.find(item => item.type === 'folder' && String(item.id) === actualFolderId);
        if (folder) {
          const files = await fetchFolderContentsRecursively(folder, selectedLibrary);
          allFilesFromFolders = [...allFilesFromFolders, ...files];
        }
      }

      // Convert files from folders to file selections
      const filesFromFoldersSelections = allFilesFromFolders
        .filter(file => file.name.toLowerCase().endsWith('.pdf'))
        .map(file => `file-${file.id}`);

      newFileSelections = [...newFileSelections, ...filesFromFoldersSelections];
    }

    if (multiSelect) {
      setSelectedItems([...folderSelections, ...newFileSelections]);
    } else {
      if (newFileSelections.length > 0) {
        setSelectedItems([newFileSelections[0]]);
      } else if (folderSelections.length > 0) {
        setSelectedItems([folderSelections[0]]);
      } else {
        setSelectedItems([]);
      }
    }
  }, [selectedItems, multiSelect, items, fetchFolderContentsRecursively, selectedLibrary]);

  const handleProcessSelectedWithOcr = useCallback(async () => {
    if (!selectedItems.length) {
      console.warn("No items selected for OCR processing.");
      return;
    }
    if (!selectedLibrary) {
      console.error("Cannot process OCR: No library selected.");
      return;
    }
    console.log("Processing selected items with OCR:", selectedItems);
    //trackMetric('ocr_processing_started', { count: selectedItems.length });

    const processedFileIds = [];

    for (const idString of selectedItems) {
      const [type, ...idParts] = idString.split(/-(.+)/);
      const id = idParts.join('');

      let itemToProcess = null;
      let driveId = selectedLibrary.id;

      const sourceItem = items && items.find(i => String(i.id) === id && i.type === type);

      if (sourceItem) {
        itemToProcess = {
          drive_id: sourceItem.drive_id || driveId,
          item_id: sourceItem.id,
          item_type: sourceItem.type
        };
        if (sourceItem.type === 'file') {
          processedFileIds.push(sourceItem.id);
        }
      }

      if (itemToProcess) {
        try {
          console.log(`Calling processSharePointItem for:`, itemToProcess);
          const response = await fetch('/api/ocr/process_sharepoint_item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemToProcess),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error during OCR processing." }));
            console.error(`Failed to process ${type} ${id}: ${response.status}`, errorData.detail);
            //trackMetric('ocr_processing_error', { itemId: id, error: errorData.detail });
          } else {
            const result = await response.json();
            console.log(`Successfully initiated processing for ${type} ${id}:`, result);
            //trackMetric('ocr_processing_success', { itemId: id, result });
          }
        } catch (error) {
          console.error(`Error calling OCR processing for ${type} ${id}:`, error);
          //trackMetric('ocr_processing_exception', { itemId: id, error: error.message });
        }
      } else {
        console.warn(`Could not find details for selected item: ${idString}`);
      }
    }

    if (processedFileIds.length > 0) {
      console.log('[Cache] Invalidating OCR status cache for processed files:', processedFileIds);
      sharePointCache.invalidateByPattern('block_statuses');
      setTimeout(async () => {
        if (selectedLibrary && items.filter(i => i.type === 'file').length > 0) {
          const currentFileIds = items.filter(i => i.type === 'file').map(f => f.id);
          const newStatuses = await fetchOcrStatusesCached(currentFileIds);
          setFileStatuses(newStatuses || {});
        }
      }, 3000);
    }
  }, [selectedItems, selectedLibrary, items, setFileStatuses]);

  useEffect(() => {
    if (onSelectionChange) {
      const detailedSelectedItems = selectedItems.map(idString => {
        const [type, ...idParts] = idString.split(/-(.+)/);
        const id = idParts.join('');

        const sourceList = items || [];
        const originalItem = sourceList.find(i => String(i.id) === id && i.type === type);

        if (originalItem) {
          return { ...originalItem, itemType: type };
        }
        return null;
      }).filter(Boolean);

      const currentComparableSelection = JSON.stringify(detailedSelectedItems.map(item => String(item.id)).sort());

      if (prevDetailedSelectionComparableRef.current !== currentComparableSelection) {
        onSelectionChange(detailedSelectedItems);
        prevDetailedSelectionComparableRef.current = currentComparableSelection;
        if (onExecutionUpdate) {
          onExecutionUpdate({
            status: 'selection_changed',
            result: { selection: detailedSelectedItems }
          });
        }
      }
    }
  }, [selectedItems, items, onSelectionChange, onExecutionUpdate]);

  return {
    selectedItems,
    handleSelectItem,
    isItemSelected,
    handleFileSelectionChange,
    setSelectedItems,
    prevDetailedSelectionComparableRef,
    handleProcessSelectedWithOcr
  };
};

export default useSharePointSelection;