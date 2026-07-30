import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Proxy endpoint for Gemini AI Supplier Search
  app.post("/api/gemini/search-suppliers", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY environment variable is not configured.",
          suppliers: []
        });
      }

      const { category, examples } = req.body;
      if (!category) {
        return res.status(400).json({ error: "Category is required", suppliers: [] });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `Eres un experto en compras de la industria minera e industrial en Ecuador y Latinoamérica.
Identifica entre 4 y 6 empresas proveedoras REALES y actualmente operativas para la siguiente categoría de suministros mineros:
Categoría: "${category}"
Ejemplos de materiales requeridos: "${examples || 'Materiales industriales varios'}"

Debes dar especial prioridad a proveedores ubicados en Ecuador (Quito, Guayaquil, Cuenca, Machala, Loja, Zamora) o importadores con presencia regional.

Responde ÚNICAMENTE con una estructura JSON válida en este formato:
[
  {
    "nombre_empresa": "Nombre comercial o Razón social",
    "ciudad_pais": "Ciudad, País",
    "sitio_web_o_contacto": "Sitio web o teléfono/email de contacto",
    "descripcion_breve": "Breve descripción de sus productos, marcas o experiencia en el rubro minero/industrial"
  }
]`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "Eres un asistente especializado en abastecimiento y cadena de suministro minero en Ecuador."
        }
      });

      const text = response.text || "[]";
      let suppliers = [];
      try {
        suppliers = JSON.parse(text);
      } catch (parseError) {
        // Fallback regex extraction if needed
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          suppliers = JSON.parse(match[0]);
        }
      }

      return res.json({ category, suppliers });
    } catch (err: any) {
      console.error("Gemini Supplier Search Error:", err);
      return res.status(500).json({
        error: err?.message || "Failed to search suppliers via Gemini AI",
        suppliers: []
      });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
