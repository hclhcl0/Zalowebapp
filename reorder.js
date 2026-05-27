const fs = require('fs');

const path = 'src/app/followers/page.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add filteredRegLinks calculation before return statement of the component
// The component is FollowersPage. Let's insert the useMemo for filteredRegLinks right before `return (` of the component.
// Actually, no need to use useMemo, just add a const filteredRegLinks = ... right before return.
const filterCode = `
  const filteredRegLinks = regStats?.links 
    ? regStats.links.filter(l => {
        if (!regSearchQuery.trim()) return true;
        const lowerQ = regSearchQuery.toLowerCase();
        return (l.staffNameRaw && l.staffNameRaw.toLowerCase().includes(lowerQ)) ||
               (l.displayName && l.displayName.toLowerCase().includes(lowerQ)) ||
               (l.phone && l.phone.includes(lowerQ)) ||
               (l.department && l.department.toLowerCase().includes(lowerQ));
      })
    : [];
`;

content = content.replace(/(?=\s+return \(\s*<div className="page-layout">)/, filterCode);

// 2. Add the search bar to the header row
const headerRowStr = `
            <div className="registration-header-row" style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div className="card-title">✅ Danh Sách Đã Đăng Ký ({regStats?.totalRegistered ?? 0})</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Nhân viên đã xác nhận tên thật qua link đăng ký</div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
`;
const searchInputStr = `
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Tìm nhân viên..."
                  value={regSearchQuery}
                  onChange={e => setRegSearchQuery(e.target.value)}
                  style={{ width: "200px", height: "32px", fontSize: "0.8rem", padding: "0 10px" }}
                />
`;
content = content.replace(headerRowStr, headerRowStr + searchInputStr);

// 3. Change regStats.links.map to filteredRegLinks.map in both desktop and mobile views
content = content.replace(/regStats\.links\.map/g, "filteredRegLinks.map");

// 4. Move the "Bảng đã đăng ký" card to the top of the "registration" tab.
// It starts with `{/* Bảng đã đăng ký */}` and ends with the matching `</div>` at the end of the card.
// Let's use string manipulation to extract the card.
const startMarker = "{/* Bảng đã đăng ký */}";
const endMarker = "</div>\n        </div>\n      )}"; // End of the tab container.
const split1 = content.indexOf(startMarker);
const split2 = content.lastIndexOf("</div>", content.lastIndexOf("</div>", content.lastIndexOf("</div>", content.indexOf(endMarker)))); // This is tricky. Let's just use regex to extract the block.

fs.writeFileSync('src/app/followers/page.js', content, 'utf8');
