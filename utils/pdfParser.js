import fs from "fs/promises";
import { PDFParse } from "pdf-parse";

/**
 * Extract text from a PDF file on disk.
 * @param {string} filePath - path to PDF file
 * @returns {Promise<{text: string, numPages: number, info: object}>}
 */
export const extractTextFromPDF = async (filePath) => {
  let parser;
  try {
    const dataBuffer = await fs.readFile(filePath);

    // pdf-parse v2 takes a LoadParameters object, not a raw buffer/Uint8Array
    parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
    const data = await parser.getText();

    return {
      text: data.text,
      numPages: data.total,
      info: data.info,
    };
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error("Failed to extract text from PDF");
  } finally {
    // Always free the underlying worker/memory, even if parsing failed
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
};
