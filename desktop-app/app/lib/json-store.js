const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), 'utf8');
  try { fs.renameSync(temporaryPath, filePath); }
  catch (error) {
    const backupPath = `${filePath}.${process.pid}.bak`;
    try {
      if (fs.existsSync(filePath)) fs.renameSync(filePath, backupPath);
      fs.renameSync(temporaryPath, filePath);
      if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    } catch {
      try { if (!fs.existsSync(filePath) && fs.existsSync(backupPath)) fs.renameSync(backupPath, filePath); } catch { /* preserve the first useful filesystem error */ }
      try { if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath); } catch { /* cleanup is best effort */ }
      throw error;
    }
  }
}

async function writeJsonAtomic(filePath, value) { writeJson(filePath, value); }

module.exports = {
  ensureDir,
  readJson,
  writeJson,
  writeJsonAtomic
};
