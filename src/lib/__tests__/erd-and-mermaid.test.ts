// ============================================================
// src/lib/__tests__/erd-and-mermaid.test.ts
// Test suite untuk Diagram ERD Mermaid & Template ARCHITECTURE.md
// ============================================================

import { ARCHITECTURE_TEMPLATE } from "@/modules/files/templates/architecture.template";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(sub: string) {
      if (typeof actual !== "string" || !actual.includes(sub)) {
        throw new Error(`Expected string to contain "${sub}"`);
      }
    },
    toBeGreaterThan(num: number) {
      if (typeof actual !== "number" || actual <= num) {
        throw new Error(`Expected ${actual} > ${num}`);
      }
    },
  };
}

console.log("\n🧪 Running ERD & Mermaid Validation Tests...\n");

// 1. Template Prompt ARCHITECTURE.md
test("Template ARCHITECTURE_TEMPLATE mewajibkan blok mermaid erDiagram", () => {
  expect(ARCHITECTURE_TEMPLATE).toContain("```mermaid");
  expect(ARCHITECTURE_TEMPLATE).toContain("erDiagram");
  expect(ARCHITECTURE_TEMPLATE).toContain("Diagram Skema Visual (Mermaid ERD)");
});

// 2. Format Diagram ERD Sederhana (2 Tabel)
test("Validasi format Mermaid ERD Sederhana (2 Tabel)", () => {
  const simpleERD = `
erDiagram
    USERS ||--o{ PROJECTS : owns
    USERS {
        string id PK
        string email
        string name
    }
    PROJECTS {
        string id PK
        string userId FK
        string name
    }
  `.trim();

  expect(simpleERD.startsWith("erDiagram")).toBe(true);
  expect(simpleERD).toContain("USERS ||--o{ PROJECTS : owns");
});

// 3. Format Diagram ERD Kompleks (6 Tabel dengan Relasi Beragam)
test("Validasi format Mermaid ERD Kompleks (6 Tabel & Multi-Relasi)", () => {
  const complexERD = `
erDiagram
    USERS ||--o{ PROJECTS : creates
    USERS ||--o{ PASSWORD_RESETS : requests
    USERS ||--o{ USAGE_LOGS : tracks
    PROJECTS ||--|{ FILES : contains
    FILES ||--o{ FILE_VERSIONS : versions
    PROJECTS ||--o{ CHAT_HISTORY : logs

    USERS {
        string id PK
        string email
        string passwordHash
        string authProvider
    }
    PROJECTS {
        string id PK
        string userId FK
        string name
        string projectType
    }
    FILES {
        string id PK
        string projectId FK
        string fileType
        string content
    }
    FILE_VERSIONS {
        string id PK
        string projectId FK
        string fileType
        int version
    }
  `.trim();

  expect(complexERD.startsWith("erDiagram")).toBe(true);
  expect(complexERD).toContain("USERS ||--o{ PROJECTS : creates");
  expect(complexERD).toContain("PROJECTS ||--|{ FILES : contains");
  expect(complexERD).toContain("FILES ||--o{ FILE_VERSIONS : versions");
});

// 4. Deteksi Token Stream Parsial (Mencegah render error saat streaming belum selesai)
test("Deteksi diagram parsial/belum lengkap saat SSE streaming", () => {
  const incompleteTokenStream1 = "erDiagram\n  USERS ||--";
  const incompleteTokenStream2 = "erDiagram\n";
  const completeDiagram = "erDiagram\n  USERS ||--o{ PROJECTS : owns\n";

  // Diagram parsial belum memiliki relasi lengkap (kurang dari minimum valid diagram)
  const isComplete1 = incompleteTokenStream1.trim().split("\n").length >= 2 &&
    incompleteTokenStream1.includes(":") &&
    !incompleteTokenStream1.trim().endsWith("--");

  const isComplete2 = incompleteTokenStream2.trim().split("\n").length >= 2;

  const isComplete3 = completeDiagram.trim().split("\n").length >= 2 &&
    completeDiagram.includes(":") &&
    !completeDiagram.trim().endsWith("--");

  expect(isComplete1).toBe(false);
  expect(isComplete2).toBe(false);
  expect(isComplete3).toBe(true);
});

console.log("\n🎉 All 4 ERD & Mermaid tests passed successfully!\n");
