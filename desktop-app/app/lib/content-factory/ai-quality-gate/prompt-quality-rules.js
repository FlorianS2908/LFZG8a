const HARD_PATTERNS = [
  { id: 'secret-fields', pattern: /apiKey|secret|token|OPENAI_API_KEY/i, message: 'Prompt enthaelt Secret-/Token-Felder.' },
  { id: 'reference-library-path', pattern: /reference-library/i, message: 'Prompt enthaelt reference-library Pfade.' },
  { id: 'raw-source-dumps', pattern: /chunks\.json|extracted\.json|rawText|textPreview|Reference chunk|Originaltext|Buchseite/i, message: 'Prompt enthaelt Rohtext-/Referenzchunk-Hinweise.' },
  { id: 'source-email', pattern: /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i, message: 'Prompt enthaelt moegliche E-Mail-Adresse aus Quellen.' }
];

const BLOCKED_EXECUTABLES = /\.(exe|bat|cmd|ps1)\b/i;
const MAX_PROMPT_CHARS = 40000;

module.exports = {
  HARD_PATTERNS,
  BLOCKED_EXECUTABLES,
  MAX_PROMPT_CHARS
};
