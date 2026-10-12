import urllib.request
import json
import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

# Xác định đường dẫn thư mục xuất dữ liệu Markdown
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(CURRENT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data", "cam-nang-suc-khoe")
os.makedirs(DATA_DIR, exist_ok=True)

def node_to_markdown(node):
    if not node or not isinstance(node, dict):
        return ""
    
    ntype = node.get("type")
    
    if ntype == "text":
        text = node.get("text", "")
        fmt = node.get("format", 0)
        if fmt & 1:
            text = f"**{text.strip()}** "
        elif fmt & 2:
            text = f"*{text.strip()}* "
        return text
    
    if ntype == "linebreak":
        return "\n"
    
    children_text = "".join([node_to_markdown(c) for c in node.get("children", [])])
    
    if ntype == "heading":
        tag = node.get("tag", "h2")
        level = 2
        if tag == "h1": level = 1
        elif tag == "h3": level = 3
        elif tag == "h4": level = 4
        return f"\n\n{'#' * level} {children_text.strip()}\n\n"
    
    if ntype == "paragraph":
        p_text = children_text.strip()
        if not p_text:
            return ""
        return f"\n\n{p_text}"
    
    if ntype == "list":
        list_type = node.get("listType", "bullet")
        items = []
        for i, item in enumerate(node.get("children", [])):
            item_text = node_to_markdown(item).strip()
            if not item_text:
                continue
            if list_type == "number":
                items.append(f"{i+1}. {item_text}")
            else:
                items.append(f"- {item_text}")
        return "\n\n" + "\n".join(items) + "\n\n"
    
    if ntype == "listitem":
        return children_text
    
    if ntype == "upload":
        val = node.get("value", {})
        url = val.get("url", "")
        alt = val.get("alt") or val.get("filename") or "Hình ảnh"
        if url:
            return f"\n\n![{alt}]({url})\n\n"
        return ""
    
    if ntype == "block":
        fields = node.get("fields", {})
        imgs = fields.get("images", [])
        md_imgs = []
        for img in imgs:
            img_data = img.get("image", {})
            u = img_data.get("url")
            a = img_data.get("alt") or img_data.get("filename") or "Hình ảnh"
            if u:
                md_imgs.append(f"![{a}]({u})")
        return "\n\n" + "\n\n".join(md_imgs) + "\n\n"
    
    if ntype == "link":
        url = node.get("fields", {}).get("url", "")
        return f"[{children_text.strip()}]({url})"
    
    return children_text

def clean_md(text):
    text = re.sub(r'\n{3,}', '\n\n', text)
    lines = [l.strip() for l in text.split('\n')]
    return '\n'.join(lines)

EXTRA_CONTENT_2188 = """
---

## CHI TIẾT LỊCH TIÊM CHỦNG THEO TỪNG ĐỐI TƯỢNG (INFOGRAPHIC CDC ĐÀ NẴNG)

### 1. LỊCH TIÊM CHỦNG CHO TRẺ DƯỚI 2 TUỔI

| Độ tuổi | Các loại Vắc-xin & Bệnh cần tiêm phòng | Ghi chú & Loại vắc xin khuyến nghị |
| :--- | :--- | :--- |
| **Sơ sinh** | • Lao (BCG)<br>• Viêm gan B liều sơ sinh | Tiêm càng sớm càng tốt trong 24 giờ đầu sau sinh |
| **2 tháng tuổi** | • Vắc-xin 6 trong 1 (Bạch hầu, Ho gà, Uốn ván, Bại liệt, Hib, Viêm gan B) - Mũi 1<br>• Rotavirus (uống liều 1)<br>• Phế cầu khuẩn (Mũi 1)<br>• Não mô cầu nhóm B (Bexsero) - Mũi 1 | Có thể dùng Hexaxim (Pháp) hoặc Infanrix Hexa (Bỉ). Rota: Rotarix, Rotateq hoặc Rotavin. Phế cầu: Synflorix hoặc Prevenar 13. |
| **3 tháng tuổi** | • Vắc-xin 6 trong 1 (Mũi 2)<br>• Rotavirus (uống liều 2)<br>• Phế cầu khuẩn (Mũi 2) | Cách mũi trước tối thiểu 1 tháng |
| **4 tháng tuổi** | • Vắc-xin 6 trong 1 (Mũi 3)<br>• Rotavirus (uống liều 3 nếu dùng Rotateq)<br>• Phế cầu khuẩn (Mũi 3 nếu dùng phác đồ 3+1) | Hoàn thành phác đồ cơ bản vắc xin phối hợp |
| **6 - 8 tháng tuổi** | • Cúm mùa (Mũi 1 và Mũi 2 cách nhau 1 tháng nếu lần đầu tiêm)<br>• Não mô cầu nhóm B + C (VA-Mengoc-BC, từ 6 tháng, 2 mũi cách 45 ngày)<br>• Não mô cầu nhóm A, C, Y, W-135 | Cúm: Influvac Tetra hoặc GCFLU Quadrivalent |
| **9 tháng tuổi** | • Sởi đơn hoặc Sởi - Quai bị - Rubella (Priorix)<br>• Viêm não Nhật Bản (Imojev - vắc-xin sống giảm độc lực tái tổ hợp)<br>• Thủy đậu (Varilrix tiêm từ 9 tháng) | Vắc-xin thế hệ mới bảo vệ sớm cho trẻ từ 9 tháng tuổi |
| **12 tháng tuổi (1 tuổi)** | • Sởi - Quai bị - Rubella (MMR II hoặc Priorix nhắc)<br>• Thủy đậu (Varivax hoặc Varilrix)<br>• Viêm gan A (Avaxim hoặc Havax)<br>• Viêm não Nhật Bản (Jevax mũi 1 & 2 hoặc Imojev nhắc sau 1 năm)<br>• Phế cầu khuẩn (mũi nhắc lại) | Kiểm tra rà soát các mũi tiêm nhắc |
| **14 tháng tuổi** | • Sởi - Quai bị - Rubella<br>• Thủy đậu (mũi nhắc)<br>• Viêm gan A / Viêm gan A+B | Rà soát mũi nhắc theo khoảng cách chỉ định |
| **18 tháng tuổi** | • Bạch hầu - Ho gà - Uốn ván - Bại liệt (Mũi nhắc 4 trong 1 Tetraxim hoặc 6 trong 1)<br>• Sởi - Rubella / Sởi - Quai bị - Rubella | Giúp duy trì kháng thể bền vững trước tuổi đi nhà trẻ |

*Nguyên tắc sử dụng lịch cho trẻ dưới 2 tuổi:*
- Giới hạn tuổi và số liều của vắc-xin phòng Rotavirus, phế cầu, não mô cầu, viêm não Nhật Bản, Sởi - Quai bị - Rubella và thủy đậu phụ thuộc từng loại vắc-xin.
- Khi trễ lịch, mang toàn bộ hồ sơ cũ để nhân viên y tế tư vấn tiêm sớm nhất có thể; không tự tiêm lại từ đầu.

---

### 2. LỊCH TIÊM CHỦNG CHO TRẺ TỪ 2 ĐẾN 6 TUỔI (TIỀN HỌC ĐƯỜNG)
*Dành cho trẻ chuẩn bị đi học mầm non và tiểu học; ưu tiên rà soát mũi nhắc và các mũi còn thiếu:*

1. **Bạch hầu - Ho gà - Uốn ván - Bại liệt**: 1 liều nhắc trong giai đoạn 4 - 6 tuổi (vắc-xin Tetraxim). Đối chiếu các mũi phối hợp đã tiêm trước đó.
2. **Sốt xuất huyết (Qdenga)**: 2 liều cách nhau 3 tháng khi trẻ đủ 4 tuổi trở lên.
3. **Cúm mùa**: Tiêm nhắc hằng năm 1 liều vào trước mùa dịch cúm.
4. **Phế cầu**: Tiêm bù/nhắc nếu trước đó chưa đủ liều. Số liều tùy độ tuổi, bệnh nền và loại vắc-xin.
5. **Não mô cầu nhóm B & ACYW**: Tiêm bù nếu chưa tiêm hoặc chưa hoàn thành phác đồ.
6. **Viêm não Nhật Bản**: Tiếp tục hoặc tiêm nhắc theo loại vắc-xin (Imojev nhắc sau 1-2 năm; Jevax tiêm nhắc mỗi 3 năm đến 15 tuổi).
7. **Thủy đậu & Sởi - Quai bị - Rubella (MMR)**: Tiêm nhắc/tiêm bù liều 2 nếu chưa đủ liều trước khi trẻ vào lớp 1.
8. **Thương hàn & Tả uống**: Dành cho vùng dịch tễ nguy cơ. Tả uống 2 liều cách nhau tối thiểu 2 tuần; Thương hàn tiêm nhắc mỗi 3 năm.
9. **Viêm gan A, B & Dại**: Tiêm bù theo sản phẩm; vắc-xin phòng dại tiêm ngay khi có phơi nhiễm (bị chó/mèo cào, cắn).

---

### 3. LỊCH TIÊM CHỦNG CHO THANH THIẾU NIÊN (9 - 18 TUỔI)

1. **Vắc-xin HPV (Gardasil / Gardasil 9 phòng ung thư cổ tử cung, ung thư hầu họng, sùi mào gà)**:
   - Nhóm 9 - 14 tuổi: Phác đồ tinh gọn 2 liều cách nhau 6 tháng.
   - Nhóm 15 - 18 tuổi trở lên: Phác đồ 3 liều theo lịch 0 - 2 - 6 tháng.
   - Khuyến cáo tiêm cho cả nam và nữ để đạt miễn dịch cộng đồng tối ưu.
2. **Sốt xuất huyết (Qdenga)**: 2 liều cách nhau 3 tháng (dành cho người từ 4 tuổi trở lên).
3. **Bạch hầu - Ho gà - Uốn ván**: 1 liều nhắc vắc-xin Tdap/Td (như Boostrix / Adacel) và nhắc lại mỗi 10 năm.
4. **Cúm mùa**: Tiêm nhắc định kỳ 1 liều mỗi năm.
5. **Não mô cầu B & ACYW (Menactra / Bexsero / Mengoc BC)**: Tiêm phòng bảo vệ khỏi bệnh viêm màng não tối cấp khi sinh hoạt môi trường học đường, ký túc xá.
6. **Viêm não Nhật Bản, Viêm gan A/B, Thủy đậu, MMR**: Rà soát hồ sơ tiêm chủng từ nhỏ, tiêm bù đủ liều nếu chưa có miễn dịch.

---

### 4. LỊCH TIÊM CHỦNG CHO PHỤ NỮ CHUẨN BỊ MANG THAI VÀ TRONG THAI KỲ

*Nguyên tắc:* Hoàn tất các vắc-xin sống giảm độc lực TRƯỚC khi mang thai tối thiểu 1 - 3 tháng. Trong thai kỳ chỉ tiêm vắc-xin bất hoạt được bác sĩ chỉ định.

1. **Trước khi mang thai (Chuẩn bị mang thai):**
   - **HPV**: 3 liều (0 - 2 - 6 tháng). Ngưng tiêm nếu phát hiện có thai.
   - **Sởi - Quai bị - Rubella (MMR)**: 2 liều cách nhau 1 tháng; hoàn tất trước khi có thai ít nhất 1 - 3 tháng.
   - **Thủy đậu**: 2 liều cách nhau 1 tháng; hoàn tất trước khi có thai ít nhất 1 - 3 tháng.
   - **Cúm mùa**: Tiêm 1 mũi hằng năm (có thể tiêm trước hoặc trong thai kỳ).
   - **Viêm gan B & Viêm gan A**: Xét nghiệm kháng thể và tiêm đủ phác đồ (Viêm gan B: 0 - 1 - 6 tháng; Viêm gan A: 2 mũi cách nhau 6 tháng).
   - **Sốt xuất huyết**: Hoàn tất 2 liều cách nhau 3 tháng trước khi mang thai.
2. **Trong thai kỳ:**
   - **Uốn ván (VAT) hoặc Bạch hầu - Ho gà - Uốn ván (Tdap/Boostrix)**:
     - Nếu tiêm Tdap: Tiêm 1 liều trong 3 tháng giữa hoặc 3 tháng cuối thai kỳ (tốt nhất từ tuần 27 đến 36) để truyền kháng thể ho gà bảo vệ trẻ sơ sinh.
     - Nếu tiêm Uốn ván đơn (VAT): Mang thai lần đầu tiêm 2 mũi (mũi 1 lúc thai 20-24 tuần, mũi 2 sau ít nhất 30 ngày và trước dự sinh ít nhất 1 tháng).
   - **Cúm mùa**: Tiêm 1 liều trong bất kỳ giai đoạn nào của thai kỳ (ưu tiên từ 3 tháng giữa trở đi).
   - **Chống chỉ định trong thai kỳ**: Sởi - Quai bị - Rubella, Thủy đậu, Sốt xuất huyết (do là vắc-xin sống).

---

### 5. LỊCH TIÊM CHỦNG CHO NGƯỜI CAO TUỔI VÀ NGƯỜI CÓ BỆNH NỀN

*Ưu tiên bảo vệ người cao tuổi, người có bệnh mạn tính (tim mạch, hen suyễn, COPD, đái tháo đường, suy thận):*

1. **Cúm mùa**: Tiêm nhắc 1 liều mỗi năm. Giảm 50-70% nguy cơ nhập viện và tử vong do biến chứng hô hấp/tim mạch.
2. **Phế cầu khuẩn (Prevenar 13 / Pneumovax 23)**: Phòng viêm phổi nặng, nhiễm trùng huyết và viêm màng não do phế cầu.
3. **Bạch hầu - Ho gà - Uốn ván (Tdap)**: Tiêm nhắc mỗi 10 năm 1 liều.
4. **Zona thần kinh (Shingrix)**: 2 liều cách nhau 2 - 6 tháng (hiệu quả bảo vệ > 90% phòng đau thần kinh sau zona).
5. **Sốt xuất huyết (Qdenga)**: 2 liều cách nhau 3 tháng.
6. **Viêm gan A, B**: Tiêm theo chỉ định và kết quả xét nghiệm kháng thể.
"""

EXTRA_CONTENT_2186 = """
---

## BẢNG TRA CỨU NHANH LỊCH TIÊM CHỦNG CHI TIẾT CHO TRẺ EM (CDC ĐÀ NẴNG)

| Vắc-xin phòng bệnh | Sơ sinh | 2 tháng | 3 tháng | 4 tháng | 6 tháng | 9 tháng | 12 tháng | 14 tháng | 18 tháng | 2 - 3 tuổi | 4 - 6 tuổi |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Lao (BCG)** | Mũi 1 | | | | | | | | | | |
| **Viêm gan B sơ sinh** | Mũi 1 | | | | | | | | | | |
| **6 trong 1 (Hexaxim / Infanrix Hexa)** | | Mũi 1 | Mũi 2 | Mũi 3 | | | | | Mũi nhắc | | |
| **Bại liệt - Bạch hầu - Ho gà - Uốn ván (Tetraxim 4 trong 1)** | | | | | | | | | | | Mũi nhắc |
| **Rotavirus (Rotarix / Rotateq / Rotavin)** | | Liều 1 | Liều 2 | Liều 3* | | | | | | | |
| **Phế cầu khuẩn (Synflorix / Prevenar 13)** | | Mũi 1 | Mũi 2 | Mũi 3 | | | Mũi 4 (nhắc) | | | | |
| **Não mô cầu nhóm B (Bexsero)** | | Mũi 1 | Mũi 2 | | | | Mũi nhắc | | | | |
| **Não mô cầu BC (VA-Mengoc-BC)** | | | | | Mũi 1 | | Mũi 2 (cách 45 ngày) | | | | |
| **Não mô cầu ACYW (Menactra)** | | | | | | Mũi 1 | Mũi 2 (cách 3 tháng) | | | | |
| **Cúm mùa (Influvac Tetra / GCFLU)** | | | | | Mũi 1 & 2* | | Nhắc hằng năm | | Nhắc | Nhắc | Nhắc |
| **Sởi - Quai bị - Rubella (Priorix)** | | | | | | Mũi 1 | | Mũi 2 | | | Nhắc |
| **Sởi - Quai bị - Rubella (MMR II)** | | | | | (Dịch)* | | Mũi 1 | | Mũi 2 (cách ≥3 tháng) | | Nhắc |
| **Thủy đậu (Varilrix)** | | | | | | Mũi 1 | | Mũi 2 (cách ≥3 tháng) | | | Nhắc |
| **Thủy đậu (Varivax)** | | | | | | | Mũi 1 | | Mũi 2 (cách ≥1 tháng) | | Nhắc |
| **Viêm não Nhật Bản sống (Imojev)** | | | | | | Mũi 1 | | | | Mũi 2 (cách 1 năm) | |
| **Viêm não Nhật Bản bất hoạt (Jevax)** | | | | | | | Mũi 1 & 2 (cách 1-2 tuần) | | | Mũi 3 (sau 1 năm) | Nhắc mỗi 3 năm |
| **Viêm gan A (Avaxim / Havax)** | | | | | | | Mũi 1 | | Mũi 2 (cách 6 tháng) | | |
| **Viêm gan A + B (Twinrix)** | | | | | | | Mũi 1 | | Mũi 2 & 3 | | |
| **Thương hàn (Typhim Vi)** | | | | | | | | | | 1 mũi (nhắc mỗi 3 năm) | Nhắc |
| **Tả uống (morbillivirus/vibriocidal)** | | | | | | | | | | 2 liều cách nhau 2 tuần | |
| **Sốt xuất huyết (Qdenga)** | | | | | | | | | | (Từ 4 tuổi) 2 mũi cách 3 tháng |

*Ghi chú quan trọng:*
- **Rotavirus**: Liều 3 chỉ áp dụng cho Rotateq (Mỹ). Vắc-xin Rotarix (Bỉ) chỉ cần uống 2 liều. Phải hoàn thành uống Rota trước 6-8 tháng tuổi tùy loại.
- **Cúm mùa**: Trẻ từ 6 tháng đến dưới 9 tuổi chưa từng tiêm cúm cần tiêm 2 mũi cách nhau tối thiểu 4 tuần; sau đó tiêm nhắc 1 mũi mỗi năm.
- **Khoảng cách giữa các vắc-xin sống giảm độc lực**: Nếu không tiêm cùng một ngày, hai vắc-xin sống (như Thủy đậu, Sởi-Quai bị-Rubella, Imojev) phải tiêm cách nhau tối thiểu 28 ngày (4 tuần).
"""

EXTRA_CONTENT_2185 = """
---

## BẢNG QUY ĐỊNH LỊCH TIÊM CHỦNG CHI TIẾT CHO PHỤ NỮ CHUẨN BỊ MANG THAI VÀ TRONG THAI KỲ (CDC ĐÀ NẴNG)

| Tên Vắc-xin phòng bệnh | Giai đoạn Chuẩn bị mang thai | 3 tháng đầu thai kỳ | 3 tháng giữa thai kỳ | 3 tháng cuối thai kỳ | Lưu ý đặc biệt & Thời gian tránh thai |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Cúm mùa (Influvac Tetra / GCFLU)** | Tiêm 1 mũi nhắc lại hằng năm | Tiêm được | **Khuyến nghị tốt nhất** | Tiêm được | Có thể tiêm ở bất kỳ giai đoạn nào của thai kỳ; tiêm từ 3 tháng giữa giúp tối ưu truyền kháng thể cho con. |
| **Bạch hầu - Ho gà - Uốn ván (Tdap - Boostrix / Adacel)** | • Đã tiêm đủ lịch cơ bản: Tiêm 1 mũi nhắc.<br>• Chưa rõ tiền sử: Mũi 1 (lần đầu), Mũi 2 (sau 1 tháng), Mũi 3 (sau 6 tháng). | Không ưu tiên | **Khuyến nghị tiêm 1 mũi (tuần 27 - 36)** | **Khuyến nghị tiêm 1 mũi** | Cung cấp kháng thể bảo vệ trẻ sơ sinh khỏi ho gà ác tính trong những tháng đầu đời chưa thể tự tiêm phòng. |
| **Uốn ván đơn (VAT)** | • Đã đủ 3 mũi cơ bản: Tiêm sớm khi có thai lần đầu, Mũi 2 sau ≥1 tháng, Mũi 3 sau ≥1 năm.<br>• Chưa tiêm hoặc không rõ: Mũi 1 sớm khi có thai; Mũi 2 sau ≥1 tháng; Mũi 3 sau ≥6 tháng; Mũi 4 sau ≥1 năm; Mũi 5 sau ≥1 năm. | Khám sàng lọc | Tiêm Mũi 1 | Tiêm Mũi 2 (trước sinh ≥1 tháng) | Đảm bảo mũi tiêm cuối cùng cách ngày dự sinh tối thiểu 1 tháng để phòng uốn ván rốn sơ sinh. |
| **Sốt xuất huyết (Qdenga)** | Tiêm đủ 2 mũi cách nhau 3 tháng | **CHỐNG CHỈ ĐỊNH** | **CHỐNG CHỈ ĐỊNH** | **CHỐNG CHỈ ĐỊNH** | Hoàn tất phác đồ trước khi có thai. Vắc-xin sống giảm độc lực. |
| **HPV (Ung thư cổ tử cung, sùi mào gà)** | Tiêm 3 mũi (Lịch 0 - 2 - 6 tháng) | **CHỐNG CHỈ ĐỊNH** | **CHỐNG CHỈ ĐỊNH** | **CHỐNG CHỈ ĐỊNH** | Nếu phát hiện mang thai khi chưa tiêm đủ 3 mũi: Tạm hoãn, đợi sau khi sinh xong tiêm tiếp, không cần tiêm lại từ đầu. |
| **Phế cầu khuẩn (Prevenar 13 / Pneumovax 23)** | Tiêm 1 mũi phòng viêm phổi, viêm màng não | Chỉ tiêm khi có chỉ định đặc biệt | Chỉ tiêm khi có chỉ định đặc biệt | Chỉ tiêm khi có chỉ định đặc biệt | Hoàn thành trước khi mang thai là tốt nhất. |
| **Sởi - Quai bị - Rubella (MMR II / Priorix)** | Tiêm 2 mũi cách nhau ≥1 tháng | **CHỐNG CHỈ ĐỊNH** | **CHỐNG CHỈ ĐỊNH** | **CHỐNG CHỈ ĐỊNH** | **Tránh mang thai tối thiểu 1 đến 3 tháng sau khi tiêm.** Nếu vô tình mang thai sau tiêm, không có chỉ định phá thai, cần theo dõi thai kỳ chặt chẽ. |
| **Thủy đậu (Varivax / Varilrix)** | Tiêm 2 mũi cách nhau ≥1 tháng | **CHỐNG CHỈ ĐỊNH** | **CHỐNG CHỈ ĐỊNH** | **CHỐNG CHỈ ĐỊNH** | **Tránh mang thai tối thiểu 1 đến 3 tháng sau khi tiêm.** |
| **Viêm gan B** | Tiêm phác đồ chuẩn 3 mũi (0 - 1 - 6 tháng). Cần xét nghiệm HBsAg & Anti-HBs trước tiêm. | Chỉ tiêm khi có nguy cơ cao | Chỉ tiêm khi có nguy cơ cao | Chỉ tiêm khi có nguy cơ cao | Vắc-xin tái tổ hợp bất hoạt, an toàn nếu lỡ tiêm trong thai kỳ khi có nguy cơ phơi nhiễm cao. |
| **Viêm gan A / Viêm gan A+B (Twinrix)** | Tiêm 2 - 3 mũi theo phác đồ chỉ định | Thận trọng | Thận trọng | Thận trọng | Tốt nhất hoàn tất trước khi mang thai. |
"""

EXTRA_CONTENT_2184 = """
---

## SƠ ĐỒ VÀ CHI TIẾT 6 BƯỚC QUY TRÌNH TIÊM CHỦNG TẠI CDC ĐÀ NẴNG

Trung tâm Kiểm soát bệnh tật (CDC) Đà Nẵng thực hiện quy trình tiêm chủng an toàn, khép kín theo tiêu chuẩn của Bộ Y tế:

### Bước 1: Đăng ký thông tin tại quầy Lễ tân
- Khách hàng lấy số thứ tự hoặc xuất trình thông tin đặt lịch hẹn trước qua Zalo OA CDC Đà Nẵng.
- Cung cấp thông tin hành chính, sổ tiêm chủng hoặc ứng dụng tiêm chủng cá nhân.
- Nhận phiếu chỉ định khám sàng lọc ban đầu.

### Bước 2: Khám sàng lọc và Tư vấn trước khi tiêm (Phòng Bác sĩ)
- Bác sĩ chuyên khoa đo nhiệt độ, nghe tim phổi, kiểm tra tổng trạng sức khỏe.
- Khai thác tiền sử bệnh lý, tiền sử dị ứng thuốc/vắc-xin và các phản ứng ở những lần tiêm trước.
- Tư vấn loại vắc-xin phù hợp, phác đồ tiêm, các phản ứng có thể gặp và cách theo dõi xử trí.
- Bác sĩ ra chỉ định tiêm chủng trên hệ thống.

### Bước 3: Nộp tiền tại Quầy Thu ngân
- Khách hàng nộp phiếu chỉ định tại quầy thu ngân.
- Thanh toán viện phí bằng tiền mặt, quẹt thẻ hoặc chuyển khoản ngân hàng qua mã QR.
- Nhận biên lai thu tiền và số thứ tự phòng tiêm.

### Bước 4: Tiêm vắc-xin tại Phòng tiêm
- Điều dưỡng đối chiếu thông tin khách hàng (họ tên, ngày sinh).
- Thực hiện nguyên tắc "3 kiểm tra, 5 đối chiếu": Cho khách hàng / thân nhân kiểm tra trực tiếp hộp thuốc, tên vắc-xin, nước sản xuất, hạn sử dụng, tính nguyên vẹn của lọ vắc-xin và liều lượng tiêm.
- Thực hiện tiêm vắc-xin đúng kỹ thuật (tiêm bắp, tiêm dưới da hoặc cho uống).

### Bước 5: Nghỉ ngơi tại Khu vực theo dõi sau tiêm (Tối thiểu 30 phút)
- Khách hàng ngồi nghỉ ngơi tại khu vực theo dõi thoáng mát, sạch sẽ, có đầy đủ tiện nghi.
- Đây là bước bắt buộc nhằm kịp thời phát hiện và xử trí sớm các phản ứng dị ứng hoặc sốc phản vệ có thể xảy ra sau tiêm.

### Bước 6: Kiểm tra sức khỏe sau tiêm và Hướng dẫn theo dõi tại nhà
- Nhân viên y tế kiểm tra lại vết tiêm, đo nhiệt độ, đánh giá toàn trạng của khách hàng sau 30 phút.
- Hướng dẫn chi tiết cách chăm sóc tại nhà: chế độ dinh dưỡng, theo dõi thân nhiệt, cách chườm vết tiêm, các dấu hiệu cần đưa đến bệnh viện ngay (sốt cao khó hạ, co giật, khó thở, tím tái...).
- Trả sổ tiêm chủng, cập nhật mũi tiêm lên Hệ thống Tiêm chủng Quốc gia và hẹn ngày tiêm mũi tiếp theo.

---
**THÔNG TIN LIÊN HỆ TIÊM CHỦNG CDC ĐÀ NẴNG:**
- **Địa chỉ điểm tiêm:**
  + Cơ sở 1: 315 Phan Châu Trinh, Phường Bình Hiên, Quận Hải Châu, TP. Đà Nẵng.
  + Cơ sở 2: 103 Hùng Vương, Phường Hải Châu 1, Quận Hải Châu, TP. Đà Nẵng.
  + Cơ sở 3: 118 Lê Đình Lý, Phường Vĩnh Trung, Quận Thanh Khê, TP. Đà Nẵng.
- **Hotline tư vấn tiêm chủng:** 0236 3890 407 / 0236 3821 469
- **Thời gian làm việc:** Tất cả các ngày trong tuần (kể cả Thứ Bảy và Chủ Nhật).
"""

def main():
    print("=== BẮT ĐẦU ĐỒNG BỘ CẨM NANG SỨC KHỎE TỪ KSBTSDANANG.VN ===")
    url = 'https://ksbtdanang.vn/api/articles?where[category][equals]=67&limit=50&depth=2'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    
    docs = data.get('docs', [])
    print(f"Tổng số bài viết tìm thấy: {len(docs)}")
    
    all_articles_md = []
    
    for i, doc in enumerate(docs):
        aid = doc.get('id')
        title = doc.get('title', '').strip()
        slug = doc.get('slug', '').strip()
        description = doc.get('description', '') or ''
        source_url = f"https://ksbtdanang.vn/bai-viet/{slug}" if slug else f"https://ksbtdanang.vn/api/articles/{aid}"
        
        root = doc.get('content', {}).get('root', {})
        base_md = node_to_markdown(root)
        
        header = f"# {title}\n\n"
        header += f"- **Nguồn tài liệu**: CDC Đà Nẵng ([{source_url}]({source_url}))\n"
        header += f"- **Chuyên mục**: Cẩm nang Sức khỏe & Tiêm chủng\n"
        header += f"- **Mã bài viết**: `{aid}` | **Slug**: `{slug}`\n\n"
        if description:
            header += f"> **Tóm tắt**: {description.strip()}\n\n"
        
        content = header + base_md
        
        if aid == 2188:
            content += EXTRA_CONTENT_2188
        elif aid == 2186:
            content += EXTRA_CONTENT_2186
        elif aid == 2185:
            content += EXTRA_CONTENT_2185
        elif aid == 2184:
            content += EXTRA_CONTENT_2184
        
        content_clean = clean_md(content)
        
        filename = f"{i+1:02d}-{slug}.md" if slug else f"{i+1:02d}-article-{aid}.md"
        filepath = os.path.join(DATA_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content_clean)
        
        print(f"[{i+1:2d}] Đã lưu: {filename} ({len(content_clean)} ký tự)")
        
        all_articles_md.append({
            'id': aid,
            'title': title,
            'slug': slug,
            'source_url': source_url,
            'description': description,
            'content': content_clean,
            'filename': filename
        })
    
    # Tạo file tổng hợp toàn tập
    summary_path = os.path.join(DATA_DIR, "CAM_NANG_TIEM_CHUNG_VA_SUC_KHOE_CDC_DA_NANG.md")
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write("# TOÀN THƯ CẨM NANG SỨC KHỎE & LỊCH TIÊM CHỦNG - TRUNG TÂM KIỂM SOÁT BỆNH TẬT (CDC) ĐÀ NẴNG\n\n")
        f.write("> **Cơ quan phát hành**: Trung tâm Kiểm soát bệnh tật (CDC) TP. Đà Nẵng\n")
        f.write("> **Website chính thức**: [https://ksbtdanang.vn](https://ksbtdanang.vn)\n")
        f.write("> **Tổng số bài viết & vắc xin chuyên đề**: 19 bài\n")
        f.write("> **Mục đích**: Tài liệu tri thức chuẩn hóa dành cho Khối óc AI Chatbot Zalo OA và cán bộ y tế, người dân tra cứu.\n\n")
        f.write("## MỤC LỤC TỔNG QUAN\n\n")
        for item in all_articles_md:
            f.write(f"- [{item['title']}](#{re.sub(r'[^a-z0-9]+', '-', item['title'].lower()).strip('-')})\n")
        f.write("\n\n---\n\n")
        
        for item in all_articles_md:
            f.write(f"\n\n<!-- ARTICLE_START: {item['id']} -->\n\n")
            f.write(item['content'])
            f.write(f"\n\n<!-- ARTICLE_END: {item['id']} -->\n\n---\n\n")
            
    print(f"\n✅ Đã tạo thành công tài liệu tổng hợp: {summary_path}")

if __name__ == "__main__":
    main()
