import os
import fitz  # PyMuPDF
import easyocr
import pyodbc
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# SQL connection setup
def get_sql_conn():
    server = os.getenv('SQL_SERVER')
    database = os.getenv('SQL_DATABASE')
    username = os.getenv('SQL_USERNAME')
    password = os.getenv('SQL_PASSWORD')
    driver = os.getenv('SQL_DRIVER', '{ODBC Driver 18 for SQL Server}')
    extra = os.getenv('SQL_EXTRA', '')
    conn_str = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password}'
    if extra:
        conn_str += f';{extra}'
    return pyodbc.connect(conn_str)

# Download PDF (placeholder: use local file for now)
def get_pdf_file(local_path):
    return local_path

# Extract images from PDF
def extract_images_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    images = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap()
        img_bytes = pix.tobytes()
        images.append((page_num, img_bytes))
    return images

# Run OCR on images
def run_ocr_on_images(images):
    reader = easyocr.Reader(['en'], gpu=True)
    results = []
    for page_num, img_bytes in images:
        # Save image temporarily
        img_path = f"temp_page_{page_num}.png"
        with open(img_path, "wb") as f:
            f.write(img_bytes)
        ocr_result = reader.readtext(img_path, detail=0, paragraph=True)
        os.remove(img_path)
        results.append((page_num, ocr_result))
    return results

# Extract file metadata
def get_file_metadata(pdf_path):
    stat = os.stat(pdf_path)
    return {
        'file_path': os.path.abspath(pdf_path),
        'file_name': os.path.basename(pdf_path),
        'file_size': stat.st_size,
        'file_created_at': datetime.fromtimestamp(stat.st_ctime)
    }

# Insert into database
def insert_ocr_result(meta, ocr_text):
    conn = get_sql_conn()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO OCR_Results (file_path, file_name, file_size, file_created_at, ocr_text, status, processed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        meta['file_path'],
        meta['file_name'],
        meta['file_size'],
        meta['file_created_at'],
        ocr_text,
        'done',
        datetime.now()
    ))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    # Example usage
    pdf_path = get_pdf_file('example.pdf')  # Replace with actual path or download logic
    meta = get_file_metadata(pdf_path)
    images = extract_images_from_pdf(pdf_path)
    ocr_results = run_ocr_on_images(images)
    # Combine all text
    all_text = "\n".join([" ".join(r[1]) for r in ocr_results])
    insert_ocr_result(meta, all_text)
    print("OCR processing complete and result inserted into database.") 