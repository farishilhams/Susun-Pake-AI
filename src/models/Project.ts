// ============================================================
// lib/models/Project.ts — Mongoose schema untuk koleksi projects
// Skema sesuai ARCHITECTURE.md § 4
// ============================================================

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IProjectDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  projectType: string;
  mainFeatures?: string;
  techStackPreference?: string;
  brief?: string; // brief lengkap hasil interview
  status: "draft" | "interviewing" | "generating" | "done";
  isPinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    projectType: {
      type: String,
      required: true,
      trim: true,
    },
    mainFeatures: {
      type: String,
      default: "",
    },
    techStackPreference: {
      type: String,
      default: "",
    },
    brief: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "interviewing", "generating", "done"],
      default: "draft",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Project: Model<IProjectDocument> =
  (mongoose.models.Project as Model<IProjectDocument>) ||
  mongoose.model<IProjectDocument>("Project", ProjectSchema);

export default Project;
