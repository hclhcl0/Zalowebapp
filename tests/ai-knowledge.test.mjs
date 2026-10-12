import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { canReadKnowledge, retrieveRelevantKnowledge } from "../src/lib/aiKnowledge.mjs";

const schedule = {
  title: "LỊCH TIÊM CHỦNG và Khám",
  category: "Dịch vụ y tế",
  allowedDepartment: "CITIZEN_ONLY",
  content: "Dữ liệu kiểm thử: Tiêm chủng thứ Hai, 08:00. Khám thứ Ba, 09:00, tại cơ sở A.",
};

test("citizen-only schedules are visible to citizens, not staff (including HR)", () => {
  assert.equal(canReadKnowledge(schedule), true);
  assert.equal(canReadKnowledge(schedule, { isStaff: true }), false);
  assert.equal(canReadKnowledge(schedule, { isStaff: true, accessLevel: "hr" }), false);
  assert.equal(canReadKnowledge({ allowedDepartment: " citizen_ONLY " }), true);
});

test("public, staff-only and department permissions remain enforced", () => {
  for (const audience of [null, "ALL", "tất cả cơ quan"]) {
    assert.equal(canReadKnowledge({ allowedDepartment: audience }), true);
    assert.equal(canReadKnowledge({ allowedDepartment: audience }, { isStaff: true }), true);
  }
  assert.equal(canReadKnowledge({ allowedDepartment: "STAFF_ONLY" }), false);
  assert.equal(canReadKnowledge({ allowedDepartment: "STAFF_ONLY" }, { isStaff: true }), true);
  const privateDoc = { allowedDepartment: "Phòng A" };
  assert.equal(canReadKnowledge(privateDoc, { department: "Phòng A" }), false);
  assert.equal(canReadKnowledge(privateDoc, { isStaff: true, department: " phòng a " }), true);
  assert.equal(canReadKnowledge(privateDoc, { isStaff: true, department: "Phòng B" }), false);
  assert.equal(canReadKnowledge(privateDoc, { isStaff: true, accessLevel: "hr" }), true);
});

test("schedule remains retrievable among long repetitive documents, with and without accents", () => {
  const noise = Array.from({ length: 6 }, (_, i) => ({ title: `Tài liệu ${i}`, category: "Khác", content: "và cho bạn ".repeat(1000) }));
  for (const question of ["LỊCH TIÊM CHỦNG và Khám", "lich tiem chung", "lịch khám", "cho tôi hỏi lịch khám", "LỊCH KHÁM".normalize("NFD")]) {
    const text = retrieveRelevantKnowledge(question, [...noise, schedule], "Bạn");
    assert.ok(text.includes(schedule.content), question);
  }
  assert.equal(retrieveRelevantKnowledge("bóng đá", [schedule]), "");
});

test("a staff member's name does not displace public schedules with personnel documents", () => {
  const personnel = Array.from({ length: 6 }, (_, i) => ({
    title: `Bảng chấm công ${i}`, category: "Kế hoạch - Nghiệp vụ",
    content: "Nguyễn Văn Kiểm Thử | 22 ngày công\n".repeat(30), allowedDepartment: "STAFF_ONLY",
  }));
  const publicSchedule = { ...schedule, allowedDepartment: null };
  const visible = [...personnel, publicSchedule].filter(doc => canReadKnowledge(doc, { isStaff: true }));
  const text = retrieveRelevantKnowledge("Lịch tiêm chủng", visible, "Nguyễn Văn Kiểm Thử");
  assert.ok(text.includes(publicSchedule.content));
  assert.ok(!text.includes("Bảng chấm công"));
});

