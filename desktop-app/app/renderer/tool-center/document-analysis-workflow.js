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
    const selectedDocuments = (Array.isArray(documents) ? documents : [])
      .filter((document) => document && !document.excluded && (!retryId || document.id === retryId));
    const projectSnapshot = cloneSerializable(project || {});
    const structureFrameSnapshot = cloneSerializable(projectSnapshot.structureFrame || {});
    return {
      project: projectSnapshot,
      projectId: projectSnapshot.id || '',
      documents: cloneSerializable(selectedDocuments),
      retryDocumentId: retryId,
      structureFrameSnapshot,
      requestedAt: new Date().toISOString()
    };
  }

  function cloneSerializable(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function calculateAnalysisProgress(progress = {}) {
    progress ||= {};
    const total = Math.max(0, Number(progress.total || 0));
    const processed = Math.min(total, Math.max(0, Number(progress.completed || 0) + Number(progress.warningCount || 0) + Number(progress.failed || 0)));
    const segmentTotal = Math.max(0, Number(progress.segmentTotal || 0));
    const segmentCompleted = Math.min(segmentTotal, Math.max(0, Number(progress.segmentCompleted || 0)));
    const activeShare = total && segmentTotal ? (segmentCompleted / segmentTotal) / total : 0;
    return { total, processed, segmentTotal, segmentCompleted, percentage: Math.min(100, Math.round(((total ? processed / total : 0) + activeShare) * 100)) };
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

  function createDurationAudienceContinuation({ saveScope, startAnalysis, onSaved = () => {}, onError = () => {}, setBusy = () => {} }) {
    let running = false;
    return async () => {
      if (running) return false;
      running = true;
      setBusy(true);
      try {
        const saved = await saveScope();
        if (!saved) return false;
        await onSaved();
        await startAnalysis();
        return true;
      } catch (error) {
        await onError(error);
        return false;
      } finally {
        running = false;
        setBusy(false);
      }
    };
  }

  async function pollAnalysisUntilTerminal({ operationId, getProgress, onProgress = () => {}, intervalMs = 350, timeoutMs = 900000, maxConsecutiveErrors = 3, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
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

  return { normalizeRetryDocumentId, createDocumentAnalysisPayload, calculateAnalysisProgress, isTerminalAnalysisStatus, bindDocumentAnalysisControls, createSingleFlightAnalysisStarter, createDurationAudienceContinuation, pollAnalysisUntilTerminal };
}));
