import Document from "../models/Document.js";
import ChatHistory from "../models/ChatHistory.js";
import { extractTextFromPDF } from "../utils/pdfParser.js";
import { splitTextIntoChunks, embedTexts } from "../utils/langChain.js";
import fs from "fs/promises";
import mongoose from "mongoose";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";

//@desc Upload PDF document
//@route POST /api/documents/upload
//@access Private
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload a PDF file",
        statusCode: 400,
      });
    }

    const { title } = req.body;
    if (!title) {
      // Delete uploaded file if no title provided
      await cloudinary.uploader
        .destroy(req.file.filename, { resource_type: "raw" })
        .catch(() => {});
      return res.status(400).json({
        success: false,
        error: "Please provide a document title",
        statusCode: 400,
      });
    }

    // Create document record
    const document = await Document.create({
      userId: req.user._id,
      title: title,
      fileName: req.file.originalname,
      filePath: req.file.path, // Cloudinary URL
      publicId: req.file.filename, // Cloudinary public_id
      fileSize: req.file.size,
      status: "processing",
      uploadDate: new Date(),
    });

    // Process PDF in background (in production, use a queue like BullMQ)
    processPDF(document._id, req.file.path).catch((err) => {
      console.error("PDF processing error:", err);
    });

    res.status(201).json({
      success: true,
      data: document,
      message: "Document uploaded successfully. Processing...",
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to process an uploaded PDF: extract text, chunk it, embed
// each chunk, and store the result on the Document once ready.
const processPDF = async (documentId, fileUrl) => {
  const tempPath = `./temp-${documentId}.pdf`;

  try {
    const response = await axios({
      url: fileUrl,
      method: "GET",
      responseType: "arraybuffer",
    });

    await fs.writeFile(tempPath, response.data);

    const { text } = await extractTextFromPDF(tempPath);

    // Split into chunks with LangChain's RecursiveCharacterTextSplitter
    const baseChunks = await splitTextIntoChunks(text);

    // Embed every chunk up front so chat/explain can do real semantic search
    // instead of keyword matching.
    const embeddings = await embedTexts(baseChunks.map((c) => c.content));
    const chunks = baseChunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i] || [],
    }));

    // Update document
    await Document.findByIdAndUpdate(documentId, {
      extractedText: text,
      chunks,
      status: "ready",
    });

    console.log(`Document ${documentId} processed successfully`);
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);

    await Document.findByIdAndUpdate(documentId, {
      status: "failed",
    });
  } finally {
    // Always clean up the temp file, even if processing failed partway through
    await fs.unlink(tempPath).catch(() => {});
  }
};

//@desc Get all user documents
//@route GET /api/documents
//@access Private
export const getDocuments = async (req, res, next) => {
  try {
    const documents = await Document.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(req.user._id) },
      },
      {
        $project: {
          extractedText: 0,
          chunks: 0,
        },
      },
      {
        $sort: { uploadDate: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

//@desc Get single document with chunks
//@route GET /api/documents/:id
//@access Private
export const getDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        statusCode: 404,
      });
    }

    // Update last accessed
    document.lastAccessed = Date.now();
    await document.save();

    // Strip the (large) embedding vectors before sending the document back —
    // the client only ever needs chunk text, not the raw vectors.
    const documentData = document.toObject();
    documentData.chunks = documentData.chunks.map(({ embedding, ...rest }) => rest);

    res.status(200).json({
      success: true,
      data: documentData,
    });
  } catch (error) {
    next(error);
  }
};

//@desc Delete document
//@route DELETE /api/documents/:id
//@access Private
export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        statusCode: 404,
      });
    }

    await cloudinary.uploader.destroy(document.publicId, {
      resource_type: "raw",
    });

    // Delete chat history for this document
    await ChatHistory.deleteMany({
      documentId: document._id,
    });

    //Delete document
    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
