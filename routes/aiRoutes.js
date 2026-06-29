import express from "express";
import {
  generateDocumentInfo,
  generateSummary,
  chat,
  explainConcept,
  getChatHistory,
} from "../controllers/aiController.js";
import protect from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post("/generate-document-info", generateDocumentInfo);

router.post("/generate-summary", generateSummary);
router.post("/chat", chat);
router.post("/explain-concept", explainConcept);
router.get("/chat-history", getChatHistory);
router.get("/chat-history/:documentId", getChatHistory);

export default router;
