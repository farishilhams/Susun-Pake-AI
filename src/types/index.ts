// ============================================================
// types/index.ts — Shared TypeScript interfaces & enums
// ============================================================

export const FILE_TYPES = [
  "PRD",
  "ARCHITECTURE",
  "DESIGN",
  "CLAUDE",
  "SKILL",
  "TODO",
  "WORKFLOW",
  "SECURITY",
] as const;

export type FileType = (typeof FILE_TYPES)[number];

export interface IUser {
  _id: string;
  email: string;
  googleId: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface IProject {
  _id: string;
  userId: string;
  name: string;
  projectType: string;
  techStackPreference?: string;
  mainFeatures?: string;
  brief?: string;
  status: "draft" | "interviewing" | "generating" | "done";
  createdAt: Date;
  updatedAt: Date;
}

export interface IFile {
  _id: string;
  projectId: string;
  fileType: FileType;
  content: string;
  version: number;
  updatedAt: Date;
}

export interface IChatMessage {
  _id: string;
  projectId: string;
  role: "user" | "assistant";
  message: string;
  createdAt: Date;
}

export interface IUsageLog {
  _id: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  generateCount: number;
}

// SSE event shapes (ARCHITECTURE.md § 7.1)
export type SSEEvent =
  | { event: "file:generating"; data: { fileType: FileType; status: "in_progress" } }
  | { event: "file:token"; data: { fileType: FileType; chunk: string } }
  | { event: "file:complete"; data: { fileType: FileType; content: string } }
  | { event: "error"; data: { message: string } }
  | { event: "done"; data: { projectId: string } };

// Standard API response shape (SKILL.md § Response API Standar)
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message: string;
  error?: unknown;
}

export type ProjectBrief = {
  name: string;
  projectType: string;
  mainFeatures: string;
  techStackPreference?: string;
};
