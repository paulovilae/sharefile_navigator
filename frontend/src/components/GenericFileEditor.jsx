import React, { useState, useEffect } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TableSortLabel, Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip, Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, Popover, MenuList, ClickAwayListener, Checkbox } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, CloudDownload as CloudDownloadIcon, CloudUpload as CloudUploadIcon, Search as SearchIcon, ViewColumn as ViewColumnIcon, Menu as MenuIcon } from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { styled } from '@mui/material/styles';
//import { Draggable, DragDropContext, Droppable } from '@atlaskit/pragmatic-drag-and-drop';

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
  height: '32px', // Compact row height
  '& td': {
    padding: '4px 8px', // Reduced cell padding
  },
}));

const StyledTableHeadRow = styled(TableRow)(({ theme }) => ({
  height: '36px', // Compact header height
  '& th': {
    padding: '6px 8px', // Reduced header cell padding
    fontWeight: 600,
  },
}));

export default function GenericFileEditor({ data, columns, onAddRow, onRemoveRow, onUpdateRow, onReorder, externallySelectedIds, onExternalSelectionChange }) {
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedColumns, setSelectedColumns] = useState(columns.filter(column => !column.hidden).map(column => column.field));
  const [internalSelectedRows, setInternalSelectedRows] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [newRow, setNewRow] = useState({});
  const [rows, setRows] = useState(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [draggedRow, setDraggedRow] = useState(null);
  const [draggedOverRow, setDraggedOverRow] = useState(null);

  useEffect(() => {
    setRows(data);
  }, [data]);

  const handleSort = (columnField) => () => {
    const isAsc = sortBy === columnField && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(columnField);
    // setRows(sortedData); // sortedData is derived from rows, sorting rows directly or relying on useMemo
  };

  const sortedData = React.useMemo(() => {
    let sortableData = [...rows];
    if (sortBy !== null) {
      sortableData.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) {
          return sortOrder === 'asc' ? -1 : 1;
        }
        if (a[sortBy] > b[sortBy]) {
          return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [rows, sortBy, sortOrder]);

  const handleColumnClick = (event) => {
    setColumnMenuAnchor(event.currentTarget);
  };

  const handleColumnClose = () => {
    setColumnMenuAnchor(null);
  };

  const handleColumnChange = (columnField) => {
    if (selectedColumns.includes(columnField)) {
      setSelectedColumns(selectedColumns.filter(field => field !== columnField));
    } else {
      setSelectedColumns([...selectedColumns, columnField]);
    }
  };

  const currentSelectedIds = externallySelectedIds !== undefined ? externallySelectedIds : internalSelectedRows;
  const updateSelection = onExternalSelectionChange || setInternalSelectedRows;

  const handleSelectAllRows = (event) => {
    let newSelectedIds;
    if (event.target.checked) {
      // Only select digitizable files when in external selection mode
      if (externallySelectedIds !== undefined) {
        newSelectedIds = displayData.filter(row => isDigitizable(row)).map(row => row.id);
      } else {
        newSelectedIds = displayData.map(row => row.id);
      }
    } else {
      newSelectedIds = [];
    }
    updateSelection(newSelectedIds);
  };

  const handleSelectRow = (event, id, row) => {
    // Prevent selection of non-digitizable files in external selection mode
    if (externallySelectedIds !== undefined && !isDigitizable(row)) {
      event.preventDefault();
      return;
    }

    const selectedIndex = currentSelectedIds.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(currentSelectedIds, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(currentSelectedIds.slice(1));
    } else if (selectedIndex === currentSelectedIds.length - 1) {
      newSelected = newSelected.concat(currentSelectedIds.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        currentSelectedIds.slice(0, selectedIndex),
        currentSelectedIds.slice(selectedIndex + 1),
      );
    }
    updateSelection(newSelected);
  };

  const handleAddRow = () => {
    setOpenAddDialog(true);
    setNewRow({});
  };

  const handleRemoveRow = () => {
    if (onRemoveRow) {
      currentSelectedIds.forEach(rowId => onRemoveRow(rowId));
      updateSelection([]);
    }
  };

  const handleUpdateRow = (row) => {
    setOpenEditDialog(true);
    setEditRow(row);
    setNewRow({}); // Clear newRow state for edit dialog
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
  };

  const handleSaveAddDialog = () => {
    if (onAddRow) {
      onAddRow(newRow);
    }
    setOpenAddDialog(false);
  };

  const handleSaveEditDialog = () => {
    if (onUpdateRow && editRow) {
      onUpdateRow({ ...editRow, ...newRow });
    }
    setOpenEditDialog(false);
  };

  const handleChangeNewRow = (event) => {
    const { name, value, checked, type } = event.target;
    setNewRow(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const isRowSelected = (id) => currentSelectedIds.indexOf(id) !== -1;

  const handleDownloadJson = () => {
    const json = JSON.stringify(rows, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    saveAs(blob, 'data.json');
  };

  const handleUploadJson = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        // Assuming you have a function to handle the uploaded data
        // onUploadJson(json);
        console.log('Uploaded JSON:', json); // Replace with your logic
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredData = React.useMemo(() => {
    return rows.filter(row => {
      return selectedColumns.some(column => {
        const value = row[column];
        return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [rows, searchTerm, selectedColumns]);

  // Helper function to check if a file is digitizable (PDF)
  const isDigitizable = (row) => {
    const ext = row.name?.split('.').pop()?.toLowerCase();
    return ['pdf'].includes(ext);
  };

  // For external selection mode, show all files but only allow PDF selection
  const displayData = filteredData;

  const handleDragStart = (row) => {
    setDraggedRow(row);
  };

  const handleDragEnter = (row) => {
    setDraggedOverRow(row);
  };

  const handleDragEnd = () => {
    if (draggedRow && draggedOverRow) {
      const draggedRowIndex = rows.indexOf(draggedRow);
      const draggedOverRowIndex = rows.indexOf(draggedOverRow);

      const newRows = [...rows];
      newRows.splice(draggedRowIndex, 1);
      newRows.splice(draggedOverRowIndex, 0, draggedRow);

      setRows(newRows);
      setDraggedRow(null);
      setDraggedOverRow(null);

      if (onReorder) {
        onReorder(newRows);
      }
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Select Columns">
              <IconButton onClick={handleColumnClick} size="small">
                <ViewColumnIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Popover
              open={Boolean(columnMenuAnchor)}
              anchorEl={columnMenuAnchor}
              onClose={handleColumnClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
            >
              <Paper>
                <ClickAwayListener onClickAway={handleColumnClose}>
                  <MenuList>
                    {columns.map((column) => (
                      <MenuItem key={column.field} onClick={() => handleColumnChange(column.field)}>
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(column.field)}
                          onChange={() => handleColumnChange(column.field)}
                        />
                        {column.title}
                      </MenuItem>
                    ))}
                  </MenuList>
                </ClickAwayListener>
              </Paper>
            </Popover>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TextField
              label="Search"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" />,
              }}
            />
            <Box sx={{ display: 'flex' }}>
              <Tooltip title="Add">
                <IconButton onClick={handleAddRow} size="small">
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <span>
                  <IconButton onClick={handleRemoveRow} disabled={currentSelectedIds.length === 0} size="small">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Download JSON">
                <IconButton onClick={handleDownloadJson} size="small">
                  <CloudDownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Upload JSON">
                <IconButton component="label" size="small">
                  <CloudUploadIcon fontSize="small" />
                  <input type="file" accept=".json" onChange={handleUploadJson} hidden />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
        <TableContainer>
          <Table
            sx={{ minWidth: 750 }}
            aria-labelledby="tableTitle"
            size={'small'}
          >
            <TableHead>
              <StyledTableHeadRow>
                <TableCell></TableCell>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={(() => {
                            if (externallySelectedIds !== undefined) {
                              const digitizableFiles = displayData.filter(row => isDigitizable(row));
                              return digitizableFiles.length > 0 && currentSelectedIds.length === digitizableFiles.length;
                            }
                            return displayData.length > 0 && currentSelectedIds.length === displayData.length;
                          })()}
                          onChange={handleSelectAllRows}
                          indeterminate={(() => {
                            if (externallySelectedIds !== undefined) {
                              const digitizableFiles = displayData.filter(row => isDigitizable(row));
                              return currentSelectedIds.length > 0 && currentSelectedIds.length < digitizableFiles.length;
                            }
                            return currentSelectedIds.length > 0 && currentSelectedIds.length < displayData.length;
                          })()}
                          size="small" // Apply consistent size
                          color="primary" // Apply consistent color
                        />
                      </TableCell>
                      {columns
                        .filter(column => selectedColumns.includes(column.field))
                        .map(column => (
                          <TableCell
                            key={column.field}
                            sortDirection={sortBy === column.field ? sortOrder : false}
                          >
                            <TableSortLabel
                              active={sortBy === column.field}
                              direction={sortBy === column.field ? sortOrder : 'asc'}
                              onClick={handleSort(column.field)}
                            >
                              {column.title}
                            </TableSortLabel>
                          </TableCell>
                        ))}
                      <TableCell>Actions</TableCell>
                    </StyledTableHeadRow>
                  </TableHead>
                  <TableBody>
                    {displayData.map((row, index) => {
                      const isItemSelected = isRowSelected(row.id);
                      const labelId = `enhanced-table-checkbox-${row.id}`;
                      const isFileDigitizable = isDigitizable(row);
                      const isExternalSelection = externallySelectedIds !== undefined;
                      const isRowDisabled = isExternalSelection && !isFileDigitizable;

                      return (
                        <StyledTableRow
                          hover={!isRowDisabled}
                          onClick={(event) => handleSelectRow(event, row.id, row)}
                          role="checkbox"
                          aria-checked={isItemSelected}
                          tabIndex={-1}
                          key={row.id}
                          selected={isItemSelected}
                          draggable={!isRowDisabled}
                          onDragStart={() => !isRowDisabled && handleDragStart(row)}
                          onDragEnter={() => !isRowDisabled && handleDragEnter(row)}
                          onDragEnd={handleDragEnd}
                          sx={{
                            opacity: isRowDisabled ? 0.5 : 1,
                            cursor: isRowDisabled ? 'not-allowed' : 'pointer',
                            '&:hover': {
                              backgroundColor: isRowDisabled ? 'transparent' : undefined
                            }
                          }}
                        >
                          <TableCell sx={{ width: 40 }}>
                            <IconButton
                              aria-label="drag"
                              onClick={(event) => event.stopPropagation()}
                              size="small"
                              disabled={isRowDisabled}
                              sx={{ opacity: isRowDisabled ? 0.3 : 1 }}
                            >
                              <MenuIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isItemSelected}
                              onChange={(event) => handleSelectRow(event, row.id, row)}
                              inputProps={{ 'aria-labelledby': labelId }}
                              size="small"
                              color="primary"
                              disabled={isRowDisabled}
                              sx={{ opacity: isRowDisabled ? 0.3 : 1 }}
                            />
                          </TableCell>
                          {columns
                            .filter(column => selectedColumns.includes(column.field))
                            .map(column => (
                              <TableCell
                                key={`${row.id}-${column.field}`}
                                component="th"
                                id={labelId}
                                scope="row"
                                sx={{
                                  opacity: isRowDisabled ? 0.5 : 1,
                                  color: isRowDisabled ? 'text.disabled' : 'inherit'
                                }}
                              >
                                {column.render ? column.render(row, column, { disabled: isRowDisabled }) : row[column.field]}
                              </TableCell>
                            ))}
                          <TableCell sx={{ width: 60 }}>
                            <Tooltip title="Edit">
                              <IconButton
                                onClick={() => handleUpdateRow(row)}
                                size="small"
                                disabled={isRowDisabled}
                                sx={{ opacity: isRowDisabled ? 0.3 : 1 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </StyledTableRow>
                      );
                    })}
                  </TableBody>
                </Table>
          </TableContainer>
        </Paper>
        <Dialog open={openAddDialog} onClose={handleCloseAddDialog}>
          <DialogTitle>Add New Row</DialogTitle>
          <DialogContent>
            {columns.filter(column => column.dialogVisible !== false).map(column => (
              column.dialogRender ? (
                <Box key={column.field} margin="dense">
                  {column.dialogRender({
                    value: newRow[column.field] !== undefined ? newRow[column.field] : '',
                    onChange: (value) => handleChangeNewRow({ target: { name: column.field, value: value } }),
                    label: column.title,
                    name: column.field
                  })}
                </Box>
              ) : (
                <TextField
                  key={column.field}
                  autoFocus={column.field === columns.filter(c => c.dialogVisible !== false)[0]?.field}
                  margin="dense"
                  name={column.field}
                  label={column.title}
                  type="text"
                  fullWidth
                  value={newRow[column.field] !== undefined ? newRow[column.field] : ''}
                  onChange={handleChangeNewRow}
                />
              )
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAddDialog}>Cancel</Button>
            <Button onClick={handleSaveAddDialog}>Add</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={openEditDialog} onClose={handleCloseEditDialog}>
          <DialogTitle>Edit Row</DialogTitle>
          <DialogContent>
            {editRow && columns.filter(column => column.dialogVisible !== false).map(column => (
              column.dialogRender ? (
                <Box key={column.field} margin="dense">
                   {column.dialogRender({
                    value: newRow[column.field] !== undefined ? newRow[column.field] : editRow[column.field],
                    onChange: (value) => handleChangeNewRow({ target: { name: column.field, value: value } }),
                    label: column.title,
                    name: column.field
                  })}
                </Box>
              ) : (
                <TextField
                  key={column.field}
                  autoFocus={column.field === columns.filter(c => c.dialogVisible !== false)[0]?.field}
                  margin="dense"
                  name={column.field}
                  label={column.title}
                  type="text"
                  fullWidth
                  value={newRow[column.field] !== undefined ? newRow[column.field] : editRow[column.field]}
                  onChange={handleChangeNewRow}
                />
              )
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditDialog}>Cancel</Button>
            <Button onClick={handleSaveEditDialog}>Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
