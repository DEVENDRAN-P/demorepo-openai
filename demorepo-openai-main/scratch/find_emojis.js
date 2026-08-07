const fs = require('fs');
const path = require('path');

const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F191}-\u{1F251}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F0F5}]|[\u{1F300}-\u{1F5FF}]/u;

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'build') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const srcDir = 'c:\\Users\\LENOVO\\OneDrive\\Desktop\\ALLPROJECTS\\demorepo-openai-main\\demorepo-openai-main\\src';

walkDir(srcDir, (filePath) => {
  const ext = path.extname(filePath);
  const relPath = path.relative(srcDir, filePath);
  if (relPath.startsWith('components') || relPath.startsWith('pages') || relPath.startsWith('i18n')) {
    if (ext === '.jsx' || ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const found = [];
      lines.forEach((line, index) => {
        if (emojiRegex.test(line)) {
          found.push(`  L${index + 1}: ${line.trim()}`);
        }
      });
      if (found.length > 0) {
        console.log(`FILE: ${relPath}`);
        found.forEach(f => console.log(f));
        console.log('');
      }
    }
  }
});
