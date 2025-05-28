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
  height: '20px', // Reduced row height to 50%
}));

const StyledTableHeadRow = styled(TableRow)(({ theme }) => ({
  height: '40px', // Original row height for header
}));

export default function GenericFileEditor({ data, columns, onAddRow, onRemoveRow, onUpdateRow, onReorder }) {
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedColumns, setSelectedColumns] = useState(columns.filter(column => !column.hidden).map(column => column.field));
  const [selectedRows, setSelectedRows] = useState([]);
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
    setRows(sortedData); // Update rows state after sorting
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

  const handleSelectAllRows = (event) => {
    if (event.target.checked) {
      setSelectedRows(rows.map(row => row.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (event, id) => {
    const selectedIndex = selectedRows.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedRows, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedRows.slice(1));
    } else if (selectedIndex === rows.length - 1) {
      newSelected = newSelected.concat(selectedRows.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedRows.slice(0, selectedIndex),
        selectedRows.slice(selectedIndex + 1),
      );
    }

    setSelectedRows(newSelected);
  };

  const handleAddRow = () => {
    setOpenAddDialog(true);
    setNewRow({});
  };

  const handleRemoveRow = () => {
    if (onRemoveRow) {
      selectedRows.forEach(rowId => onRemoveRow(rowId));
      setSelectedRows([]);
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

  const isRowSelected = (id) => selectedRows.indexOf(id) !== -1;

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
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Select Columns">
              <IconButton onClick={handleColumnClick}>
                <ViewColumnIcon />
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
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              label="Search"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon />,
              }}
            />
            <Box>
              <Tooltip title="Add">
                <IconButton onClick={handleAddRow}>
                  <AddIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton onClick={handleRemoveRow} disabled={selectedRows.length === 0}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download JSON">
                <IconButton onClick={handleDownloadJson}>
                  <CloudDownloadIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Upload JSON">
                <IconButton component="label">
                  <CloudUploadIcon />
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
                  size={'medium'}
                  
                  
                >
                  <TableHead>
                    <StyledTableHeadRow>
                      <TableCell></TableCell> {/* Spacer for drag handle */}
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          onChange={handleSelectAllRows}
                          checked={selectedRows.length === rows.length && rows.length !== 0}
                          indeterminate={selectedRows.length > 0 && selectedRows.length < rows.length}
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
                  <TableBody >
                    {filteredData.map((row, index) => {
                      const isItemSelected = isRowSelected(row.id);
                      const labelId = `enhanced-table-checkbox-${row.id}`;

                      return (
                        
                            <StyledTableRow
                              hover
                              onClick={(event) => handleSelectRow(event, row.id)}
                              role="checkbox"
                              aria-checked={isItemSelected}
                              tabIndex={-1}
                              key={row.id}
                              selected={isItemSelected}
                              draggable
                              onDragStart={() => handleDragStart(row)}
                              onDragEnter={() => handleDragEnter(row)}
                              onDragEnd={handleDragEnd}
                            >
                              <TableCell>
                                <IconButton aria-label="drag"  onClick={(event) => event.stopPropagation()}>
                                  <MenuIcon />
                                </IconButton>
                              </TableCell>
                              <TableCell padding="checkbox">
                                <input
                                  type="checkbox"
                                  checked={isItemSelected}
                                  onChange={(event) => handleSelectRow(event, row.id)}
                                  inputProps={{ 'aria-labelledby': labelId }}
                                />
                              </TableCell>
                              {columns
                                .filter(column => selectedColumns.includes(column.field))
                                .map(column => (
                                  <TableCell key={`${row.id}-${column.field}`} component="th" id={labelId} scope="row">
                                    {column.render ? column.render(row, column) : row[column.field]}
                                  </TableCell>
                                ))}
                              <TableCell>
                                <Tooltip title="Edit">
                                  <IconButton onClick={() => handleUpdateRow(row)}>
                                    <EditIcon />
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
