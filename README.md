# SharePoint OCR Processing System

This project connects to SharePoint and processes PDF files using OCR.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables for OAuth2 (Microsoft Graph API):
- Create a `.env` file with:
  ```
  CLIENT_ID=your-client-id
  CLIENT_SECRET=your-client-secret
  TENANT_ID=your-tenant-id
  SHAREPOINT_SITE=christusco.sharepoint.com
  SHAREPOINT_SITE_NAME=AuditoriadeSoportesHC
  SHAREPOINT_DRIVE_NAME=Clnicas
  ```
  
  - You must register an app in Azure Active Directory to obtain these values.
  - Grant the app `Sites.Read.All` permission and consent as an admin.

3. Run the test connection and file download:
```bash
python test_connection.py
```

## Project Structure
- `requirements.txt`: Python dependencies
- `.env`: Environment variables
- `test_connection.py`: SharePoint connection and file download test
