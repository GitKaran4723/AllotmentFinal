require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

async function processQuestion(storedContent, userQuestion) {
    try {
        const chatSession = model.startChat({ generationConfig, history: [] });
        const result = await chatSession.sendMessage(`${storedContent}\n\nUser Question: ${userQuestion}`);
        return result.response.text();
    } catch (error) {
        console.error("Error in Gemini AI processing:", error);
        throw new Error("Failed to process question.");
    }
}

module.exports = { processQuestion };