// Exercise the real OA context pipeline while replacing DB and model calls.
// No live credentials, patient data, messages or external AI calls are used.
test("OA model receives permitted schedule content and no internal document", async () => {
  const documents = [schedule, { title: "Lịch tiêm nội bộ", category: "Nội bộ", content: "PRIVATE_TEST_MARKER", allowedDepartment: "STAFF_ONLY" }];
  let capturedPrompt;
  const prisma = {
    aiKnowledge: { findMany: async () => documents },
    systemConfig: { findMany: async () => [], findUnique: async () => null },
    follower: { findUnique: async () => ({ userType: "citizen", fullName: "Khách kiểm thử" }) },
    messageLog: { findMany: async () => [] },
    geminiApiKey: { findMany: async () => [{ apiKey: "test-key" }] },
  };
  class FakeGoogleGenAI {
    models = { generateContent: async ({ config }) => {
      capturedPrompt = config.systemInstruction;
      return { text: "Phản hồi kiểm thử" };
    } };
  }
  const context = vm.createContext({ console, process: { env: {} }, Buffer });
  const modules = {
    "@/lib/prisma": new vm.SyntheticModule(["prisma"], function () { this.setExport("prisma", prisma); }, { context }),
    "@google/genai": new vm.SyntheticModule(["GoogleGenAI"], function () { this.setExport("GoogleGenAI", FakeGoogleGenAI); }, { context }),
    "groq-sdk": new vm.SyntheticModule(["default"], function () { this.setExport("default", class {}); }, { context }),
    "./aiKnowledge.mjs": new vm.SourceTextModule(await readFile(new URL("../src/lib/aiKnowledge.mjs", import.meta.url), "utf8"), { context }),
  };
  const ai = new vm.SourceTextModule(await readFile(new URL("../src/lib/gemini.js", import.meta.url), "utf8"), { context });
  await ai.link(specifier => modules[specifier]);
  await ai.evaluate();
  await ai.namespace.askAI("test-user", "LỊCH TIÊM CHỦNG và Khám");
  assert.ok(capturedPrompt.includes(schedule.content));
  assert.ok(!capturedPrompt.includes("PRIVATE_TEST_MARKER"));
  assert.ok(capturedPrompt.includes("LỊCH DỊCH VỤ"));
});

test("invalid Gemini key falls back without exposing provider error details", async () => {
  const prisma = {
    aiKnowledge: { findMany: async () => [schedule] },
    systemConfig: { findMany: async () => [], findUnique: async () => null },
    follower: { findUnique: async () => ({ userType: "citizen", fullName: "Khách kiểm thử" }) },
    messageLog: { findMany: async () => [] },
    geminiApiKey: { findMany: async () => [{ apiKey: "invalid-test-key" }] },
    groqApiKey: { findMany: async () => [] },
  };
  class InvalidKeyGoogleGenAI {
    models = { generateContent: async () => {
      throw new Error('{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT"}}');
    } };
  }
  const context = vm.createContext({ console, process: { env: {} }, Buffer });
  const modules = {
    "@/lib/prisma": new vm.SyntheticModule(["prisma"], function () { this.setExport("prisma", prisma); }, { context }),
    "@google/genai": new vm.SyntheticModule(["GoogleGenAI"], function () { this.setExport("GoogleGenAI", InvalidKeyGoogleGenAI); }, { context }),
    "groq-sdk": new vm.SyntheticModule(["default"], function () { this.setExport("default", class {}); }, { context }),
    "./aiKnowledge.mjs": new vm.SourceTextModule(await readFile(new URL("../src/lib/aiKnowledge.mjs", import.meta.url), "utf8"), { context }),
  };
  const ai = new vm.SourceTextModule(await readFile(new URL("../src/lib/gemini.js", import.meta.url), "utf8"), { context });
  await ai.link(specifier => modules[specifier]);
  await ai.evaluate();
  const answer = await ai.namespace.askAI("test-user", "Lịch tiêm chủng");
  assert.match(answer, /tạm thời không khả dụng/);
  assert.ok(!answer.includes("API key"));
  assert.ok(!answer.includes("INVALID_ARGUMENT"));
});
