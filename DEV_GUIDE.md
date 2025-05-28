# Developer Guide

> This is the unified developer guide for the CHRISTUS Health OCR Workflow project. It covers both frontend (React, MUI, React-Admin) and backend (FastAPI, SQLAlchemy) conventions, best practices, and integration points. Use this as your main reference for full-stack development, onboarding, and team collaboration.

## Adding a New Page or Resource

1. **Create Your Page Component**
   - Place it in `src/resources/` or a relevant subfolder.
   - Use MUI and follow the CHRISTUS theme.
   - Include clear field labels, instructions, and contextual help for users.

2. **Register as a Resource in `App.jsx`**
   - Use the `<Resource>` component:
     ```jsx
     <Resource
       name="blocks"
       options={{ label: "Blocks" }}
       list={BlocksPage}
     />
     ```
   - This ensures the page is routed and themed like all other admin pages.

3. **Add a Menu Entry**
   - Edit `src/admin/MyMenu.jsx`:
     ```jsx
     {
       type: 'link',
       label: 'Blocks',
       to: '/blocks',
       icon: <CategoryIcon sx={{ color: getIconColor() }} />, 
     }
     ```
   - Use the same approach as other working menu items.

4. **Best Practices for Fields and Help**
   - Always provide clear field labels and descriptions.
   - Add contextual help (tooltips, info icons, or inline text) for each field, especially if the field is not self-explanatory.
   - If a resource has only a few fields, consider adding a short instruction or example above the form.
   - **For every form field:**
     - Use `helperText` for a short description or example.
     - Use `placeholder` for an example value.
     - Add a tooltip/info icon for extra details if needed.
     - Add a short instruction at the top of the form/dialog.

5. **Example: Block Categories**
   - Block Categories should have at least these fields:
     - `name` (required): The display name of the category.
     - `description` (optional): A short description of what this category is for.
   - Add a short instruction at the top of the form:
     > "Categories help organize block templates. Use a clear, descriptive name."
   - For more complex resources, add tooltips or info icons next to each field.
   - **Example implementation:**
     ```jsx
     <Box sx={{ mb: 2 }}>
       Categories help organize block templates. Use a clear, descriptive name.
     </Box>
     <TextField
       name="name"
       label={<span>Name&nbsp;<Tooltip title="A short, descriptive name for this category (e.g., 'File Managers', 'OCR Tools')"><HelpOutlineIcon fontSize="small" color="action" /></Tooltip></span>}
       placeholder="e.g. File Managers"
       helperText="Required. The display name for this category."
     />
     <TextField
       name="description"
       label={<span>Description&nbsp;<Tooltip title="Optional. Add a short description to help users understand what blocks belong here."><HelpOutlineIcon fontSize="small" color="action" /></Tooltip></span>}
       placeholder="e.g. Blocks for browsing and managing files"
       helperText="Optional. A short description of this category."
     />
     ```

6. **Testing and Consistency**
   - Test navigation from the sidebar.
   - Ensure the page uses the CHRISTUS theme and layout.
   - Check that all help/instructions are visible and clear.

---

## Backend Developer Best Practices

1. **FastAPI Endpoint Conventions**
   - Use RESTful naming: `/resource` for single, `/resources` for collections.
   - Use plural for GET (list), singular for POST (create), e.g.:
     - `GET /api/blocks/block_categories` (list)
     - `POST /api/blocks/block_category` (create)
   - Use appropriate HTTP verbs: GET, POST, PUT, DELETE.
   - Group related endpoints in routers (e.g., `blocks.py`).
   - Add tags for OpenAPI docs (e.g., `tags=["Block Categories"]`).

2. **SQLAlchemy Models**
   - Define all models in `models.py` using declarative base.
   - Use `nullable=False` for required fields.
   - Use relationships for foreign keys.
   - Add `created_at` and `updated_at` timestamps for auditability.
   - Use `unique=True` where appropriate (e.g., usernames, category names).

3. **Alembic Migrations**
   - Always generate a migration after changing models:
     - `alembic revision --autogenerate -m "Describe change"`
     - `alembic upgrade head`
   - Review generated migrations for accuracy before applying.
   - Keep migration history clean and descriptive.

4. **Pydantic Schemas**
   - Define `Base`, `Create`, and `Read` schemas for each model in `schemas.py`.
   - Use `orm_mode = True` in `Read` schemas for SQLAlchemy compatibility.
   - Use type hints and Optional fields for clarity.
   - Keep schemas in sync with models.

5. **Error Handling**
   - Use `HTTPException` for API errors (e.g., 404, 400).
   - Return clear error messages for missing resources or invalid input.
   - Validate input in Pydantic schemas.

6. **API Documentation**
   - Use FastAPI's built-in OpenAPI docs (`/docs`).
   - Add descriptions and tags to endpoints for clarity.
   - Document request/response models in schemas.

7. **Security**
   - Use authentication and authorization for sensitive endpoints.
   - Never expose passwords or secrets in responses or logs.
   - Sanitize user input to prevent SQL injection and XSS.
   - Use HTTPS in production.

8. **Integration with Frontend**
   - Keep API responses consistent and predictable.
   - Use camelCase or snake_case consistently (document your choice).
   - Return lists for collections, objects for single resources.
   - Document any breaking changes in the guide.

