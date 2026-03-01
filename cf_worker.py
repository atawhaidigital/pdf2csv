import json
import fitz  # PyMuPDF
from js import Response, Headers

async def on_fetch(request, env):
    """
    Cloudflare Worker entry point for handling incoming HTTP requests.
    """
    # Handle CORS for Cross-Origin requests from the frontend
    headers = Headers.new({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    })

    if request.method == "OPTIONS":
        return Response.new("", headers=headers, status=200)

    if request.method != "POST":
        return Response.new(
            json.dumps({"error": "Method not allowed. Use POST."}),
            headers=headers,
            status=405
        )

    try:
        # Extract configuration from URL parameters or form data
        # Note: In a real Worker handling FormData with files can be complex via JS proxies.
        # We assume the PDF is sent as the raw body or parsed carefully.
        
        # For this implementation, we attempt to read the raw body bytes.
        # If the frontend uses multipart/form-data, parsing it in Pyodide requires manual boundary splitting
        # or extracting it via the JS Request object.
        
        # Let's interact with the JS Request object to get FormData if possible
        js_form_data = await request.formData()
        
        pdf_file = js_form_data.get("pdf")
        if not pdf_file:
             return Response.new(json.dumps({"error": "No PDF file uploaded"}), headers=headers, status=400)

        # Retrieve configuration parameters (with defaults)
        start_page = int(js_form_data.get("startPage") or 1)
        end_page = int(js_form_data.get("endPage") or 1)
        column_count = int(js_form_data.get("columnCount") or 0)
        
        header_names_str = js_form_data.get("headerNames")
        header_names = [h.strip() for h in header_names_str.split(',')] if header_names_str else []

        # Convert JS File object to Python bytes
        array_buffer = await pdf_file.arrayBuffer()
        pdf_bytes = array_buffer.to_bytes()

        # 3. Process PDF using PyMuPDF (fitz) directly from the memory stream
        doc = fitz.Document(stream=pdf_bytes, filetype="pdf")
        
        # Ensure we don't exceed page count
        end_page = min(end_page, doc.page_count)
        
        all_rows = []
        for page_num in range(start_page - 1, end_page):
            page = doc.load_page(page_num)
            
            # Find actual table structures on the page
            tabs = page.find_tables()
            
            for tab in tabs:
                # Extract the data as a list of lists
                table_data = tab.extract()
                
                for row in table_data:
                    # Clean the row: remove None and trim whitespace
                    clean_row = [str(cell).strip() if cell else "" for cell in row]
                    
                    # Filter by column count if specified
                    if column_count > 0:
                        if len(clean_row) == column_count:
                            all_rows.append(clean_row)
                    elif len(clean_row) > 1:
                        # Auto-detect: only keep rows with multiple cells
                        all_rows.append(clean_row)

        # 4. Format the final output combining the extraction with headers
        final_data = []
        for row in all_rows:
            obj = {}
            # Use provided headers or generate "Column X"
            headers_to_use = header_names if header_names else [f"Column {i+1}" for i in range(len(row))]
            
            for index, header in enumerate(headers_to_use):
                obj[header] = row[index] if index < len(row) else ""
            final_data.append(obj)

        return Response.new(
            json.dumps({"data": final_data}),
            headers=headers,
            status=200
        )

    except Exception as e:
        return Response.new(
            json.dumps({"error": f"Extraction failed: {str(e)}"}),
            headers=headers,
            status=500
        )
