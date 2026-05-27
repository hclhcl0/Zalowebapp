const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (f !== 'node_modules' && f !== '.next' && f !== '.git') walk(dirPath, callback);
    } else {
      if (f.endsWith('.js') || f.endsWith('.jsx')) {
        callback(dirPath);
      }
    }
  });
}

const replacements = [
  // Page titles and headers
  { r: /Gửi Email Báo Lương &amp; Thuế/g, v: "Gửi Email Thông Tin Nội Bộ Cơ Quan" },
  { r: /Gửi Email Báo Lương & Thuế/g, v: "Gửi Email Thông Tin Nội Bộ Cơ Quan" },
  { r: /Gửi Lương &amp; Thuế/g, v: "Cập Nhật Thông Tin Cơ Quan" },
  { r: /Gửi Lương & Thuế/g, v: "Cập Nhật Thông Tin Cơ Quan" },
  { r: /Gửi Email Báo Lương/g, v: "Gửi Cập Nhật Thông Tin Nội Bộ" },
  { r: /Báo Lương Quý/g, v: "Thông Báo Nội Bộ" },
  { r: /Báo Thuế TNCN/g, v: "Cập Nhật Thông Tin Khác" },
  { r: /báo lương quý, thuế TNCN/g, v: "cập nhật thông tin nội bộ cơ quan" },

  // Phrases
  { r: /nhận được thông báo lương, thuế TNCN/g, v: "nhận được cập nhật thông tin nội bộ cơ quan" },
  { r: /nhận lương &amp; thuế/g, v: "nhận thông tin nội bộ" },
  { r: /nhận bảng lương, thuế/g, v: "nhận thông tin nội bộ cơ quan" },
  { r: /gửi báo lương & báo thuế/g, v: "gửi thông tin nội bộ cơ quan" },
  { r: /gửi thông tin gửi lương/gi, v: "gửi thông tin nội bộ" },
  { r: /thông báo lương, thuế/gi, v: "thông tin nội bộ" },
  
  // Specific words
  { r: /Báo lương/g, v: "Thông báo nội bộ" },
  { r: /báo lương/g, v: "thông báo nội bộ" },
  { r: /Báo thuế/g, v: "Cập nhật thông tin khác" },
  { r: /báo thuế/g, v: "cập nhật thông tin khác" },
  { r: /Bảng lương/g, v: "Thông tin nội bộ" },
  { r: /bảng lương/g, v: "thông tin nội bộ" },
  { r: /Thuế TNCN/g, v: "Thông tin nội bộ khác" },
  { r: /thuế TNCN/g, v: "thông tin nội bộ khác" },
  { r: /tiền lương/g, v: "thông tin nội bộ" },
  { r: /Lương/g, v: "Thông tin nội bộ" },
  { r: /lương/g, v: "thông tin nội bộ" },
  { r: /Thuế/g, v: "Cập nhật khác" },
  { r: /thuế/g, v: "cập nhật khác" },
];

walk(path.join(__dirname, 'src'), (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  for (const {r, v} of replacements) {
    content = content.replace(r, v);
  }

  // Quick fix for redundant stuff
  content = content.replace(/thông tin nội bộ tăng thêm/gi, "thông báo nội bộ");

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
});
