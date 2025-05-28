# Plan: Connect Menu Items to Sidebar

**Objective:** Connect the menu items managed by the `SidebarMenuItemEditor` (which fetches data from `/api/blocks/sidebar_menus`) to the actual sidebar menu in `MyMenu.jsx`.

**1. Information Gathering:**

*   Examined the following files:
    *   [`frontend/src/admin/SidebarMenuItemEditor.jsx`](frontend/src/admin/SidebarMenuItemEditor.jsx)
    *   [`frontend/src/admin/SidebarMenuCategoryEditor.jsx`](frontend/src/admin/SidebarMenuCategoryEditor.jsx)
    *   [`frontend/src/admin/MyMenu.jsx`](frontend/src/admin/MyMenu.jsx)
    *   [`frontend/src/admin/MyLayout.jsx`](frontend/src/admin/MyLayout.jsx)
    *   [`frontend/src/SettingsPage.jsx`](frontend/src/SettingsPage.jsx)

**2. Clarifying Questions:**

*   The menu items list is located in `frontend/src/SettingsPage.jsx`.
*   The user wants to keep the option open for grouping menu items into categories, but for now, they want simple items.

**3. Plan Creation:**

*   The goal is to replace the static `menuItems` array in `MyMenu.jsx` with the dynamic data fetched from the `/api/blocks/sidebar_menus` endpoint, while also handling categories.
*   Here's how I plan to achieve this:
    1.  **Modify `MyMenu.jsx`:**
        *   Remove the existing `menuItems` array.
        *   Fetch the menu items from the `/api/blocks/sidebar_menus` endpoint using `useEffect` and `useState`.
        *   Fetch the menu categories from the `/api/blocks/sidebar_menu_categories` endpoint using `useEffect` and `useState`.
        *   Create a function to group the menu items by `category_id`. If a menu item doesn't have a `category_id`, it should be added to a default "Ungrouped" category.
        *   Update the `MultiLevelMenu` component to use the grouped menu items.
    2.  **Ensure Data Consistency:**
        *   The data fetched from the API needs to be in the correct format for the `MultiLevelMenu` component. I'll need to ensure that the API response matches the expected structure or transform the data accordingly.

**Mermaid Diagram:**

```mermaid
graph LR
    A[Start] --> B{Information Gathering};
    B --> C{Modify MyMenu.jsx};
    C --> D{Fetch menu items from API};
    D --> E{Fetch menu categories from API};
    E --> F{Group menu items by category};
    F --> G{Update MultiLevelMenu};
    G --> H{Ensure Data Consistency};
    H --> I{User Review};
    I --> J{Revise Plan};
    J --> K{User Approval};
    K --> L{Switch to Code Mode};
    L --> M{Implement Solution};
    M --> N{Write Plan to Markdown File};
    N[End];