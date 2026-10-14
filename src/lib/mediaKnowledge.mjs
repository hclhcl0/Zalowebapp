// src/lib/mediaKnowledge.mjs
// Module tra cứu video và tài liệu truyền thông tham khảo thêm từ CDC Media
// Đảm bảo AI luôn tìm thấy đúng video/ấn phẩm liên quan để đề xuất ở cuối câu trả lời.

import fs from "fs";
import path from "path";

let mediaCache = null;
let mediaCacheTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 phút

function removeAccents(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

export function loadAllMediaItems() {
  const now = Date.now();
  if (mediaCache && (now - mediaCacheTime < CACHE_TTL)) {
    return mediaCache;
  }

  const dir = path.resolve(process.cwd(), "data", "cdc-media");
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".md"));
  const items = [];

  for (const filename of files) {
    const filePath = path.join(dir, filename);
    const content = fs.readFileSync(filePath, "utf-8");
    const sections = content.split(/\n### \d+\.\s*/);

    for (let i = 1; i < sections.length; i++) {
      const sec = sections[i];
      const lines = sec.split("\n");
      const title = lines[0].trim();
      const linkMatch = sec.match(/- \*\*Đường link xem chính thức\*\*:\s*([^\s\n]+)/);
      const thumbMatch = sec.match(/- \*\*Ảnh xem trước \(Thumbnail\)\*\*:\s*([^\s\n]+)/);
      const tagMatch = sec.match(/- \*\*Chủ đề & Từ khóa tra cứu\*\*:\s*([^\n]+)/);
      const summaryMatch = sec.match(/- \*\*Tóm tắt nội dung\*\*:\s*([^\n]+)/);

      let group = "Tài liệu";
      if (filename.includes("video")) group = "Video";
      else if (filename.includes("an-pham")) group = "Ấn phẩm";
      else if (filename.includes("am-thanh")) group = "Podcast";

      if (linkMatch) {
        items.push({
          title,
          group,
          link: linkMatch[1].trim(),
          thumb: thumbMatch ? thumbMatch[1].trim() : "",
          tags: tagMatch ? tagMatch[1].trim() : "",
          summary: summaryMatch ? summaryMatch[1].trim() : ""
        });
      }
    }
  }

  mediaCache = items;
  mediaCacheTime = now;
  return items;
}

const COMMON_STOP_WORDS = new Set([
  "tôi", "bạn", "mình", "cho", "hỏi", "xin", "về", "và", "là", "có", "của", "được", "với", "nhé", "ạ",
  "gì", "làm", "nào", "thế", "sao", "tháng", "năm", "ngày", "ở", "tại", "em", "anh", "chị", "giúp", "cần", "phải"
]);

// Từ khóa y tế chung (trọng số thấp để tránh kéo sai chuyên đề)
const GENERIC_MEDICAL_WORDS = new Set(["tiêm", "vắc", "xin", "vac", "xin", "bệnh", "thuốc", "y", "tế", "dịch", "vụ", "khám"]);

export function findRelevantMedia(question, limit = 2) {
  const allItems = loadAllMediaItems();
  if (!allItems.length || !question) return [];

  const qLower = question.toLowerCase();
  const qUnaccented = removeAccents(qLower);

  const tokens = qLower
    .split(/[^a-z0-9àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]+/i)
    .filter(t => t.length > 1 && !COMMON_STOP_WORDS.has(t) && !/^\d+$/.test(t));

  if (!tokens.length) return [];

  const scored = allItems.map(item => {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const tagsLower = item.tags.toLowerCase();
    const sumLower = item.summary.toLowerCase();

    const fullText = `${titleLower} ${tagsLower} ${sumLower}`;
    const fullUnaccented = removeAccents(fullText);

    // 1. Khớp nguyên văn câu hỏi
    if (qLower.length > 4 && fullText.includes(qLower)) score += 40;
    if (qUnaccented.length > 4 && fullUnaccented.includes(qUnaccented)) score += 30;

    // 2. Khớp cụm 2 từ liền kề (bigrams)
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      if (fullText.includes(bigram)) score += 25;
      else if (fullUnaccented.includes(removeAccents(bigram))) score += 18;
    }

    // 3. Khớp từng từ khóa
    for (const t of tokens) {
      const isGeneric = GENERIC_MEDICAL_WORDS.has(t);
      const weight = isGeneric ? 3 : 15; // Từ khóa đặc thù (dại, chó, mèo, sốt, sxh, thuốc lá...) được ưu tiên cao

      if (titleLower.includes(t)) {
        score += weight;
      }
      if (tagsLower.includes(t)) {
        score += weight * 1.5;
      }
      if (sumLower.includes(t)) {
        score += weight * 0.5;
      }
    }

    return { item, score };
  }).filter(x => x.score >= 20).sort((a, b) => b.score - a.score);

  if (!scored.length) return [];

  const result = [];
  const selectedLinks = new Set();

  for (const { item } of scored) {
    if (!selectedLinks.has(item.link)) {
      result.push(item);
      selectedLinks.add(item.link);
      if (result.length >= limit) break;
    }
  }

  return result;
}

export function formatMediaReferenceSection(question) {
  const matches = findRelevantMedia(question, 2);
  if (!matches.length) return "";

  const lines = [
    `KHO VIDEO & TÀI LIỆU TRUYỀN THÔNG CDC MEDIA (THAM KHẢO THÊM):`,
    `Đã tìm thấy tài liệu/video chính thức phù hợp với câu hỏi của người dùng:`
  ];

  matches.forEach(m => {
    lines.push(`+ [${m.group}] ${m.title}`);
    lines.push(`  - Link xem: ${m.link}`);
    if (m.thumb) {
      lines.push(`  - Link ảnh thumbnail: ${m.thumb}`);
    }
  });

  lines.push(``);
  lines.push(`CHỈ ĐẠO BẮT BUỘC DÀNH CHO BẠN (TRỢ LÝ AI):`);
  lines.push(`1. ƯU TIÊN SỐ 1: BẠN PHẢI TRẢ LỜI ĐẦY ĐỦ THÔNG TIN Y TẾ CHUYÊN MÔN TRƯỚC (từ Cẩm nang sức khỏe và Hỏi đáp chuyên môn ở trên). Giải thích rõ ràng nguyên nhân, triệu chứng, cách xử lý, phòng tránh hoặc lịch tiêm.`);
  lines.push(`2. THAM KHẢO THÊM Ở DÒNG CUỐI: Sau khi đã trả lời xong nội dung chuyên môn, bạn BẮT BUỘC phải đính kèm phần tài liệu tham khảo này ở dòng cuối cùng của tin nhắn theo mẫu:`);
  lines.push(`---`);
  lines.push(`📺 Video / Tài liệu tham khảo thêm:`);
  matches.forEach(m => {
    lines.push(`+ ${m.title}: ${m.link}`);
  });

  return lines.join("\n");
}
