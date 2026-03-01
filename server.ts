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

  app.post("/api/extract", upload.single("pdf"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No PDF file uploaded" });

      const startPage = req.body.startPage || "1";
      const endPage = req.body.endPage || "1";
      const columnCount = req.body.columnCount || "0";
      const headerNames = req.body.headerNames ? req.body.headerNames.split(',').map((h: string) => h.trim()) : [];

      const tempPdfPath = path.join(__dirname, `temp_${Date.now()}.pdf`);
      fs.writeFileSync(tempPdfPath, req.file.buffer);

      // Robust Python command detection
      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      
      const pythonProcess = spawn(pythonCmd, [
        path.join(__dirname, 'extractor.py'),
        tempPdfPath,
        startPage.toString(),
        endPage.toString(),
        columnCount.toString()
      ]);

      let stdoutData = '';
      let stderrData = '';

      // Increased timeout to 60 seconds for Render Free Tier
      const timeout = setTimeout(() => {
        pythonProcess.kill();
      }, 60000);

      pythonProcess.stdout.on('data', (data) => stdoutData += data.toString());
      pythonProcess.stderr.on('data', (data) => stderrData += data.toString());

      pythonProcess.on('error', (err) => {
        clearTimeout(timeout);
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        res.status(500).json({ error: `Failed to start Python: ${err.message}` });
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);

        if (code === null) {
          return res.status(500).json({ error: "Extraction timed out (60s). The PDF might be too large for the free server tier." });
        }

        if (code !== 0) {
          return res.status(500).json({ error: `Python Error: ${stderrData || 'Unknown error'}` });
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
        } catch (e) {
          res.status(500).json({ error: "Invalid data returned from extractor." });
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
