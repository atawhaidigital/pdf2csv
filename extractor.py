# The script extracts tables from a PDF file that has clear visible boundaries 
# and saves them to a CSV file.

import fitz  # PyMuPDF
import json
import sys
import os

def extract_pdf(pdf_path, start_page, end_page, column_count):
    all_rows = []
    try:
        doc = fitz.open(pdf_path)
        
        # Ensure we don't exceed page count
        end_page = min(end_page, doc.page_count)
        
        for page_num in range(start_page - 1, end_page):
            page = doc.load_page(page_num)
            
            # This finds actual table structures on the page
            tabs = page.find_tables()
            
            for tab in tabs:
                # Extract the data as a list of lists
                table_data = tab.extract()
                
                for row in table_data:
                    # Cleaning the row: remove None and trim whitespace
                    clean_row = [str(cell).strip() if cell else "" for cell in row]
                    
                    # Filter by column count if specified
                    if column_count > 0:
                        if len(clean_row) == column_count:
                            all_rows.append(clean_row)
                    elif len(clean_row) > 1:
                        # Auto-detect: only keep rows with multiple cells
                        all_rows.append(clean_row)
        
        return all_rows

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return []

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python extractor.py <pdf_path> <start_page> <end_page> <column_count>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    start_page = int(sys.argv[2])
    end_page = int(sys.argv[3])
    column_count = int(sys.argv[4])

    results = extract_pdf(pdf_path, start_page, end_page, column_count)
    print(json.dumps(results))
