import zipfile
import xml.etree.ElementTree as ET
import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(CURRENT_DIR)
ROOT_DIR = os.path.dirname(PROJECT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data", "hoi-dap-tcdv")
PUBLIC_DIR = os.path.join(PROJECT_DIR, "public")

os.makedirs(DATA_DIR, exist_ok=True)

docx_path = os.path.join(ROOT_DIR, "Hỏi đáp TCDV.docx")
if not os.path.exists(docx_path):
    # Thử tìm ở Downloads
    dl_path = r"C:\Users\SingPC\Downloads\Hỏi đáp TCDV.docx"
    if os.path.exists(dl_path):
        docx_path = dl_path
    else:
        print("Không tìm thấy file Hỏi đáp TCDV.docx")
        sys.exit(1)

print(f"Đang đọc file: {docx_path}")

ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read('word/document.xml')

tree = ET.fromstring(xml_content)
body = tree.find('w:body', ns)

raw_paragraphs = []
for elem in body:
    if elem.tag.split('}')[-1] != 'p':
        continue
    runs = elem.findall('.//w:r', ns)
    merged = []
    for r in runs:
        rPr = r.find('w:rPr', ns)
        bold = False
        if rPr is not None and rPr.find('w:b', ns) is not None:
            val = rPr.find('w:b', ns).attrib.get(f"{{{ns['w']}}}val", "true")
            if val not in ("false", "0"):
                bold = True
        t_text = "".join([t.text for t in r.findall('.//w:t', ns) if t.text])
        if t_text:
            if merged and merged[-1]['bold'] == bold:
                merged[-1]['text'] += t_text
            else:
                merged.append({'text': t_text, 'bold': bold})
    
    plain = "".join([m['text'] for m in merged]).strip()
    if not plain:
        continue
    
    formatted_parts = []
    for m in merged:
        txt = m['text']
        if m['bold']:
            core = txt.strip()
            if core:
                leading = " " if txt.startswith(" ") else ""
                trailing = " " if txt.endswith(" ") else ""
                formatted_parts.append(f"{leading}**{core}**{trailing}")
            else:
                formatted_parts.append(txt)
        else:
            formatted_parts.append(txt)
    
    formatted = "".join(formatted_parts).strip()
    raw_paragraphs.append({
        'plain': plain,
        'formatted': formatted
    })

# Gom theo từng câu hỏi
qa_list = []
current_qa = None

for p in raw_paragraphs:
    plain = p['plain']
    formatted = p['formatted']
    
    if plain.upper() == "HỎI ĐÁP VỀ TIÊM CHỦNG DỊCH VỤ":
        continue
    
    m_q = re.match(r'^(Câu\s+\d+[:\.])\s*(.*)$', plain)
    if m_q:
        q_num = m_q.group(1).replace(":", ".").strip()
        q_text = m_q.group(2).strip()
        current_qa = {
            'num': q_num,
            'question': q_text,
            'paragraphs': []
        }
        qa_list.append(current_qa)
    else:
        if current_qa is not None:
            current_qa['paragraphs'].append(formatted)

print(f"Tổng số câu hỏi đã phân tích: {len(qa_list)}")

# Tạo 5 nhóm chuyên đề theo chủ đề y khoa
TOPIC_GROUPS = [
    {
        'slug': '01-chi-dinh-tiem-cum-va-chuyen-doi-vac-xin-5in1-6in1',
        'title': 'Hỏi đáp TCDV: Chỉ định tiêm Cúm mùa, chuyển đổi vắc-xin 5in1 sang 6in1 và nôn trớ sau uống Rota',
        'questions': [1, 2, 3]
    },
    {
        'slug': '02-nguyen-tac-tiem-bu-tre-lich-va-viem-gan-b',
        'title': 'Hỏi đáp TCDV: Nguyên nhân phản ứng sau tiêm, tiêm bù Viêm gan B và nguyên tắc khi trẻ chậm lịch',
        'questions': [4, 5, 8]
    },
    {
        'slug': '03-tiem-vac-xin-cho-phu-nu-mang-thai-cho-con-bu-kinh-nguyet',
        'title': 'Hỏi đáp TCDV: Tiêm phòng trước mang thai, phụ nữ đang cho con bú và trong kỳ kinh nguyệt',
        'questions': [6, 7, 9]
    },
    {
        'slug': '04-an-toan-tiem-chung-theo-doi-30-phut-va-xu-tri-sot',
        'title': 'Hỏi đáp TCDV: An toàn tiêm chủng, theo dõi 30 phút, tiêm nhiều mũi cùng lúc và xử trí sốt sau tiêm',
        'questions': [10, 11, 12]
    },
    {
        'slug': '05-tiem-chung-cho-doi-tuong-dac-biet-di-ung-vang-da-sinh-non',
        'title': 'Hỏi đáp TCDV: Tiêm vắc-xin cho trẻ dị ứng thức ăn, trẻ bị vàng da và trẻ sinh non',
        'questions': [13, 14, 15]
    }
]

# Tạo file tổng hợp
master_lines = [
    "# CẨM NANG HỎI ĐÁP TIÊM CHỦNG DỊCH VỤ (TCDV) - CDC ĐÀ NẴNG",
    "",
    "> **Đơn vị phát hành**: Trung tâm Kiểm soát bệnh tật (CDC) thành phố Đà Nẵng",
    "> **Chuyên mục**: Tiêm chủng dịch vụ (TCDV) & Cẩm nang Sức khỏe",
    "> **Tổng số câu hỏi - đáp**: 15 câu tình huống thực tế chuyên sâu",
    "",
    "---",
    ""
]

for idx, qa in enumerate(qa_list, 1):
    master_lines.append(f"\n### ❓ {qa['num']} {qa['question']}\n")
    master_lines.append("**💡 Trả lời:**\n")
    for para in qa['paragraphs']:
        if para.startswith("-") or para.startswith("•"):
            master_lines.append(f"{para}\n")
        else:
            master_lines.append(f"{para}\n")

master_content = "\n".join(master_lines)
master_content = re.sub(r'\n{3,}', '\n\n', master_content).strip() + "\n"

master_paths = [
    os.path.join(DATA_DIR, "HOI_DAP_TIEM_CHUNG_DICH_VU_TONG_HOP.md"),
    os.path.join(ROOT_DIR, "HOI_DAP_TIEM_CHUNG_DICH_VU_TCDV_CDC_DA_NANG.md"),
    os.path.join(PUBLIC_DIR, "HOI_DAP_TIEM_CHUNG_DICH_VU_TCDV_CDC_DA_NANG.md")
]

for mp in master_paths:
    with open(mp, 'w', encoding='utf-8') as f:
        f.write(master_content)

print(f"✅ Đã xuất file tổng hợp TCDV ({len(master_content)} ký tự) tại {master_paths[1]}")

# Xuất 5 file chuyên đề
for grp in TOPIC_GROUPS:
    sec_lines = [
        f"# {grp['title']}",
        "",
        "- **Đơn vị**: Trung tâm Kiểm soát bệnh tật (CDC) Đà Nẵng",
        "- **Chuyên mục**: Hỏi đáp Tiêm chủng dịch vụ (TCDV)",
        "",
        "---",
        ""
    ]
    for q_idx in grp['questions']:
        qa = qa_list[q_idx - 1]
        sec_lines.append(f"\n### ❓ {qa['num']} {qa['question']}\n")
        sec_lines.append("**💡 Trả lời:**\n")
        for para in qa['paragraphs']:
            sec_lines.append(f"{para}\n")
    
    sec_content = "\n".join(sec_lines)
    sec_content = re.sub(r'\n{3,}', '\n\n', sec_content).strip() + "\n"
    sec_path = os.path.join(DATA_DIR, f"{grp['slug']}.md")
    with open(sec_path, 'w', encoding='utf-8') as f:
        f.write(sec_content)
    print(f"✅ Đã tạo chuyên đề: {grp['slug']}.md ({len(sec_content)} ký tự)")
