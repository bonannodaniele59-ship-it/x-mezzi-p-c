
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Trip } from "../types";

// Analizza i log di servizio dei mezzi per identificare trend di manutenzione e anomalie.
export const analyzeMaintenanceTrends = async (trips: Trip[]): Promise<string> => {
  // Always initialize GoogleGenAI with a named parameter
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Analizza questi log di servizio dei mezzi della Protezione Civile e fornisci un breve riepilogo (massimo 150 parole) in italiano rivolto ai responsabili logistici. 
  Focus: necessità di manutenzione segnalate, km percorsi totali e se ci sono anomalie nei rifornimenti.
  
  Dati: ${JSON.stringify(trips)}`;

  try {
    // Correctly call generateContent with model and contents at once
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Use gemini-3-pro-preview for complex reasoning tasks like log analysis.
      contents: prompt,
    });
    // Correctly access the .text property directly (not a method)
    return response.text || "Impossibile generare l'analisi al momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Errore nell'analisi dei dati con l'IA.";
  }
};

// Ottimizza le note di servizio per un registro ufficiale professionale.
export const suggestNoteOptimization = async (notes: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Rendi questa nota di servizio più professionale e tecnica per un registro ufficiale della Protezione Civile: "${notes}"`;
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            // Use gemini-3-flash-preview for basic text transformation and proofreading tasks
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        // Correctly access the .text property directly
        return response.text || notes;
    } catch (error) {
        console.error("Gemini Optimization Error:", error);
        return notes;
    }
};
