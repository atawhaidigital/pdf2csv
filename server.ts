pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        // Clean up the temporary file
        if (fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
        }

        if (code !== 0) {
          console.error(`Python script exited with code ${code}: ${stderrData}`);
          return res.status(500).json({ 
            error: `Extraction failed (Code ${code}): ${stderrData || 'No error message returned. Check if pymupdf is installed.'}` 
          });
        } 
        

        try {
          const allRows = JSON.parse(stdoutData);

          const finalData = allRows.map((row: any[]) => {
            const obj: any = {};
            const headers = headerNames.length > 0 ? headerNames : row.map((_: any, i: number) => `Column ${i + 1}`);

            headers.forEach((header: string, index: number) => {
              obj[header] = row[index] || "";
            });
            return obj;
          });

          res.json({ data: finalData });
        } catch (parseError) {
          console.error("Failed to parse Python script output:", stdoutData);
          res.status(500).json({ error: "The extraction script returned an invalid format. Check if the PDF has a standard table structure." });
        }
      });
