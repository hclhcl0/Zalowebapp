import zipfile
import xml.etree.ElementTree as ET
import glob
import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(CURRENT_DIR)
ROOT_DIR = os.path.dirname(PROJECT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data", "hoi-dap-benh-truyen-nhiem")
PUBLIC_DIR = os.path.join(PROJECT_DIR, "public")

os.makedirs(DATA_DIR, exist_ok=True)

docx_files = glob.glob(os.path.join(ROOT_DIR, "*.docx"))
if not docx_files:
    print("Không tìm thấy file .docx trong", ROOT_DIR)
    sys.exit(1)

docx_path = docx_files[0]
print(f"Đang đọc file: {docx_path}")

ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read('word/document.xml')

tree = ET.fromstring(xml_content)
body = tree.find('w:body', ns)

def extract_paragraph_info(elem):
    pPr = elem.find('w:pPr', ns)
    style_val = ""
    is_list = False
    ilvl = 0
    if pPr is not None:
        pStyle = pPr.find('w:pStyle', ns)
        if pStyle is not None:
            style_val = pStyle.attrib.get(f"{{{ns['w']}}}val", "")
        numPr = pPr.find('w:numPr', ns)
        if numPr is not None:
            is_list = True
            ilvl_elem = numPr.find('w:ilvl', ns)
            if ilvl_elem is not None:
                try:
                    ilvl = int(ilvl_elem.attrib.get(f"{{{ns['w']}}}val", "0"))
                except ValueError:
                    ilvl = 0

    runs = []
    for r in elem.findall('.//w:r', ns):
        rPr = r.find('w:rPr', ns)
        bold = False
        italic = False
        is_vert_align = False
        if rPr is not None:
            b_elem = rPr.find('w:b', ns)
            if b_elem is not None and b_elem.attrib.get(f"{{{ns['w']}}}val", "true") not in ("false", "0"):
                bold = True
            i_elem = rPr.find('w:i', ns)
            if i_elem is not None and i_elem.attrib.get(f"{{{ns['w']}}}val", "true") not in ("false", "0"):
                italic = True
            va_elem = rPr.find('w:vertAlign', ns)
            if va_elem is not None:
                is_vert_align = True
        
        t_text = "".join([t.text for t in r.findall('.//w:t', ns) if t.text])
        if t_text:
            runs.append({
                'text': t_text,
                'bold': bold,
                'italic': italic,
                'super': is_vert_align
            })

    # Loại bỏ các run ở cuối nếu chỉ là số chú thích tài liệu tham khảo (ví dụ '11', '48', '95')
    while runs and re.match(r'^\s*\d+(\s*,\s*\d+)*\s*$', runs[-1]['text']):
        # Chỉ xóa nếu trước đó là dấu kết câu (., !, ?, ), ")
        if len(runs) >= 2 and re.search(r'[\.\!\?\"\)]\s*$', runs[-2]['text']):
            runs.pop()
        else:
            break

    # Ghép các run liên tiếp có cùng định dạng bold
    merged_runs = []
    for r in runs:
        if merged_runs and merged_runs[-1]['bold'] == r['bold']:
            merged_runs[-1]['text'] += r['text']
        else:
            merged_runs.append({'text': r['text'], 'bold': r['bold']})

    raw_plain = "".join([r['text'] for r in merged_runs]).strip()
    # Xóa số chú thích dính liền sau dấu chấm câu (ví dụ: "...trên da.11", "...khỏe mạnh.3 Muỗi...")
    raw_plain = re.sub(r'(?<=[\.\!\?\"\)])\d+(\s*,\s*\d+)*(?=\s|$)', '', raw_plain).strip()

    # Format với markdown bold
    formatted_parts = []
    for r in merged_runs:
        txt = r['text']
        # Xóa số chú thích dính liền sau dấu chấm câu
        txt = re.sub(r'(?<=[\.\!\?\"\)])\d+(\s*,\s*\d+)*(?=\s|$)', '', txt)
        if not txt:
            continue
        if r['bold']:
            # Tránh bọc khoảng trắng thừa bên ngoài **
            leading_space = " " if txt.startswith(" ") else ""
            trailing_space = " " if txt.endswith(" ") else ""
            core = txt.strip()
            if core:
                formatted_parts.append(f"{leading_space}**{core}**{trailing_space}")
            else:
                formatted_parts.append(txt)
        else:
            formatted_parts.append(txt)

    formatted_text = "".join(formatted_parts).strip()
    return {
        'style': style_val,
        'is_list': is_list,
        'ilvl': ilvl,
        'plain': raw_plain,
        'formatted': formatted_text
    }

# Phân tích toàn bộ tài liệu thành các chuyên đề (Sections)
sections = []
current_main_heading = ""
current_section = None

SECTION_METADATA = {
    "1. Các khái niệm về bệnh truyền nhiễm": {
        "slug": "01-nguyen-tac-chung-va-khai-niem-benh-truyen-nhiem",
        "title": "Hỏi đáp: Các khái niệm cơ bản và con đường lây truyền Bệnh truyền nhiễm"
    },
    "2. Vệ sinh cá nhân và môi trường": {
        "slug": "02-ve-sinh-ca-nhan-rua-tay-va-moi-truong-phong-benh",
        "title": "Hỏi đáp: Vệ sinh cá nhân, Quy trình rửa tay 6 bước và Vệ sinh môi trường phòng bệnh"
    },
    "3. Các biện pháp y tế công cộng khi có dịch": {
        "slug": "03-cac-bien-phap-y-te-cong-cong-khi-co-dich",
        "title": "Hỏi đáp: Các biện pháp y tế công cộng và quy định pháp luật khi có dịch bệnh"
    },
    "1. Bệnh do vector: Sốt xuất huyết Dengue": {
        "slug": "04-hoi-dap-benh-sot-xuat-huyet-dengue",
        "title": "Cẩm nang Hỏi đáp: Phòng chống, chăm sóc và dấu hiệu nguy hiểm Bệnh Sốt xuất huyết Dengue"
    },
    "2. Bệnh lây qua đường tiêu hóa/hô hấp: Tay Chân Miệng (TCM)": {
        "slug": "05-hoi-dap-benh-tay-chan-mieng-tcm",
        "title": "Cẩm nang Hỏi đáp: Phòng chống, chăm sóc trẻ và dấu hiệu trở nặng Bệnh Tay Chân Miệng (TCM)"
    },
    "3. Bệnh phát ban do virus: Sởi & Thủy đậu": {
        "slug": "06-hoi-dap-benh-soi-va-thuy-dau",
        "title": "Cẩm nang Hỏi đáp: Triệu chứng, cách chăm sóc tại nhà và phòng ngừa Bệnh Sởi & Thủy đậu"
    },
    "4. Bệnh hô hấp theo mùa: Cúm mùa": {
        "slug": "07-hoi-dap-benh-cum-mua",
        "title": "Cẩm nang Hỏi đáp: Triệu chứng, điều trị tại nhà và phòng ngừa Bệnh Cúm mùa"
    },
    "Phần III: Tiếp cận thông tin chính thức": {
        "slug": "08-tiep-can-thong-tin-chinh-thuc-va-lien-he-cdc-da-nang",
        "title": "Hỏi đáp: Nguồn thông tin y tế chính thống và hướng dẫn liên hệ CDC Đà Nẵng"
    }
}

master_lines = [
    "# CẨM NANG HỎI ĐÁP PHÒNG, CHỐNG BỆNH TRUYỀN NHIỄM - CDC ĐÀ NẴNG",
    "",
    "> **Đơn vị biên soạn & phát hành**: Trung tâm Kiểm soát bệnh tật (CDC) thành phố Đà Nẵng",
    "> **Chuyên mục**: Hỏi đáp Y tế dự phòng & Phòng chống dịch bệnh",
    "> **Đối tượng phục vụ**: Người dân, phụ huynh và cán bộ y tế tra cứu trên Zalo OA CDC Đà Nẵng",
    "",
    "---",
    ""
]

for elem in body:
    tag = elem.tag.split('}')[-1]
    if tag != 'p':
        continue
    
    info = extract_paragraph_info(elem)
    plain = info['plain']
    if not plain:
        continue

    # Dừng khi gặp phần TÀI LIỆU THAM KHẢO ở cuối
    if info['style'] == 'Heading4' and 'TÀI LIỆU THAM KHẢO' in plain.upper():
        break

    if info['style'] == 'Heading2':
        current_main_heading = plain
        master_lines.append(f"\n## {plain}\n")
        if plain in SECTION_METADATA:
            meta = SECTION_METADATA[plain]
            current_section = {
                'slug': meta['slug'],
                'title': meta['title'],
                'main_heading': current_main_heading,
                'sub_heading': plain,
                'lines': [
                    f"# {meta['title']}",
                    "",
                    f"- **Đơn vị**: Trung tâm Kiểm soát bệnh tật (CDC) Đà Nẵng",
                    f"- **Chuyên mục**: Phòng chống bệnh truyền nhiễm (`{ current_main_heading }`)",
                    "",
                    "---",
                    ""
                ]
            }
            sections.append(current_section)
        continue

    if info['style'] == 'Heading3':
        master_lines.append(f"\n### {plain}\n")
        meta = SECTION_METADATA.get(plain, {
            "slug": f"section-{len(sections)+1}",
            "title": plain
        })
        current_section = {
            'slug': meta['slug'],
            'title': meta['title'],
            'main_heading': current_main_heading,
            'sub_heading': plain,
            'lines': [
                f"# {meta['title']}",
                "",
                f"- **Đơn vị**: Trung tâm Kiểm soát bệnh tật (CDC) Đà Nẵng",
                f"- **Phần**: {current_main_heading}",
                f"- **Chuyên đề**: {plain}",
                "",
                "---",
                ""
            ]
        }
        sections.append(current_section)
        continue

    # Xử lý Câu hỏi
    if plain.startswith("Câu hỏi:"):
        q_text = plain.replace("Câu hỏi:", "").strip()
        line_md = f"\n#### ❓ Câu hỏi: {q_text}\n"
    elif plain == "Trả lời:":
        line_md = f"**💡 Trả lời:**"
    elif info['is_list']:
        indent = "  " * info['ilvl']
        line_md = f"{indent}- {info['formatted']}"
    else:
        # Kiểm tra nếu dòng bắt đầu bằng "Bước 1:", "Bước 2:"...
        if re.match(r'^Bước \d+:', plain):
            step_parts = plain.split(":", 1)
            line_md = f"- **{step_parts[0]}:** {step_parts[1].strip()}"
        else:
            line_md = f"{info['formatted']}\n"

    master_lines.append(line_md)
    if current_section is not None:
        current_section['lines'].append(line_md)

# Làm sạch khoảng trắng thừa và xuất các file chuyên đề
for sec in sections:
    sec_content = "\n".join(sec['lines'])
    sec_content = re.sub(r'\n{3,}', '\n\n', sec_content).strip() + "\n"
    sec_path = os.path.join(DATA_DIR, f"{sec['slug']}.md")
    with open(sec_path, 'w', encoding='utf-8') as f:
        f.write(sec_content)
    print(f"✅ Đã tạo chuyên đề: {sec['slug']}.md ({len(sec_content)} ký tự)")

# Xuất file tổng hợp
master_content = "\n".join(master_lines)
master_content = re.sub(r'\n{3,}', '\n\n', master_content).strip() + "\n"

master_paths = [
    os.path.join(DATA_DIR, "HOI_DAP_PHONG_CHONG_BENH_TRUYEN_NHIEM_TONG_HOP.md"),
    os.path.join(ROOT_DIR, "HOI_DAP_PHONG_CHONG_BENH_TRUYEN_NHIEM_CDC_DA_NANG.md"),
    os.path.join(PUBLIC_DIR, "HOI_DAP_PHONG_CHONG_BENH_TRUYEN_NHIEM_CDC_DA_NANG.md")
]

for mp in master_paths:
    with open(mp, 'w', encoding='utf-8') as f:
        f.write(master_content)

print(f"\n🎉 Đã xuất file Markdown tổng hợp ({len(master_content)} ký tự) tại:")
for mp in master_paths:
    print(f"   -> {mp}")
