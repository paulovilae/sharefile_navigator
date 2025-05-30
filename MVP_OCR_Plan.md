# MVP OCR and Search Application Rebuild Plan

**Project Goal:** Rebuild a "dirty MVP" of an OCR processing and search application that was lost, leveraging existing frontend and backend components, with a focus on SharePoint integration. UI components will use BlockTemplate styling, but full workflow execution is deferred. LLM review will connect to Gemini or Ollama for a numerical quality score.

**Core MVP Features:**

1.  **Frontend (React - leveraging `frontend/src/`):**
    *   **SharePoint File/Directory Selection:**
        *   Utilize and adapt the existing `frontend/src/explorers/SharePointExplorer.jsx` component to allow users to navigate SharePoint and select PDF files or entire directories.
        *   The selection should trigger an API call to the backend to initiate OCR processing.
    *   **OCR Status Display:**
        *   Integrate with `frontend/src/explorers/SharePointExplorer.jsx` or a new UI component to display the status of OCR processing for selected files (e.g., "Queued", "Processing OCR", "LLM Reviewing", "Retry w/ DPI", "Retry w/ Image OCR", "OCR Done", "Needs Manual Review", "Error"). This will likely involve polling a backend status endpoint.
        *   UI elements should use styling from `frontend/src/theme/blockTemplate.js` for consistency.
    *   **Search Interface:**
        *   Create a simple search bar/page.
        *   On search submission, call a backend API endpoint.
        *   Display search results, ideally linking back to the original files in SharePoint or providing a way to view/download the extracted text.
        *   UI elements should use styling from `frontend/src/theme/blockTemplate.js`.

2.  **Backend (FastAPI - leveraging `backend/app/`):**
    *   **API Endpoint for OCR Initiation:**
        *   Path: (e.g., `/api/ocr/process_sharepoint_item`)
        *   Input: SharePoint item details (drive ID, item ID, type: file/directory).
        *   Action:
            *   If directory, recursively find all PDF files.
            *   For each PDF file:
                *   Download the file from SharePoint (using existing logic in `backend/app/api/sharepoint.py`).
                *   Create an initial `OcrResult` entry in the database with status "Queued".
                *   Add the file to an asynchronous processing queue (e.g., Celery, FastAPI background tasks) for OCR.
    *   **OCR Processing Pipeline (Asynchronous Task):**
        *   Input: File path/content and `OcrResult` ID.
        *   **LLM Abstraction Layer:**
            *   Create a function/module in the backend (e.g., in `backend/app/utils/llm_utils.py`) that can connect to either Gemini or Ollama based on configuration.
            *   This layer will handle the API calls, authentication (if needed, especially for Gemini), and parsing the LLM's response to extract a numerical quality score.
            *   The system prompt for quality assessment will be passed to this function.
        *   **Configuration:**
            *   Allow configuration (e.g., via environment variables or a settings file) to specify:
                *   Which LLM to use (Gemini/Ollama).
                *   API endpoint/key for the selected LLM.
                *   The system prompt to be used for assessing OCR quality (this prompt should instruct the LLM to return a numerical score).
                *   The quality score threshold `X`.
        *   Steps:
            1.  Update `OcrResult` status to "Processing OCR".
            2.  Perform initial OCR (e.g., using Tesseract, EasyOCR via `backend/app/api/ocr.py` logic).
            3.  Update `OcrResult` status to "LLM Reviewing".
            4.  **LLM Quality Review (Gemini/Ollama):** Call the LLM abstraction layer with extracted text and system prompt to get a numerical quality score.
                *   If quality score < X:
                    *   Update `OcrResult` status to "Retry w/ DPI".
                    *   Retry OCR with higher DPI settings.
                    *   Update `OcrResult` status to "LLM Reviewing".
                    *   LLM Quality Review (Gemini/Ollama).
                    *   If quality score still < X:
                        *   Update `OcrResult` status to "Retry w/ Image OCR".
                        *   Convert PDF pages to images (if not already done) and perform image-based OCR.
                        *   Update `OcrResult` status to "LLM Reviewing".
                        *   LLM Quality Review (Gemini/Ollama).
                        *   If quality score still < X:
                            *   Update `OcrResult` status to "Needs Manual Review". Store any available text.
                        *   Else (score >= X after image OCR): Store text, update status to "OCR Done".
                    *   Else (score >= X after DPI retry): Store text, update status to "OCR Done".
                *   Else (score >= X initial attempt): Store text, update status to "OCR Done".
            5.  If any step fails, update `OcrResult` status to "Error" with an error message.
    *   **API Endpoint for OCR Status:**
        *   Path: (e.g., `/api/ocr/status/{ocr_result_id_or_file_id}`)
        *   Input: `OcrResult` ID or SharePoint file ID.
        *   Output: Current status and extracted text (if available).
    *   **API Endpoint for Text Search:**
        *   Path: (e.g., `/api/search`)
        *   Input: Search query (string).
        *   Action: Query the `ocr_results` table (specifically the extracted text column) in the database (e.g., using SQLAlchemy `LIKE` or a more advanced full-text search if the DB supports it easily).
        *   Output: List of matching documents (file name, SharePoint path/ID, snippet of matching text).
    *   **Database:**
        *   Utilize the existing SQLite database (`ocr.db`) and SQLAlchemy models (`backend/app/models.py`).
        *   The `OcrResult` table will be central for storing extracted text, file identifiers, and processing status.

**Deferred for Post-MVP:**

*   Full implementation of the block/workflow execution system.
*   Advanced LLM integration for quality review (beyond numerical score if needed, or more sophisticated prompting).
*   Sophisticated search features (e.g., ranking, faceting).
*   Detailed user roles and permissions.
*   Theming beyond using `blockTemplate.js` for basic styling.
*   Handling of non-PDF files for OCR.

**Workflow Diagram (Simplified MVP):**

```mermaid
graph TD
    A[Frontend: User selects PDF/Directory in SharePointExplorer] --> B{Backend: /api/ocr/process_sharepoint_item};
    B --> C[Download File(s)];
    C --> D[Create OcrResult entry (status: Queued)];
    D --> E[Add to Async OCR Queue];

    subgraph Async OCR Processing
        F[Get File from Queue] --> G[Update Status: Processing OCR];
        G --> H[Initial OCR Attempt];
        H --> I[Update Status: LLM Reviewing];
        I --> J{LLM Quality Score (Gemini/Ollama)};
        J -- Score < X --> K[Update Status: Retry w/ DPI];
        K --> L[OCR w/ Higher DPI];
        L --> M[Update Status: LLM Reviewing];
        M --> N{LLM Quality Score (Gemini/Ollama)};
        N -- Score < X --> O[Update Status: Retry w/ Image OCR];
        O --> P[Image-based OCR];
        P --> Q[Update Status: LLM Reviewing];
        Q --> R{LLM Quality Score (Gemini/Ollama)};
        R -- Score < X --> S[Update Status: Needs Manual Review];
        S --> T[Store Text & Final Status];
        R -- Score >= X --> T;
        N -- Score >= X --> T;
        J -- Score >= X --> T;
    end

    U[Frontend: User searches] --> V{Backend: /api/search};
    V --> W[Query OcrResult Table];
    W --> X[Frontend: Display Search Results];

    Y[Frontend: Polls for OCR Status] --> Z{Backend: /api/ocr/status};
    Z --> AA[Return OcrResult Status/Text];