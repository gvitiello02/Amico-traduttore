import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type Language = 'Chinese' | 'Italian' | 'English';

export interface TranslationRequest {
  text: string;
  sourceLang: Language;
  targetLang: Language;
  mode?: 'general' | 'specialist';
}

export async function translateText({ text, sourceLang, targetLang, mode = 'specialist' }: TranslationRequest): Promise<string> {
  if (!text.trim()) return '';

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
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3, // Lower temperature for more consistent translations
      },
    });

    return response.text || "Errore nella generazione della traduzione.";
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Impossibile completare la traduzione. Riprova più tardi.");
  }
}

export async function getPinyin(text: string): Promise<string> {
  if (!text.trim()) return '';

  const prompt = `Fornisci solo il Pinyin (con i toni) per il seguente testo cinese. Non aggiungere spiegazioni o traduzioni:\n\n${text}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: "Sei un esperto di lingua cinese. Fornisci solo il Pinyin con i toni per il testo fornito.",
        temperature: 0.1,
      },
    });

    return response.text.trim() || "";
  } catch (error) {
    console.error("Pinyin error:", error);
    return "";
  }
}
