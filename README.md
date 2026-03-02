# PDF2CSV
Extract tables from any PDF into CSV. This application uses a local Python script for extraction and does not use any AI services.

## Deployment link
https://pdf2csv-qb1w.onrender.com/

## The Problem
Manual data extraction from PDFs using Python libraries like pymupdf or tabula is often a "hardcoded" nightmare. When table structures, page ranges, or column counts change, data scientists are forced to manually edit extraction scripts, leading to a slow and error-prone workflow.

## Features
- Local PDF table extraction using PyMuPDF (fitz).
- Live preview of extracted data.
- Export to CSV.
- Lightweight Python extraction engine powered by PyMuPDF.
- Privacy-focused: All processing happens locally.
- Premium, type-safe React interface with fluid animations
- One-Click Export: Instant CSV generation for seamless data processing.

## Tech Stack
- Frontend: React 19, Vite, Tailwind CSS v4, Framer Motion.
- Orchestration: Node.js (Express) with tsx for type-safe execution.
- Backend Engine: Python 3 with PyMuPDF (fitz) for precise structural detection.
- Database: SQLite (via better-sqlite3) for efficient metadata and history management.

**Prerequisites:** Node.js, Python 3, PyMuPDF (`pip install pymupdf`)

Run python3 -m pip install pymupdf

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

   ## Important Advice 
The app is currently deployed on Render on a free tier.
   - **Process fewer pages:** If you are trying to extract pages 1 to 20, the server will almost certainly time out. Try doing pages 1 to 2, then 3 to 4, and so on.
   - **First Request Delay:** Render "sleeps" your app after 15 minutes of inactivity. The very first request after it wakes up is always much slower.
   - **File Complexity:** If the PDF has thousands of small lines or complex vector graphics, it takes a lot of CPU to find the tables.

   - ## Comparison of Extraction Methods

| Feature | AWS Textract Script (Previous) | PyMuPDF Script (Current) |
| :--- | :--- | :--- |
| **Technology** | AI/OCR (Computer Vision) | Programmatic (Coordinates/Vectors) |
| **Best For** | Scanned documents, photos, crumpled paper. | Digital PDFs (born-digital) with clear lines. |
| **Speed** | Slow (requires network upload/API processing). | Extremely Fast (processed locally on your CPU). |
| **Cost** | Per-page API fees. | Free (Open Source). |
| **Format Support** | Images and (with S3) PDFs. | Native PDF support. |
