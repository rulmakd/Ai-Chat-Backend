import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

if (!process.env.GEMINI_API_KEY) {
  console.error(
    "FATAL ERROR: GEMINI_API_KEY is not set in the enviroment variables.",
  );
  process.exit(1);
}

/**
 * Generate document headline
 * @param {string} text - Document text
 * @returns {Promise<string>}
 */

export const generateDocumentInfo = async (text, count = 9) => {
  const prompt = `
Analyze the following document text and generate:

1. headline: One concise headline (6–12 words)
2. about: A 4–5 sentence summary explaining the document in simple language
3. ${count} education cards

Card format:
topic: Short title (3–6 words)
summary: Simple 1–2 sentence explanation

Return response EXACTLY in this format:

headline: <headline text>

about:
<about paragraph>

cards:
---
topic: ...
summary: ...
---
topic: ...
summary: ...
---

Text:
${text.substring(0, 20000)}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const generatedText = response.text;

    // Split headline
    const headlineMatch = generatedText.match(/headline:(.*)/i);
    const headline = headlineMatch ? headlineMatch[1].trim() : "";

    // Split about
    const aboutMatch = generatedText.match(/about:\s*([\s\S]*?)cards:/i);
    const about = aboutMatch ? aboutMatch[1].trim() : "";

    // Split cards
    const cardSection = generatedText.split("cards:")[1] || "";
    const cardBlocks = cardSection.split("---").filter((c) => c.trim());

    const cards = [];

    for (const block of cardBlocks) {
      const lines = block.trim().split("\n");

      let topic = "";
      let summary = "";

      for (const line of lines) {
        if (line.toLowerCase().startsWith("topic:")) {
          topic = line.substring(6).trim();
        }

        if (line.toLowerCase().startsWith("summary:")) {
          summary = line.substring(8).trim();
        }
      }

      if (topic && summary) {
        cards.push({ topic, summary });
      }
    }

    return {
      headline,
      about,
      cards: cards.slice(0, count),
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate document info");
  }
};

/**
 * Generate flashcards from text
 * @param {string} text -Document text
 * @param {number} count -Number of flashcards to generate
 * @returns {Promise<Array<{question: string, answer: string, difficulty: string}>>}
 */
export const generateFlashcards = async (text, count = 10) => {
  const prompt = `Generate exactly ${count} education flashcards from the following text.
    Format each flashcard as:
    Q: [Clear, specific question]
    A:[Concise, accurate answer]
    D:[Difficulty level: easy, medium, or hard]
    
    Separate each flashcard with "---"
    
    Text:
    ${text.substring(0, 15000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const generatedText = response.text;

    //Parse the response
    const flashcards = [];
    const cards = generatedText.split("---").filter((c) => c.trim());

    for (const card of cards) {
      const lines = card.trim().split("\n");
      let question = "",
        answer = "",
        difficulty = "medium";

      for (const line of lines) {
        if (line.startsWith("Q:")) {
          question = line.substring(2).trim();
        } else if (line.startsWith("A:")) {
          answer = line.substring(2).trim();
        } else if (line.startsWith("D:")) {
          const diff = line.substring(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(diff)) {
            difficulty = diff;
          }
        }
      }

      if (question && answer) {
        flashcards.push({ question, answer, difficulty });
      }
    }

    return flashcards.slice(0, count);
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate flashcards");
  }
};

/**
 * Generate quiz questions
 * @param {string} text - Document text
 * @param {number} numQuestions - Number of questions
 * @returns {Promise<Array<{question: string, options:Array, correctAnswer: string, explanation: string, difficulty:string}>>}
 */

export const generateQuiz = async (text, numQuestions = 5) => {
  const prompt = `Generate exactly ${numQuestions} multiple choice questions from the following text.
    Format each question as:
    Q: [Question]
    01:[Options 1]
    02:[Options 2]
    03:[Options 3]
    04:[Options 4]
    C: [Correct option - exactly as written above]
    E: [Brief explanation]
    D: [Difficulty: easy, medium, or hard]

    Separate question with '---'

    Text:
      ${text.substring(0, 15000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const generatedText = response.text;

    const questions = [];
    const questionBlocks = generatedText.split("---").filter((q) => q.trim());

    for (const block of questionBlocks) {
      const lines = block.trim().split("\n");
      let question = "",
        options = [],
        correctAnswer = "",
        explanation = "",
        difficulty = "medium";
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("Q:")) {
          question = trimmed.substring(2).trim();
        } else if (trimmed.match(/^0\d:/)) {
          options.push(trimmed.substring(3).trim());
        } else if (trimmed.startsWith("C:")) {
          correctAnswer = trimmed
            .substring(2)
            .trim()
            .replace(/^0\d:/, "")
            .trim();
        } else if (trimmed.startsWith("E:")) {
          explanation = trimmed.substring(2).trim();
        } else if (trimmed.startsWith("D:")) {
          const diff = trimmed.substring(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(diff)) {
            difficulty = diff;
          }
        }
      }

      if (question && options.length === 4 && correctAnswer) {
        questions.push({
          question,
          options,
          correctAnswer,
          explanation,
          difficulty,
        });
      }
    }
    return questions.slice(0, numQuestions);
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate quiz");
  }
};

/**
 * Generate document summary
 * @param {string} text - Document text
 * @returns {Promise<string>}
 */
export const generateSummary = async (text) => {
  const prompt = `Provide a concise summary of the following text, highlighting the key concepts, main ideas, and import points.
  keep the summary clear and structured
   
  Text:
   ${text.substring(0, 20000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });
    const generatedText = response.text;
    return generatedText;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate summary");
  }
};

/**
 * Chat with document context
 * @param {string} question - User question
 * @param {Array<Object>} chunks - Relevant document chunks
 * @return {Promise<string>}
 */

export const chatWithContext = async (question, chunks) => {
  const context = chunks
    .map((c, i) => `[Chunks ${i + 1}]\n${c.content}`)
    .join("\n\n");

  const prompt = `Based on the following context from a document, Analyse the context and answer the user's questions 
  If the answer is not in the context, say so.

  Context:
  ${context}

  Question: ${question}

  Answer:`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });
    const generatedText = response.text;
    return generatedText;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to process chat request");
  }
};

/**
 * Explain a specific concept
 * @param {string} concept - Concept to explain
 * @param {string} context - Relevant context
 * @returns {Promise<string>}
 */
export const explainConcept = async (concept, context) => {
  const prompt = `Explain the concept of "${concept}" based on the following context.
  Provide a clear, educational explanation that's easy to understand.
  include examples if relevant.

  Context: ${context.substring(0, 10000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });
    const generatedText = response.text;
    return generatedText;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to explain concept");
  }
};
