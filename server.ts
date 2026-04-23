import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Gemini
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  app.use(express.json());

  // API Route for translation
  app.post('/api/translate', async (req, res) => {
    const { text, sourceLang, targetLang, mode } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const systemInstruction = mode === 'specialist' 
      ? `
      Sei un traduttore professionista e assistente linguistico specializzato nelle combinazioni: 
      Cinese-Italiano, Italiano-Cinese, Inglese-Italiano, Italiano-Inglese.
      
      Il tuo compito è fornire una traduzione accurata, naturale e contestualmente appropriata per testi TECNICI, SCIENTIFICI o PROFESSIONALI.
      
      Linee guida:
      1. Mantieni il tono e lo stile del testo originale.
      2. Se ci sono termini tecnici o idiomatici, scegli la resa più corretta nel settore di riferimento.
      3. Fornisci SOLO la traduzione finale, senza commenti aggiuntivi.
      4. Per le traduzioni dal cinese all'italiano, presta particolare attenzione alle sfumature dei caratteri.
      `
      : `
      Sei un assistente alla traduzione amichevole e accurato per le combinazioni: 
      Cinese-Italiano, Italiano-Cinese, Inglese-Italiano, Italiano-Inglese.
      
      Il tuo compito è fornire una traduzione NATURALE e COLLOQUIALE, adatta alla comunicazione quotidiana.
      
      Linee guida:
      1. Usa un linguaggio semplice e chiaro.
      2. Adatta le espressioni idiomatiche per farle suonare naturali nella lingua di arrivo.
      3. Fornisci SOLO la traduzione finale.
      `;

    const prompt = `Traduci il seguente testo da ${sourceLang} a ${targetLang}:\n\n${text}`;

    try {
      const response: any = await (genAI as any).models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      res.json({ text: response.text || "Errore nella generazione della traduzione." });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ error: "Impossibile completare la traduzione." });
    }
  });

  // API Route for Pinyin
  app.post('/api/pinyin', async (req, res) => {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const prompt = `Fornisci solo il Pinyin (con i toni) per il seguente testo cinese. Non aggiungere spiegazioni o traduzioni:\n\n${text}`;

    try {
      const response: any = await (genAI as any).models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Sei un esperto di lingua cinese. Fornisci solo il Pinyin con i toni per il testo fornito.",
          temperature: 0.1,
        },
      });

      res.json({ text: (response.text || "").trim() });
    } catch (error) {
      console.error("Pinyin error:", error);
      res.status(500).json({ error: "Errore nella generazione del Pinyin." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
