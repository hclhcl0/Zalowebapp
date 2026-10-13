import zipfile
import xml.etree.ElementTree as ET
import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(CURRENT_DIR)
ROOT_DIR = os.path.dirname(PROJECT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data", "hoi-dap-tcmr")
PUBLIC_DIR = os.path.join(PROJECT_DIR, "public")

os.makedirs(DATA_DIR, exist_ok=True)

docx_path = os.path.join(ROOT_DIR, "Hỏi đáp TCMR.docx")
if not os.path.exists(docx_path):
    print("Không tìm thấy file:", docx_path)
    sys.exit(1)

print(f"Đang đọc file: {docx_path}")

ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read('word/document.xml')

tree = ET.fromstring(xml_content)
body = tree.find('w:body', ns)

SECTION_MAP = {
    "I. THÔNG TIN CHUNG VỀ TIÊM CHỦNG MỞ RỘNG": {
        "slug": "01-thong-tin-chung-ve-tiem-chung-mo-rong-tcmr",
        "title": "Hỏi đáp TCMR (Phần I): Thông tin chung, đối tượng và danh mục bệnh trong Chương trình Tiêm chủng mở rộng"
    },
    "II. LỊCH TIÊM VÀ TIÊM BÙ": {
        "slug": "02-lich-tiem-va-nguyen-tac-tiem-bu-tcmr",
        "title": "Hỏi đáp TCMR (Phần II): Lịch tiêm chủng mở rộng, xử trí khi trễ lịch và nguyên tắc tiêm bù"
    },
    "III. TRƯỚC VÀ TRONG BUỔI TIÊM": {
        "slug": "03-chuan-bi-kham-sang-loc-truoc-va-trong-buoi-tiem-tcmr",
        "title": "Hỏi đáp TCMR (Phần III): Chuẩn bị trước khi đưa trẻ đi tiêm, khám sàng lọc và sổ tiêm chủng"
    },
    "IV. THEO DÕI VÀ XỬ TRÍ SAU TIÊM": {
        "slug": "04-theo-doi-va-xu-tri-phan-ung-sau-tiem-chung-tcmr",
        "title": "Hỏi đáp TCMR (Phần IV): Theo dõi 30 phút tại điểm tiêm, chăm sóc 24 giờ tại nhà và dấu hiệu cấp cứu sau tiêm"
    },
    "V. ĐĂNG KÝ, TRA CỨU VÀ CÁC TÌNH HUỐNG THƯỜNG GẶP": {
        "slug": "05-dang-ky-tra-cuu-so-tiem-va-tinh-huong-thuong-gap-tcmr",
        "title": "Hỏi đáp TCMR (Phần V): Đăng ký tại Trạm Y tế phường/xã, chuyển nơi ở và cập nhật Hệ thống tiêm chủng quốc gia"
    }
}

LEGAL_FOOTER = """
---

### 📜 CĂN CỨ PHÁP LÝ & TÀI LIỆU THAM KHẢO
1. **Luật Phòng bệnh số 114/2025/QH15**;
2. **Thông tư số 13/2026/TT-BYT** ngày 16/5/2026 của Bộ Y tế quy định về hoạt động tiêm chủng;
3. **Quyết định số 94/QĐ-PB** ngày 30/6/2026 của Bộ Y tế về hướng dẫn lịch tiêm chủng và cách dùng vắc xin, sinh phẩm;
4. **Quyết định số 95/QĐ-PB** ngày 30/6/2026 của Bộ Y tế về hướng dẫn tổ chức, an toàn, theo dõi và ghi chép tiêm chủng.
"""

master_lines = [
    "# CẨM NANG HỎI ĐÁP VỀ CHƯƠNG TRÌNH TIÊM CHỦNG MỞ RỘNG (TCMR) - CDC ĐÀ NẴNG",
    "",
    "> **Đơn vị phát hành**: Trung tâm Kiểm soát bệnh tật (CDC) thành phố Đà Nẵng",
    "> **Chuyên mục**: Tiêm chủng mở rộng (TCMR) & Cẩm nang Sức khỏe",
    "> **Căn cứ pháp lý**: Luật Phòng bệnh số 114/2025/QH15, Thông tư 13/2026/TT-BYT, Quyết định 94/QĐ-PB và 95/QĐ-PB (2026) của Bộ Y tế",
    "",
    "---",
    ""
]

sections = []
current_section = None
in_references = False

for elem in body:
    tag = elem.tag.split('}')[-1]
    if tag != 'p':
        continue
    
    t_elems = elem.findall('.//w:t', ns)
    txt = "".join([t.text for t in t_elems if t.text]).strip()
    if not txt:
        continue

    # Bỏ dòng tiêu đề chính lặp ở đầu
    if txt.upper() == "HỎI ĐÁP VỀ TIÊM CHỦNG MỞ RỘNG":
        continue

    if txt.upper() == "TÀI LIỆU THAM KHẢO":
        in_references = True
        continue

    if in_references:
        continue

    # Kiểm tra nếu là tiêu đề phần I, II, III, IV, V
    if txt in SECTION_MAP:
        meta = SECTION_MAP[txt]
        master_lines.append(f"\n## {txt}\n")
        current_section = {
            'slug': meta['slug'],
            'title': meta['title'],
            'heading': txt,
            'lines': [
                f"# {meta['title']}",
                "",
                "- **Đơn vị**: Trung tâm Kiểm soát bệnh tật (CDC) Đà Nẵng",
                "- **Chuyên mục**: Hỏi đáp Chương trình Tiêm chủng Mở rộng (TCMR)",
                f"- **Chuyên đề**: {txt}",
                "",
                "---",
                ""
            ]
        }
        sections.append(current_section)
        continue

    # Kiểm tra nếu là Câu hỏi (Câu 1., Câu 2., ...)
    m_q = re.match(r'^(Câu\s+\d+\.)\s*(.*)$', txt)
    if m_q:
        q_num = m_q.group(1)
        q_body = m_q.group(2)
        line_md = f"\n### ❓ {q_num} {q_body}\n"
    elif txt.startswith("Trả lời:"):
        ans_body = txt.replace("Trả lời:", "", 1).strip()
        line_md = f"**💡 Trả lời:** {ans_body}\n"
    else:
        line_md = f"- {txt}\n"

    master_lines.append(line_md)
    if current_section is not None:
        current_section['lines'].append(line_md)

# Thêm căn cứ pháp lý vào cuối mỗi file chuyên đề và file tổng hợp
for sec in sections:
    sec['lines'].append(LEGAL_FOOTER)
    sec_content = "\n".join(sec['lines'])
    sec_content = re.sub(r'\n{3,}', '\n\n', sec_content).strip() + "\n"
    sec_path = os.path.join(DATA_DIR, f"{sec['slug']}.md")
    with open(sec_path, 'w', encoding='utf-8') as f:
        f.write(sec_content)
    print(f"✅ Đã tạo chuyên đề: {sec['slug']}.md ({len(sec_content)} ký tự)")

master_lines.append(LEGAL_FOOTER)
master_content = "\n".join(master_lines)
master_content = re.sub(r'\n{3,}', '\n\n', master_content).strip() + "\n"

master_paths = [
    os.path.join(DATA_DIR, "HOI_DAP_TIEM_CHUNG_MO_RONG_TONG_HOP.md"),
    os.path.join(ROOT_DIR, "HOI_DAP_TIEM_CHUNG_MO_RONG_TCMR_CDC_DA_NANG.md"),
    os.path.join(PUBLIC_DIR, "HOI_DAP_TIEM_CHUNG_MO_RONG_TCMR_CDC_DA_NANG.md")
]

for mp in master_paths:
    with open(mp, 'w', encoding='utf-8') as f:
        f.write(master_content)

print(f"\n🎉 Đã xuất file Markdown TCMR tổng hợp ({len(master_content)} ký tự) tại:")
for mp in master_paths:
    print(f"   -> {mp}")
