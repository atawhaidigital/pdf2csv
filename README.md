# PDF2CSV
Extract tables from any PDF into CSV with live preview. This application uses a local Python script for extraction and does not use any AI services.

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