9. **Maintainability**
   - Keep code modular: separate routers, models, schemas, and utils.
   - Use clear, descriptive names for models, endpoints, and fields.
   - Remove unused code and endpoints regularly.
   - Write docstrings for complex functions/classes.

10. **Testing**
    - Write unit tests for critical logic and API endpoints.
    - Use FastAPI's `TestClient` for API tests.
    - Test migrations and data integrity after model changes.

---

## Backend Endpoint Naming
- **Plural for GET, Singular for POST:**
  - To list all categories: `GET /api/blocks/block_categories`
  - To create a category: `POST /api/blocks/block_category` (not plural!)
- This pattern is used for other block resources as well. Always check the backend API for the correct endpoint.

---

## Other Best Practices
- Use MUI components and CHRISTUS theme for all UI.
- Keep page components modular and organized.
- Document any new API endpoints or data requirements.
- For advanced help, consider using a help icon (`<HelpOutlineIcon />`) with a tooltip or popover.

---

## To Do

- Expand this guide with more examples as the app grows.

## Bulk Create for Block Categories and Templates

To speed up onboarding, migration, or large-scale editing, you can now use the **Bulk Create** feature for both Block Categories and Block Templates in the admin UI.

- On the Blocks page, in either the Categories or Templates tab, click the **Bulk Create** button.
- Paste a JSON array of objects (see the example in the dialog for required fields).
- Submit to create all items at once. Success and error feedback will be shown.
- The table will reload with your new items.

**Best Practices:**
- Use this feature to seed initial data, migrate from another system, or quickly create many similar blocks.
- Always double-check your JSON for required fields and correct types (see the example in the dialog).
- For templates, ensure `category_id` matches an existing category.
- You can use this feature repeatedly; duplicates will be rejected by the backend if unique constraints are violated.
- This is especially useful for admins and developers managing large block libraries.

**Example JSON for Categories:**
```json
[
  { "name": "File Managers", "description": "Blocks for browsing, uploading, and managing files and folders.", "icon": "Folder" },
  { "name": "PDF Tools", "description": "Blocks for converting, splitting, merging, and manipulating PDF documents.", "icon": "PictureAsPdf" }
]
```

**Example JSON for Templates:**
```json
[
  { "category_id": 1, "type": "ocr_easyocr", "display_name": "OCR (EasyOCR)", "description": "Extract text from images or PDFs using EasyOCR.", "enabled": true, "config_schema": { "lang": { "type": "string", "default": "en" } }, "component": "OCRBlock" }
]
```

## Bulk/Multiple Select for Batch Actions

If you provide a **Bulk Create** option, you should also provide a way for users to select multiple items in a table or list for batch actions (such as delete, enable/disable, or move).

- Add checkboxes to each row in your table, and a master checkbox in the header to select all.
- Provide batch action buttons (e.g., Delete Selected, Enable Selected) that operate on all selected items.
- Always confirm destructive actions (like delete) with a dialog.
- Show clear feedback after batch actions (success, errors, etc.).
- Make sure the UI is accessible and works with keyboard navigation.

**Best Practices:**
- Keep batch actions visible but unobtrusive (e.g., above or below the table).
- Disable batch actions if no items are selected.
- Clearly indicate how many items are selected.
- For large tables, support selecting all items across pages if possible.

**Example (React/MUI Table):**
```jsx
<TableHead>
  <TableRow>
    <TableCell padding="checkbox">
      <Checkbox
        indeterminate={selected.length > 0 && selected.length < rows.length}
        checked={rows.length > 0 && selected.length === rows.length}
        onChange={handleSelectAll}
      />
    </TableCell>
    {/* ...other columns... */}
  </TableRow>
</TableHead>
<TableBody>
  {rows.map(row => (
    <TableRow key={row.id} selected={selected.includes(row.id)}>
      <TableCell padding="checkbox">
        <Checkbox
          checked={selected.includes(row.id)}
          onChange={() => handleSelect(row.id)}
        />
      </TableCell>
      {/* ...other cells... */}
    </TableRow>
  ))}
</TableBody>
```

**Batch Action Example:**
```jsx
<Button
  variant="contained"
  color="secondary"
  disabled={selected.length === 0}
  onClick={handleDeleteSelected}
>
  Delete Selected
</Button>
```

This ensures your admin UI is efficient for both bulk creation and bulk management of resources.

## Block Management and Deployment Approach

This project uses an innovative hybrid approach for workflow blocks:

- **Block templates are managed in the database and via the API/UI.**
- **Deploying a block template** writes a hardcoded React component to `frontend/src/blocks/BlockName.jsx`.
- **At runtime, blocks are imported statically** (hardcoded imports and mapping), ensuring fast, reliable execution with no runtime code evaluation or dynamic import complexity.
- **The database is the source of truth** for block metadata, configuration, and management.
- **The hardcoded React files are the "compiled"/"deployed" version** for fast, safe execution.
- **Block management (CRUD, metadata, config, etc.) is always done via the API/database.**
- **Block execution in the UI is always done via static imports and a mapping, for reliability and performance.**
- **Deploying a block template** is the bridge: it takes the code from the database and writes it as a real React component, which is then imported and mapped in the workflow engine.
- **No runtime code evaluation, no dynamic imports, no extra backend/database lookups at execution time.**
- **When a block template is deleted, the corresponding `.jsx` file is also deleted** from `frontend/src/blocks/`.

This approach combines the flexibility of dynamic block management with the performance and safety of static code execution. 