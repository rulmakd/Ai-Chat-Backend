import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user_document",
    resource_type: "raw",
    allowed_formats: ["pdf"],
    format: "pdf",
    public_id: (req, file) => {
      return Date.now() + "_" + file.originalname.replace(".pdf", "");
    },
  },
});

// File filter - only PDFs
const fileFilter = (req, file, cd) => {
  if (file.mimetype === "application/pdf") {
    cd(null, true);
  } else {
    cd(new Error("Only PDF files are allowed:"), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
  },
});

export default upload;
