# Final Refactoring Plan: Frontend "Explorers, Flows, and Spaces" Architecture

**1. Introduction & Goals**

This plan refactors the frontend application to create a simpler, more modular architecture for file exploration and workflow management. The current implementation, primarily in [`frontend/src/resources/sharepoint/SharePointLibrariesExplorer.jsx`](frontend/src/resources/sharepoint/SharePointLibrariesExplorer.jsx), [`frontend/src/blocks/ShareFile_Manager.jsx`](frontend/src/blocks/ShareFile_Manager.jsx), and [`frontend/src/resources/sharepoint/WorkflowEngine.jsx`](frontend/src/resources/sharepoint/WorkflowEngine.jsx), will be restructured into a three-tier architecture: "Explorers," "Flows," and "Spaces."

The primary goals are:
*   Decouple file/data source interaction into reusable "Explorer" components.
*   Centralize pipeline definition and block management into "Flow" components.
*   Create a top-level "Space" component to act as a canvas for managing multiple "Flows" and potentially other UI elements.
*   Improve code reusability, reduce duplication, and enhance clarity and separation of concerns.

**2. Proposed Component Architecture: Explorers, Flows, Spaces**

**2.1. Explorer Components (e.g., `SharePointExplorer.jsx`)**

*   **Conceptual Role:** The "LEGO Bricks" or "Raw Material Providers."
*   **Purpose:** Responsible for interacting with a specific data source (e.g., SharePoint, Google Drive, local file system) to allow users to browse and select items (files, folders, data entries). Each explorer is specialized for its source.
*   **Location:** `frontend/src/explorers/` (e.g., `frontend/src/explorers/SharePointExplorer.jsx`)
*   **Key Responsibilities:**
    *   Fetching and displaying data from its specific source.
    *   Handling navigation within the source (e.g., drill-down, back).
    *   Managing item selection.
    *   Providing an interface (e.g., callback prop `onSelectionComplete(selectedItems)`) to pass selected items to a consuming component (typically a `Flow` component).
*   **Props (Example for `SharePointExplorer.jsx`):**
    *   `onSelectionComplete`: `function(selectedItems)`
    *   `multiSelect`: `boolean`
    *   `initialPath`: (Optional)
*   **State (Example for `SharePointExplorer.jsx`):**
    *   `currentPath`, `items`, `selectedItemsInternal`, `navigationStack`, `isLoading`, `error`.
*   **Note:** Generic UI parts like a file table/grid view (e.g., `GenericFileEditor.jsx`) could be shared components in `frontend/src/components/`.

**2.2. `Flow.jsx` Component**

*   **Conceptual Role:** The "LEGO Item" (a house, a car) or a "Data Pipeline/Stream."
*   **Purpose:** Defines and manages a single, end-to-end sequence of operations. It starts with data acquisition (typically using an `Explorer` component as its first step) and then allows users to add, configure, reorder, and remove a series of processing blocks from a `BLOCK_LIBRARY`.
*   **Location:** `frontend/src/flows/Flow.jsx`
*   **Key Responsibilities:**
    *   Instantiating and managing an `Explorer` component (e.g., `SharePointExplorer`) to get initial data. The selected data from the explorer becomes the input for the flow.
    *   Managing an ordered list of "processing blocks" (e.g., PDF Converter, OCR). Each block in the list is an instance of a component from `frontend/src/flows/blocks/`.
    *   Allowing users to add blocks from the `BLOCK_LIBRARY` (defined in `frontend/src/constants/blockLibrary.js`).
    *   Handling the configuration of each processing block.
    *   Managing data flow between processing blocks (e.g., output of PDF Converter becomes input for OCR).
    *   Implementing drag-and-drop for reordering processing blocks.
    *   Providing its entire configuration (explorer selection, block sequence, block configs) to its parent (typically the `Space` component).
*   **Props:**
    *   `initialConfiguration`: (Optional) Object to hydrate the flow's state (explorer selection, block sequence, configs).
    *   `onConfigurationChange`: `function(flowConfiguration)` - Callback when the flow's setup changes.
    *   `blockLibrary`: The `BLOCK_LIBRARY` constant.
*   **State:**
    *   `explorerSelection`: Data selected from the embedded explorer.
    *   `processingBlocks`: Array of objects, each representing a configured processing block in the sequence (`{ id, type, config, output }`).
    *   `expandedBlocks`, `currentProcessingStep`.
