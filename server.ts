import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
        return res.json({
          error: "GEMINI_API_KEY no está configurada en el servidor.",
          suppliers: []
        });
      }

      const { category, examples, material, model } = req.body;
      const searchCategory = (category || material || "General").trim();
      const requestedModel = (model && typeof model === 'string' && model.trim()) ? model.trim() : "gemini-3.6-flash";

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `Eres un experto en compras de la industria minera e industrial en Ecuador y Latinoamérica.
Identifica entre 4 y 6 empresas proveedoras REALES y actualmente operativas para la siguiente categoría/material de suministros mineros:
Categoría/Material: "${searchCategory}"
Ejemplos de materiales o especificaciones: "${examples || material || 'Materiales industriales varios'}"

Debes dar especial prioridad a proveedores ubicados en Ecuador (Quito, Guayaquil, Cuenca, Machala, Loja, Zamora) o importadores con presencia regional en LATAM.

Responde ÚNICAMENTE con una estructura JSON válida en este formato (un arreglo de objetos):
[
  {
    "nombre_empresa": "Nombre comercial o Razón social",
    "ciudad_pais": "Ciudad, País",
    "sitio_web_o_contacto": "Sitio web o teléfono/email de contacto",
    "descripcion_breve": "Breve descripción de sus productos, marcas o experiencia en el rubro minero/industrial"
  }
]`;

      let responseText = "";
      let usedModel = requestedModel;

      try {
        const response = await ai.models.generateContent({
          model: requestedModel,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            systemInstruction: "Eres un asistente especializado en abastecimiento y cadena de suministro minero e industrial en Ecuador."
          }
        });
        responseText = response.text || "[]";
      } catch (primaryModelErr: any) {
        console.warn(`Primary model '${requestedModel}' failed (${primaryModelErr?.message}). Falling back to 'gemini-3.6-flash'...`);
        usedModel = "gemini-3.6-flash";
        try {
          const fallbackResponse = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              systemInstruction: "Eres un asistente especializado en abastecimiento y cadena de suministro minero e industrial en Ecuador."
            }
          });
          responseText = fallbackResponse.text || "[]";
        } catch (fallbackErr: any) {
          console.error("Fallback Gemini Model also failed:", fallbackErr);
          return res.json({
            category,
            suppliers: [],
            usedModel,
            error: primaryModelErr?.message || fallbackErr?.message || "Error al conectar con Gemini API"
          });
        }
      }

      let suppliers = [];
      try {
        suppliers = JSON.parse(responseText);
      } catch (parseError) {
        const match = responseText.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            suppliers = JSON.parse(match[0]);
          } catch (e) {
            suppliers = [];
          }
        }
      }

      return res.json({ category, suppliers, usedModel });
    } catch (err: any) {
      console.error("Gemini Supplier Search Error:", err);
      return res.json({
        error: err?.message || "Error general en la búsqueda con IA",
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
