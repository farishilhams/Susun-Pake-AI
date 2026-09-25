// ============================================================
// lib/models/FileVersion.ts — Mongoose schema untuk file_versions
// Menyimpan snapshot setiap revisi file untuk diff & rollback
// ============================================================

import mongoose, { Document, Model, Schema } from "mongoose";
import { FILE_TYPES, FileType } from "@/types";

export type VersionChangeType = "initial" | "manual" | "refinement" | "rollback";

export interface IFileVersionDocument extends Document {
  projectId: mongoose.Types.ObjectId;
  fileType: FileType;
  version: number;
  content: string;
  changeType: VersionChangeType;
  summary: string;
  createdAt: Date;
  updatedAt: Date;
}

const FileVersionSchema = new Schema<IFileVersionDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    fileType: {
      type: String,
      enum: FILE_TYPES,
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    content: {
      type: String,
      required: true,
    },
    changeType: {
      type: String,
      enum: ["initial", "manual", "refinement", "rollback"],
      default: "manual",
      required: true,
    },
    summary: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "file_versions",
  }
);

// Compound index unik: satu project + fileType tidak boleh memiliki versi duplikat
FileVersionSchema.index({ projectId: 1, fileType: 1, version: 1 }, { unique: true });

// Index sorting waktu
FileVersionSchema.index({ projectId: 1, fileType: 1, createdAt: -1 });

const FileVersion: Model<IFileVersionDocument> =
  (mongoose.models.FileVersion as Model<IFileVersionDocument>) ||
  mongoose.model<IFileVersionDocument>("FileVersion", FileVersionSchema);

export default FileVersion;