*   **Processing Block Components:**
    *   Located in: `frontend/src/flows/blocks/` (e.g., `PDFConverterBlock.jsx`, `OCRBlock.jsx`).
    *   These are the individual operational units used within a `Flow`.

**2.3. `Space.jsx` Component**

*   **Conceptual Role:** The "LEGO World" or "Canvas."
*   **Purpose:** The main top-level application component. It acts as a workspace or canvas where users can create, arrange, manage, and interact with multiple instances of `Flow` components. It's also designed to potentially incorporate other UI elements (notes, images, etc.) in the future.
*   **Location:** `frontend/src/Space.jsx`
*   **Key Responsibilities:**
    *   Managing a collection of `Flow` component instances.
    *   Allowing users to add new `Flows` to the `Space` and remove existing ones.
    *   Handling the layout or arrangement of `Flows` within the `Space` (if applicable).
    *   Saving and loading the entire state of the `Space`, including the configurations of all `Flows` it contains. This will involve API interactions.
    *   Providing the main application UI (toolbars, menus for space-level operations).
*   **Props:**
    *   `spaceId`: (Optional) For loading a specific space.
*   **State:**
    *   `spaceName`, `spaceDescription`.
    *   `flowInstances`: An array or object mapping of `Flow` configurations currently active in the space. Each entry would be the `flowConfiguration` for a `Flow.jsx` instance.
    *   `(Future state for other canvas items: notes, images, etc.)`

**3. Data Flow Summary**

1.  **`Space.jsx`** initializes, potentially loading a saved space configuration. This includes the configurations for any `Flow` instances.
2.  `Space.jsx` renders its managed **`Flow.jsx`** instances, passing their respective `initialConfiguration`.
3.  Each **`Flow.jsx`** instance:
    *   Renders its embedded **`Explorer`** (e.g., `SharePointExplorer.jsx`).
    *   The `Explorer` handles user interaction for data selection and calls `onSelectionComplete` with the chosen items.
    *   `Flow.jsx` stores this `explorerSelection` and uses it as the input for its sequence of processing blocks.
    *   Users add, configure, and reorder processing blocks within the `Flow.jsx`. The output of one block can feed into the next.
    *   Any change in the `Flow.jsx`'s configuration (explorer selection, block sequence/configs) triggers its `onConfigurationChange` callback, notifying `Space.jsx`.
4.  **`Space.jsx`** receives updated configurations from its `Flow` instances and can then save the entire `Space` state.

**4. Directory Structure**

*   `frontend/src/`
    *   `explorers/` (Folder for data source interaction components)
        *   `SharePointExplorer.jsx`
        *   *(Future: `GoogleDriveExplorer.jsx`, etc.)*
    *   `flows/` (Folder for pipeline definition and its parts)
        *   `Flow.jsx` (The main component for defining a workflow pipeline)
        *   `blocks/` (Sub-directory for individual processing block components)
            *   `PDFConverterBlock.jsx`
            *   `OCRBlock.jsx`
            *   *(Other processing blocks)*
    *   `components/` (Shared, generic UI components like accordions, drag handles, generic tables/grids)
        *   `SlimBlockAccordion.jsx`
        *   `DragHandle.jsx`
        *   `GenericFileEditor.jsx`
    *   `utils/` (Utility functions: API calls, formatting, etc.)
    *   `constants/`
        *   `blockLibrary.js` (Defines available processing blocks for `Flow.jsx`)
    *   `Space.jsx` (The main top-level application component/canvas)
    *   `App.jsx`, `main.jsx` (Standard React setup files)

**5. Mermaid Diagram (Updated Names)**

