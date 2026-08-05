import { GoogleGenAI } from "@google/genai";
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const customPrompt = "";
  const knowledgeText = `--- Lương tháng 8 ---
--- Bảng dữ liệu: Lương 2340 (BC) ---
| SỞ Y TẾ THÀNH PHỐ ĐÀ NẴNG |
| TRUNG TÂM KIỂM SOÁT BỆNH TẬT |
| TT | HỌ VÀ TÊN | Cộng tiền lương | BHXH (8%),  BHYT (1,5%), BHTN (1%) | Nghỉ ốm, dưỡng sức | Truy lĩnh | Đoàn phí 0.5% | Lương sau khi trừ BHXH, BHYT, BHTN, Nghỉ ốm, dưỡng sức, đoàn phí | Địa chỉ Email | Số điện thoại |
| 1 | Nguyễn Đại Vĩnh | 25988160 | 1705473 | 0 |  | 81213 | 24201474 | vinhnd1@danang.gov.vn | 0354675275 |
| 35 | Hồ Công Lượng | 10094700 | 1059944 | 0 |  | 50474 | 8984282 | hclhcl0@gmail.com | 0935593353 |`;

  const systemInstruction = `Bạn là Trợ lý AI chính thức của Trung tâm Kiểm soát bệnh tật TP. Đà Nẵng (CDC Đà Nẵng).

THÔNG TIN NGƯỜI ĐANG TRÒ CHUYỆN:
- Tên để xưng hô: Hồ Công Lượng
- Tên Zalo gốc (phụ): Hcl
- Phân loại: NHÂN VIÊN CỦA CDC (CÁN BỘ NỘI BỘ)

🚨 QUY TẮC BẢO MẬT TỐI CAO (BẮT BUỘC TUÂN THỦ):
1. Người dùng đang trò chuyện là: "Hồ Công Lượng". Các từ xưng hô như "tôi", "mình", "em", "cháu", "anh", "chị"... ĐỀU NGẦM HIỂU LÀ ĐANG NÓI VỀ "Hồ Công Lượng".
2. Nếu người dùng hỏi thông tin CỦA CHÍNH HỌ (lương, thưởng, điểm số...):
   - Hãy tra cứu thông tin của "Hồ Công Lượng" trong TÀI LIỆU CHUYÊN MÔN.
   - Nếu có thông tin, hãy trả lời đầy đủ.
   - Nếu KHÔNG CÓ thông tin, hãy trả lời: "Xin lỗi, hiện tại tôi chưa có dữ liệu về vấn đề này của bạn."
3. Nếu người dùng hỏi thông tin CỦA MỘT NGƯỜI KHÁC (bất kỳ ai khác "Hồ Công Lượng"):
   - Bạn PHẢI TỪ CHỐI NGAY LẬP TỨC với ĐÚNG MỘT CÂU DUY NHẤT: "Xin lỗi, vì lý do bảo mật dữ liệu nội bộ, tôi chỉ có thể cung cấp thông tin cá nhân cho chính chủ."
   - TUYỆT ĐỐI KHÔNG cung cấp thông tin của người khác dưới bất kỳ hình thức nào.

QUY TẮC BẮT BUỘC:
1. CHỈ trả lời dựa trên TÀI LIỆU CHUYÊN MÔN được cung cấp bên dưới. Không tự suy đoán.
13. XƯNG HÔ: LUÔN ưu tiên gọi người dùng bằng "Tên để xưng hô", KHÔNG dùng Tên Zalo gốc trừ khi được hỏi cụ thể.

TÀI LIỆU CHUYÊN MÔN:
${knowledgeText}
`;

  console.log("Calling Gemini...");
  const chat = genai.chats.create({
    model: "gemini-3.1-flash-lite",
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.1,
    }
  });

  const response = await chat.sendMessage({ message: "lương tháng 8 của tôi" });
  console.log("AI Answer:", response.text);
}

test();
