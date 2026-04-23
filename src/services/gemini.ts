export type Language = 'Chinese' | 'Italian' | 'English';

export interface TranslationRequest {
  text: string;
  sourceLang: Language;
  targetLang: Language;
  mode?: 'general' | 'specialist';
}

export async function translateText({ text, sourceLang, targetLang, mode = 'specialist' }: TranslationRequest): Promise<string> {
  if (!text.trim()) return '';

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLang, targetLang, mode }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.text || "Errore nella generazione della traduzione.";
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Impossibile completare la traduzione. Riprova più tardi.");
  }
}

export async function getPinyin(text: string): Promise<string> {
  if (!text.trim()) return '';

  try {
    const response = await fetch('/api/pinyin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.text || "";
  } catch (error) {
    console.error("Pinyin error:", error);
    return "";
  }
}