```mermaid
graph TD
    subgraph Space [frontend/src/Space.jsx]
        S_State[State: spaceName, flowInstancesConfigs[]]
        S_Props[Props: spaceId?]
        S_Funcs[Functions: saveSpace, loadSpace, addFlow, removeFlow]
        Flow_Instance1[Flow Instance 1]
        Flow_Instance2[Flow Instance 2 (optional)]

        S_State --> Flow_Instance1
        S_State --> Flow_Instance2
        S_Funcs -.-> Flow_Instance1
    end

    subgraph Flow [frontend/src/flows/Flow.jsx]
        direction LR
        F_State[State: explorerSelection, processingBlocks[]]
        F_Props[Props: initialConfiguration, onConfigurationChange, blockLibrary]
        F_Funcs[Functions: addProcessingBlock, removeProcessingBlock, reorderBlock, manageBlockConfig]

        subgraph Explorer_Wrapper [Embedded Explorer]
            E1[Explorer Instance (e.g., SharePointExplorer)]
        end

        subgraph Processing_Blocks [Processing Blocks]
            PB1[SpecificBlock Instance e.g., PDFConverterBlock]
            PB2[SpecificBlock Instance e.g., OCRBlock]
        end

        F_State --> E1
        F_State --> PB1
        F_State --> PB2
        E1 -- onSelectionComplete --> F_Funcs
        PB1 -- onConfigChange --> F_Funcs
        F_Funcs -- updates processingBlocks[] --> F_State
        F_Funcs -- calls onConfigurationChange --> S_Funcs
    end

    subgraph Explorer_Comp [frontend/src/explorers/SharePointExplorer.jsx]
        direction LR
        E_State[State: currentPath, items[], selectedItemsInternal[]]
        E_Props[Props: onSelectionComplete]
        E_Funcs[Functions: fetchData, handleNavigation, handleSelection]
    end

    subgraph SpecificProcessingBlock_Comp [e.g., frontend/src/flows/blocks/PDFConverterBlock.jsx]
        direction LR
        SPB_State[State: specificConfigValues]
        SPB_Props[Props: config, inputData, onConfigChange]
        SPB_Funcs[Functions: processInput, updateConfig]
    end

    Flow_Instance1 --> E1
    Flow_Instance1 --> PB1
    Flow_Instance1 --> PB2
    E1 --> Explorer_Comp
    PB1 --> SpecificProcessingBlock_Comp

    classDef component fill:#f9f,stroke:#333,stroke-width:2px;
    classDef state fill:#lightgrey,stroke:#333;
    classDef props fill:#lightblue,stroke:#333;
    classDef funcs fill:#lightgreen,stroke:#333;

    class Space,Flow,Explorer_Comp,SpecificProcessingBlock_Comp component;
    class S_State,F_State,E_State,SPB_State state;
    class S_Props,F_Props,E_Props,SPB_Props props;
    class S_Funcs,F_Funcs,E_Funcs,SPB_Funcs funcs;
```

**6. Code Reuse, Refactoring, and Deprecation**

*   **To Create/New:**
    *   `frontend/src/explorers/SharePointExplorer.jsx` (from existing logic)
    *   `frontend/src/flows/Flow.jsx`
    *   `frontend/src/Space.jsx`
    *   `frontend/src/constants/blockLibrary.js`
    *   Utility files in `frontend/src/utils/` (centralizing existing helper functions).
    *   Processing block components in `frontend/src/flows/blocks/` (refactoring existing `PDFConverterBlock.jsx`, `OCRBlock.jsx`).
*   **To Refactor/Modify:**
    *   Existing `PDFConverterBlock.jsx`, `OCRBlock.jsx` to fit the `Flow.jsx` model (receive config/inputData, provide `onConfigChange`).
    *   `frontend/src/components/GenericFileEditor.jsx` for general use by explorers.
*   **To Extract & Reuse:**
    *   `SlimBlockAccordion`, `DragHandle` into `frontend/src/components/`.
    *   Helper functions into `frontend/src/utils/`.
*   **To Deprecate/Remove:**
    *   [`frontend/src/resources/sharepoint/SharePointLibrariesExplorer.jsx`](frontend/src/resources/sharepoint/SharePointLibrariesExplorer.jsx)
    *   [`frontend/src/blocks/ShareFile_Manager.jsx`](frontend/src/blocks/ShareFile_Manager.jsx)
    *   [`frontend/src/resources/sharepoint/WorkflowEngine.jsx`](frontend/src/resources/sharepoint/WorkflowEngine.jsx)
    *   (Their functionalities will be migrated to the new structure.)

**7. Considerations for Implementation (Paths, State, Cache - as per your reminder)**

*   **Paths:** Ensure all component imports and API call paths are robust.
*   **Persistent State:**
    *   `Space.jsx` will be responsible for orchestrating the saving and loading of the entire space configuration (including all its flows) likely via API calls to the backend.
    *   Consider `localStorage` for temporary UI state persistence (e.g., last active tab, unsaved changes warnings) but not for primary data storage.
*   **Memory Management:**
    *   Be mindful of the number of `Flow` instances and the data they might hold, especially if rendering many complex flows in a single `Space`.
    *   Virtualization techniques could be considered if a `Space` can contain a very large number of `Flows` or if `Flows` themselves become very long.
*   **Caching:**
    *   Cache API responses where appropriate (e.g., SharePoint file/folder listings within an `Explorer` session, `BLOCK_LIBRARY` if it becomes dynamic). React Query or SWR can help here.