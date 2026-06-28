import DocumentInfo from "../models/DocumentInfo.js";
import Document from "../models/Document.js";
import ChatHistory from "../models/ChatHistory.js";
import * as langChain from "../utils/langChain.js";

// @desc Generate document headline/about/education cards
// @route POST /api/ai/generate-document-info
// @access Private
export const generateDocumentInfo = async (req, res, next) => {
  try {
    const { documentId } = req.body;

    // 1. Validate input
    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
        statusCode: 400,
      });
    }

    // 2. Check if already exists (avoid AI call)
    let documentInfo = await DocumentInfo.findOne({
      userId: req.user._id,
      documentId,
    });

    if (documentInfo) {
      return res.status(200).json({
        success: true,
        data: documentInfo,
        message: "Document info (cached)",
      });
    }

    // 3. Get document
    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
        statusCode: 404,
      });
    }

    // 4. Generate AI content via the LangChain structured-output chain
    const { headline, about, cards } = await langChain.generateDocumentInfo(
      document.extractedText,
    );

    // 5. Try to create (handle race condition)
    documentInfo = await DocumentInfo.findOneAndUpdate(
      {
        userId: req.user._id,
        documentId: document._id,
      },
      {
        headline,
        about,
        cards: cards.map((card) => ({
          topic: card.topic,
          summary: card.summary,
        })),
      },
      {
        new: true,
        upsert: true,
      },
    );

    // 6. Response
    return res.status(200).json({
      success: true,
      data: documentInfo,
      message: "Document information generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc Generate document summary
// @route POST /api/ai/generate-summary
// @access Private
export const generateSummary = async (req, res, next) => {
  try {
    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
        statusCode: 400,
      });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
        statusCode: 404,
      });
    }

    // Generate summary using the LangChain chain
    const summary = await langChain.generateSummary(document.extractedText);

    res.status(200).json({
      success: true,
      data: {
        documentId: document._id,
        title: document.title,
        summary,
      },
      message: "Summary generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc Chat with a document (RAG: semantic retrieval + conversational memory)
// @route POST /api/ai/chat
// @access Private
export const chat = async (req, res, next) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId and question",
        statusCode: 400,
      });
    }

    // Need chunk embeddings for retrieval
    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
        statusCode: 404,
      });
    }

    // Embed the question and retrieve the most semantically relevant chunks
    const queryEmbedding = await langChain.embedQuery(question);
    const relevantChunks = langChain.findRelevantChunks(document.chunks, queryEmbedding, 3);
    const chunkIndices = relevantChunks.map((c) => c.chunkIndex);

    // Get or create chat history
    let chatHistory = await ChatHistory.findOne({
      userId: req.user._id,
      documentId: document._id,
    });

    if (!chatHistory) {
      chatHistory = await ChatHistory.create({
        userId: req.user._id,
        documentId: document._id,
        messages: [],
      });
    }

    // Give the model memory of the last few turns so follow-up questions work
    const recentHistory = chatHistory.messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Generate response via the LangChain RAG chain
    const answer = await langChain.chatWithContext({
      question,
      chunks: relevantChunks,
      history: recentHistory,
    });

    // Save conversation
    chatHistory.messages.push(
      {
        role: "user",
        content: question,
        timestamp: new Date(),
        relevantChunks: [],
      },
      {
        role: "assistant",
        content: answer,
        timestamp: new Date(),
        relevantChunks: chunkIndices,
      },
    );

    await chatHistory.save();

    res.status(200).json({
      success: true,
      data: {
        question,
        answer,
        relevantChunks: chunkIndices,
        chatHistoryId: chatHistory._id,
      },
      message: "Response generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc Explain a concept from a document
// @route POST /api/ai/explain-concept
// @access Private
export const explainConcept = async (req, res, next) => {
  try {
    const { documentId, concept } = req.body;

    if (!documentId || !concept) {
      return res.status(400).json({
        success: false,
        error: "Please provide the documentId and concept",
        statusCode: 400,
      });
    }

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready",
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found or not ready",
        statusCode: 404,
      });
    }

    // Find relevant chunks for the concept via semantic search
    const queryEmbedding = await langChain.embedQuery(concept);
    const relevantChunks = langChain.findRelevantChunks(document.chunks, queryEmbedding, 3);
    const context = relevantChunks.map((c) => c.content).join("\n\n");

    // Generate explanation using the LangChain chain
    const explanation = await langChain.explainConcept({ concept, context });

    res.status(200).json({
      success: true,
      data: {
        concept,
        explanation,
        relevantChunks: relevantChunks.map((c) => c.chunkIndex),
      },
      message: "Explanation generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get chat history for a document
// @route GET /api/ai/chat-history/:documentId
// @access Private
export const getChatHistory = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
        statusCode: 400,
      });
    }

    const chatHistory = await ChatHistory.findOne({
      userId: req.user._id,
      documentId: documentId,
    }).select("messages"); // Only retrieve the messages array

    if (!chatHistory) {
      return res.status(200).json({
        success: true,
        data: [], // Return an empty array if no chat history found
        message: "No chat history found for this document",
      });
    }

    res.status(200).json({
      success: true,
      data: chatHistory.messages,
      message: "Chat history retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};
