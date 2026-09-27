// ============================================================
// models/Template.ts — Mongoose schema untuk koleksi templates
// Starter Codebase siap pakai sesuai ARCHITECTURE.md § 4
// ============================================================

import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITemplateDocument extends Document {
  name: string;
  description: string;
  stackTags: string[];
  thumbnailUrl?: string;
  repoUrl: string;
  useTemplateUrl: string;
  featured?: boolean;
  order?: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplateDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    stackTags: {
      type: [String],
      default: [],
      index: true,
    },
    thumbnailUrl: {
      type: String,
      default: "",
      trim: true,
    },
    repoUrl: {
      type: String,
      required: true,
      trim: true,
    },
    useTemplateUrl: {
      type: String,
      required: true,
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index untuk sorting dan pencarian tag
TemplateSchema.index({ featured: -1, order: 1, createdAt: -1 });

const Template: Model<ITemplateDocument> =
  (mongoose.models.Template as Model<ITemplateDocument>) ||
  mongoose.model<ITemplateDocument>("Template", TemplateSchema);

export default Template;
