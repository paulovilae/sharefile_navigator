# SharePointLibrariesExplorer

A modern, visually appealing React-admin list component for displaying SharePoint libraries as either a card grid or a table list, inspired by best-in-class file explorers.

## Features
- Toggle between card grid and table list views
- Beautiful Material-UI cards with hover effects
- Easily extensible: add actions, fields, or custom styles
- Works with React-admin Community Edition

## Usage

1. **Register the resource in your `App.jsx`:**

```jsx
import SharePointLibrariesExplorer from './resources/sharepoint/SharePointLibrariesExplorer';

<Resource
    name="sharepoint/libraries"
    options={{ label: "SharePoint Libraries" }}
    list={SharePointLibrariesExplorer}
/>
```

2. **The component will automatically fetch and display your libraries.**
   - Users can toggle between a grid of cards and a table list using the button in the toolbar.

## Customization

- **Add more fields to the cards:**
  Edit the `CardGrid` component in `SharePointLibrariesExplorer.jsx` and add more fields from your library records.
- **Add actions (e.g., edit, delete):**
  Use the `CardActions` section in each card to add buttons or links.
- **Change card style:**
  Adjust the `sx` prop on the `Card` component for different colors, shadows, or layouts.

## Inspiration
- Inspired by modern file explorers (Google Drive, OneDrive, Dropbox) for a clean, user-friendly experience.
- Uses Material-UI v5 and React-admin best practices.

## Extending
- You can add click handlers to cards for navigation or preview.
- Add badges, icons, or status indicators as needed.

---

**Feel free to further customize this component to fit your application's needs!** 