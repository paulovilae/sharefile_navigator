# Generic File Editor Component Plan

## 1. Analyze Existing Implementations:

*   **SettingsPage:** Examine the `GeneralSettingsTable` component in [`frontend/src/SettingsPage.jsx`](frontend/src/SettingsPage.jsx) to understand how it displays and edits settings data.
*   **BlocksPage:** Analyze the `BlockCategoriesTable` and `BlockTemplatesTable` components in [`frontend/src/resources/BlocksPage.jsx`](frontend/src/resources/BlocksPage.jsx) to understand how they handle sorting, column selection, row manipulation, and JSON upload/download.

## 2. Design the Reusable Component:

*   **Name:** `GenericFileEditor` or `ReusableTableEditor`
*   **Props:**
    *   `data`: The data to be displayed and edited (an array of objects).
    *   `columns`: An array of column definitions, including the column title, data field, data type, and whether to display an icon preview.
    *   `onAddRow`: A function to handle adding a new row.
    *   `onRemoveRow`: A function to handle removing a row.
    *   `onUpdateRow`: A function to handle updating a row.
    *   `onDownloadJson`: A function to handle downloading the data as JSON.
    *   `onUploadJson`: A function to handle uploading data from JSON.
*   **State:**
    *   `sortBy`: The column to sort by.
    *   `sortOrder`: The sort order (ascending or descending).
    *   `selectedColumns`: An array of the currently selected columns.
    *   `selectedRows`: An array of the currently selected rows.
    *   `searchTerm`: The text to search/filter by.
    *   `filteredData`: The data after applying the search/filter.

## 3. Implement the Component:

*   **Table Display:** Use the `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`, and `Checkbox` components from `@mui/material` to display the data in a table format.
    *   **Autonumbering:** Add a column to display the row number.
    *   **Icon Preview:** If the column definition specifies an icon preview, display the corresponding icon using the `iconMap` from `BlocksPage.jsx` or a similar mechanism.
*   **Sorting:** Implement sorting functionality by updating the `sortBy` and `sortOrder` state variables when a column header is clicked.
*   **Column Selection:** Implement column selection functionality using a `Select` component or a custom dropdown menu.
*   **Row Manipulation:** Implement add, remove, and update row functionality using buttons and dialogs, similar to the existing implementations in the SettingsPage and BlocksPage.
*   **JSON Upload/Download:** Implement JSON upload/download functionality using the `downloadJsonFile` function and the `BulkCreateDialog` component from the BlocksPage.
*   **Drag and Drop Repositioning:** Use a library like `react-beautiful-dnd` or `react-sortable-hoc` to enable drag and drop repositioning of rows.
*   **Search/Filter:** Implement search/filter functionality by updating the `searchTerm` state variable when the user types in a search box. Filter the data based on the `searchTerm` and the selected columns, and update the `filteredData` state variable.

## 4. Test the Component:

*   Create a test file with sample data and column definitions, including icon previews.
*   Render the component with the test data and verify that it displays correctly and that all the functionality works as expected, including sorting, column selection, row manipulation, JSON upload/download, drag and drop repositioning, and search/filter.

## 5. Refactor Existing Implementations:

*   Replace the existing table implementations in the SettingsPage and BlocksPage with the new `GenericFileEditor` component.

## Component Structure:

```mermaid
graph LR
    A[GenericFileEditor] --> B(Table Display with Autonumbering and Icon Preview);
    A --> C(Sorting);
    A --> D(Column Selection);
    A --> E(Row Manipulation);
    A --> F(JSON Upload/Download);
    A --> I(Drag and Drop Repositioning);
    A --> J(Search/Filter);
    A --> K(Data Validation);
    A --> L(Data Transformation);
    A --> M(Conditional Formatting);
    A --> N(Data Grouping/Aggregation);
    A --> O(Undo/Redo);
    A --> P(Accessibility);
    A --> G{Props: data, columns, onAddRow, onRemoveRow, onUpdateRow, onDownloadJson, onUploadJson};
    A --> H{State: sortBy, sortOrder, selectedColumns, selectedRows, searchTerm, filteredData};