import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Routes
  app.post("/api/extract", upload.single("pdf"), async (req, res) => {
    console.log("Received extraction request");

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      const startPage = parseInt(req.body.startPage) || 1;
      const endPage = parseInt(req.body.endPage) || 1;
      const columnCount = parseInt(req.body.columnCount) || 0;
      const headerNames = req.body.headerNames ? req.body.headerNames.split(',').map((h: string) => h.trim()) : [];

      // Create a temporary file for the PDF
      const tempPdfPath = path.join(__dirname, `temp_${Date.now()}.pdf`);
      fs.writeFileSync(tempPdfPath, req.file.buffer);

      // Call the Python script
      const pythonProcess = spawn('python', [
        path.join(__dirname, 'extractor.py'),
        tempPdfPath,
        startPage.toString(),
        endPage.toString(),
        columnCount.toString()
      ]);

      let stdoutData = '';
      let stderrData = '';

      const timeout = setTimeout(() => {
        pythonProcess.kill();
        console.error("Python script timed out");
      }, 30000);

      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      pythonProcess.on('error', (err) => {
        clearTimeout(timeout);
        console.error("Failed to start Python process:", err);
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        res.status(500).json({ error: "Python environment is not ready. Please ensure 'pymupdf' is installed." });
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        // Clean up the temporary file
        if (fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
        }

   if (code !== 0) {
  console.error(`Python script exited with code ${code}: ${stderrData}`);
  // This will show you the ACTUAL Python error in the browser
  return res.status(500).json({ 
    error: `Extraction failed (Code ${code}): ${stderrData || 'No error message returned. Check if pymupdf is installed.'}` 
  });

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

    } catch (error: any) {
      console.error("Extraction error:", error);
      res.status(500).json({ error: error.message || "An unexpected error occurred during extraction." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
