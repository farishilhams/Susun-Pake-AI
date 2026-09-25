// ============================================================
// lib/models/User.ts — Mongoose schema untuk koleksi users
// Skema sesuai ARCHITECTURE.md § 4
// ============================================================

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUserDocument extends Document {
  email: string;
  googleId?: string | null;
  passwordHash?: string | null;
  authProvider: "google" | "email" | "both";
  sessionVersion?: number;
  name: string;
  image?: string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  avatarData?: string | null;
  githubAccessToken?: string | null;
  githubUsername?: string | null;
  githubConnectedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    googleId: {
      type: String,
      required: false,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ["google", "email", "both"],
      default: "google",
      required: true,
    },
    sessionVersion: {
      type: Number,
      default: 0,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    avatar_url: {
      type: String,
      default: null,
    },
    avatarData: {
      type: String,
      default: null,
    },
    githubAccessToken: {
      type: String,
      default: null,
    },
    githubUsername: {
      type: String,
      default: null,
    },
    githubConnectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Sinkronkan image, avatar_url, dan avatarUrl secara otomatis sebelum disimpan
UserSchema.pre("save", function () {
  const chosen = this.avatar_url || this.image || this.avatarUrl || null;
  this.avatar_url = chosen;
  this.image = chosen;
  this.avatarUrl = chosen;
});

// Sinkronkan image, avatar_url, dan avatarUrl saat findOneAndUpdate / findByIdAndUpdate
UserSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() as Record<string, unknown> | null;
  if (!update) return;

  const target = (update.$set || update) as Record<string, unknown>;
  const chosen = target.avatar_url || target.image || target.avatarUrl;
  if (chosen !== undefined) {
    target.avatar_url = chosen;
    target.image = chosen;
    target.avatarUrl = chosen;
  }
});

// Partial unique index: HANYA index dokumen jika googleId bertipe string.
UserSchema.index(
  { googleId: 1 },
  {
    unique: true,
    partialFilterExpression: { googleId: { $type: "string" } },
  }
);

// Pastikan skema terbaru selalu direferensikan saat hot-reload di environment development
if (process.env.NODE_ENV !== "production" && mongoose.models && mongoose.models.User) {
  delete (mongoose.models as Record<string, unknown>).User;
}

const User: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>("User", UserSchema);

export default User;
