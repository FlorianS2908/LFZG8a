(function exposeDocumentAnalysisWorkflow(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ContentFactoryDocumentAnalysisWorkflow = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createWorkflowHelpers() {
  const TERMINAL_STATUSES = new Set(['completed', 'completed_with_warnings', 'failed', 'cancelled', 'not_found']);

  function normalizeRetryDocumentId(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function createDocumentAnalysisPayload({ project, documents, retryDocumentId }) {
    const retryId = normalizeRetryDocumentId(retryDocumentId);
    return {
      project,
      documents: Array.isArray(documents) ? documents : [],
      retryDocumentId: retryId
    };
  }

  function calculateAnalysisProgress(progress = {}) {
    const total = Math.max(0, Number(progress.total || 0));
    const processed = Math.min(total, Math.max(0, Number(progress.completed || 0) + Number(progress.warningCount || 0) + Number(progress.failed || 0)));
    return { total, processed };
  }

  function isTerminalAnalysisStatus(status) {
    return TERMINAL_STATUSES.has(String(status || ''));
  }

  function bindDocumentAnalysisControls(root, startAnalysis) {
    root.querySelector('[data-document-analyze]')?.addEventListener('click', () => startAnalysis());
    Array.from(root.querySelectorAll('[data-retry-document]')).forEach((button) => {
      button.addEventListener('click', () => startAnalysis(normalizeRetryDocumentId(button.dataset.retryDocument)));
    });
  }

  function createSingleFlightAnalysisStarter(startAnalysis) {
    let running = false;
    return async (...args) => {
      if (running) return undefined;
      running = true;
      try { return await startAnalysis(...args); }
      finally { running = false; }
    };
  }

  async function pollAnalysisUntilTerminal({ operationId, getProgress, onProgress = () => {}, intervalMs = 350, timeoutMs = 120000, maxConsecutiveErrors = 3, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
    const startedAt = Date.now();
    let consecutiveErrors = 0;
    while (Date.now() - startedAt < timeoutMs) {
      await sleep(intervalMs);
      try {
        const progress = await getProgress(operationId);
        consecutiveErrors = 0;
        onProgress(progress);
        if (isTerminalAnalysisStatus(progress?.status)) return progress;
      } catch (error) {
        consecutiveErrors += 1;
        if (consecutiveErrors >= maxConsecutiveErrors) throw error;
      }
    }
    const error = new Error(`Die Analyse hat das Zeitlimit überschritten. Vorgangs-ID: ${operationId}`);
    error.code = 'ANALYSIS_POLL_TIMEOUT';
    throw error;
  }

  return { normalizeRetryDocumentId, createDocumentAnalysisPayload, calculateAnalysisProgress, isTerminalAnalysisStatus, bindDocumentAnalysisControls, createSingleFlightAnalysisStarter, pollAnalysisUntilTerminal };
}));
