const fs = require('fs');
const path = require('path');

const destDir = path.join(__dirname, 'public', 'assets');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// 1. 업로드된 로고 및 전경 이미지 복사
const userFiles = [
  {
    src: 'C:\\Users\\82102\\.gemini\\antigravity\\brain\\62c1d12f-b48f-4905-97fe-9c37b522c085\\.user_uploaded\\media_1791603806524_40bff4b6.jpg',
    dest: 'church_exterior.jpg'
  },
  {
    src: 'C:\\Users\\82102\\.gemini\\antigravity\\brain\\62c1d12f-b48f-4905-97fe-9c37b522c085\\.user_uploaded\\media_1791603887874_8add6304.png',
    dest: 'logo_full_white.png'
  },
  {
    src: 'C:\\Users\\82102\\.gemini\\antigravity\\brain\\62c1d12f-b48f-4905-97fe-9c37b522c085\\.user_uploaded\\media_1791603887875_46d03f09.png',
    dest: 'logo_horizontal.png'
  },
  {
    src: 'C:\\Users\\82102\\.gemini\\antigravity\\brain\\62c1d12f-b48f-4905-97fe-9c37b522c085\\.user_uploaded\\media_1791603887877_7cfdbaf2.png',
    dest: 'symbol.png'
  }
];

for (const f of userFiles) {
  try {
    if (fs.existsSync(f.src)) {
      fs.copyFileSync(f.src, path.join(destDir, f.dest));
      console.log(`복사 성공: ${f.dest}`);
    }
  } catch (err) {
    console.error(`복사 실패: ${f.dest}`, err.message);
  }
}

// 2. N 드라이브 상모성당 전경 사진 복사
const nDriveDir = 'N:\\개인\\상모성당\\정보홍보위원회\\상모성당 내외부 전경';
try {
  if (fs.existsSync(nDriveDir)) {
    const files = fs.readdirSync(nDriveDir);
    let count = 0;
    for (const file of files) {
      if (/\.(jpg|jpeg|png)$/i.test(file)) {
        fs.copyFileSync(path.join(nDriveDir, file), path.join(destDir, file));
        count++;
        if (count >= 8) break;
      }
    }
    console.log(`N드라이브 사진 ${count}장 복사 완료`);
  }
} catch (err) {
  console.error('N드라이브 복사 오류:', err.message);
}
