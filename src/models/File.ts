// ============================================================
// lib/models/File.ts — Mongoose schema untuk koleksi files
// Menyimpan 8 file .md per project, dengan versioning.
// Skema sesuai ARCHITECTURE.md § 4
// ============================================================

import mongoose, { Document, Model, Schema } from "mongoose";
import { FILE_TYPES, FileType } from "@/types";

export interface IFileDocument extends Document {
  projectId: mongoose.Types.ObjectId;
  fileType: FileType;
  content: string;
  version: number;
  updatedAt: Date;
}

const FileSchema = new Schema<IFileDocument>(
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
    },
    content: {
      type: String,
      default: "",
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index compound untuk query cepat: "ambil file PRD dari projectId X"
FileSchema.index({ projectId: 1, fileType: 1 }, { unique: true });

const ProjectFile: Model<IFileDocument> =
  (mongoose.models.ProjectFile as Model<IFileDocument>) ||
  mongoose.model<IFileDocument>("ProjectFile", FileSchema);

export default ProjectFile;
