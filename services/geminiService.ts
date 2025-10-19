import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Edits an image using a text prompt with the gemini-2.5-flash-image model.
 * @param base64Data The base64 encoded image data (without the data: prefix).
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg').
 * @param prompt The text prompt describing the desired edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const editImageWithPrompt = async (
  base64Data: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const editedBase64Bytes: string = part.inlineData.data;
        const editedMimeType = part.inlineData.mimeType;
        return `data:${editedMimeType};base64,${editedBase64Bytes}`;
      }
    }

    throw new Error("Nenhum dado de imagem encontrado na resposta da API.");
  } catch (error) {
    console.error("Erro ao editar imagem com Gemini:", error);
    throw new Error("Falha ao editar a imagem. Por favor, verifique seu comando e tente novamente.");
  }
};