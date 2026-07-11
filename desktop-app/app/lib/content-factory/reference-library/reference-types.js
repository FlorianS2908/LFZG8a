const supportedReferenceExtensions = new Set(['.pdf', '.epub', '.docx', '.txt', '.md', '.html']);

const defaultReferencePolicy = {
  usageMode: 'local-reference-only',
  allowedForAiContext: true,
  allowedForCloud: false,
  allowedForExport: false,
  allowedForParticipant: false,
  copyrightStatus: 'unknown'
};

module.exports = {
  supportedReferenceExtensions,
  defaultReferencePolicy
};
