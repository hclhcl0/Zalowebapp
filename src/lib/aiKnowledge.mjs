// Keep document visibility independent of retrieval: search must only see
// documents the current audience is allowed to read.
export function canReadKnowledge(document, { isStaff = false, accessLevel = "basic", department = null } = {}) {
  const audience = (document.allowedDepartment || "").trim().toLowerCase();
  if (["", "all", "tất cả", "tất cả cơ quan"].includes(audience)) return true;
  if (audience === "citizen_only") return !isStaff;
  if (["staff_only", "staff"].includes(audience) || /nhân viên|cán bộ|nội bộ/.test(audience)) return isStaff;
  if (!isStaff) return false;
  if (["admin", "hr"].includes(accessLevel)) return true;
  return (department || "").trim().toLowerCase() === audience;
}

export function normalizeKnowledgeText(value) {
  return String(value || "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

const STOP_WORDS = new Set(["toi", "minh", "ban", "cho", "hoi", "xin", "ve", "va", "la", "co", "cua", "duoc", "voi", "nhe", "a"]);

export function retrieveRelevantKnowledge(question, chunks, userName = "") {
  if (!chunks?.length) return "";
  const query = normalizeKnowledgeText(question);
  const keywords = [...new Set(query.split(" ").filter(word => word.length > 1 && !STOP_WORDS.has(word)))];
  if (!keywords.length) return "";
  const name = normalizeKnowledgeText(userName);
  const ranked = chunks.map((chunk, index) => {
    const title = normalizeKnowledgeText(chunk.title);
    const heading = new Set(normalizeKnowledgeText(`${chunk.title} ${chunk.category}`).split(" "));
    const content = normalizeKnowledgeText(chunk.content);
    const words = new Set(content.split(" "));
    // Score distinct words, not their frequency: a long unrelated document
    // must not displace a schedule just because it repeats a common word.
    let score = keywords.reduce((sum, word) => sum + (heading.has(word) ? 5 : 0) + (words.has(word) ? 1 : 0), 0);
    if (title && (` ${title} `).includes(` ${query} `)) score += 10;
    if (score > 0 && name && (` ${content} `).includes(` ${name} `)) score += 1;
    return { chunk, score, index };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.slice(0, 5).map(({ chunk }) =>
    `\n\n[CHUYÊN MÔN: ${(chunk.category || "").toUpperCase()}]\n--- Tài liệu: ${chunk.title} ---\n${chunk.content}`
  ).join("");
}
