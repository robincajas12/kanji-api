import { GenerateContentResponse, GoogleGenAI } from "@google/genai";
// import { zodToJsonSchema } from "zod-to-json-schema"; // Omitted as it's not used

const GEMINI_API_KEY =  process.env.GEMINI_API_KEY ;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set. Please set it in your environment variables or a .env file.");
  // In a real application, you might want to throw an error or handle this more gracefully.
  // For now, we'll let it proceed, and the AI calls will likely fail.
}

const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

export async function simple(model, input) {
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: input,
    });
    return response; // Assuming response.response contains the GenerateContentResponse object
  } catch (error) {
    console.error("Error in simple AI call:", error);
    // Return a structured error response that can be parsed by the frontend
    return { text: () => JSON.stringify({ isCorrect: false, correctForm: "", explanation: `Error: Falló la conexión con la IA. Detalles: ${error.message}` }) };
  }
}
