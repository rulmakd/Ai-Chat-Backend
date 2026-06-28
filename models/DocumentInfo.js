import mongoose from "mongoose";

const documentInfoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },

    headline: {
      type: String,
      default: "Headline",
      maxlength: 300,
    },

    about: {
      type: String,
      default: "About Section",
      maxlength: 2000,
    },

    cards: [
      {
        topic: {
          type: String,
          required: true,
        },
        summary: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true },
);

documentInfoSchema.index({ userId: 1, documentId: 1 });

const DocumentInfo = mongoose.model("DocumentInfo", documentInfoSchema);

export default DocumentInfo;
