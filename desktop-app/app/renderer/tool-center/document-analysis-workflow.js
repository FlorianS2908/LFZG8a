(function exposeDocumentAnalysisWorkflow(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.CourseForgeDocumentAnalysisWorkflow = api; root.ContentFactoryDocumentAnalysisWorkflow = api; }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createWorkflowHelpers() {
  const TERMINAL_STATUSES = new Set(['completed', 'completed_with_warnings', 'failed', 'timed_out', 'cancelled', 'not_found']);
  const RENDERER_STALE_THRESHOLD_MS = 45000;
  const RENDERER_HARD_TIMEOUT_MS = 360000;

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
    if (Number.isFinite(Number(progress.overallProgress))) {
      const fraction = Math.max(0, Math.min(isTerminalAnalysisStatus(progress.status) && ['completed', 'completed_with_warnings'].includes(progress.status) ? 1 : 0.999, Number(progress.overallProgress)));
      const percentage = Math.round(fraction * 100);
      return { total: Number(progress.totalItems || progress.total || 0), processed: Number(progress.currentItem || progress.completed || 0), segmentTotal: Number(progress.totalSegments || progress.segmentTotal || 0), segmentCompleted: Number(progress.segmentCompleted || 0), percentage: isTerminalAnalysisStatus(progress.status) ? percentage : Math.min(99, percentage) };
    }
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

  async function pollAnalysisUntilTerminal({ operationId, getProgress, onProgress = () => {}, intervalMs = 500, timeoutMs = RENDERER_HARD_TIMEOUT_MS, inactivityTimeoutMs = RENDERER_STALE_THRESHOLD_MS, maxConsecutiveErrors = 3, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), now = () => Date.now() }) {
    const startedAt = now();
    let consecutiveErrors = 0;
    let lastActivityAt = now(); let lastSignature = ''; let currentInterval = intervalMs;
    while (!timeoutMs || now() - startedAt < timeoutMs) {
      await sleep(currentInterval);
      try {
        const progress = await getProgress(operationId);
        consecutiveErrors = 0;
        const signature = JSON.stringify([progress?.status, progress?.phase, progress?.overallProgress, progress?.lastActivityAt]);
        const backendActivity = Date.parse(progress?.lastActivityAt || progress?.updatedAt || '') || 0;
        if (signature !== lastSignature || backendActivity > lastActivityAt) { lastSignature = signature; lastActivityAt = Math.max(now(), backendActivity); currentInterval = intervalMs; } else currentInterval = Math.min(2000, currentInterval + 250);
        onProgress(progress);
        if (isTerminalAnalysisStatus(progress?.status)) return progress;
        if (inactivityTimeoutMs && now() - lastActivityAt >= inactivityTimeoutMs) onProgress({ ...progress, message: 'Der Vorgangsstatus wird erneut geprüft. Die Verarbeitung kann weiterhin aktiv sein.', stale: true });
      } catch (error) {
        consecutiveErrors += 1;
        if (consecutiveErrors >= maxConsecutiveErrors) throw error;
      }
    }
    try { const finalStatus = await getProgress(operationId); onProgress(finalStatus); if (isTerminalAnalysisStatus(finalStatus?.status)) return finalStatus; } catch {}
    const error = new Error(`Die Verarbeitung hat das äußerste Zeitlimit überschritten. Der Backendstatus wurde erneut geprüft. Vorgangs-ID: ${operationId}`);
    error.code = 'ANALYSIS_POLL_TIMEOUT';
    throw error;
  }

  return { RENDERER_STALE_THRESHOLD_MS, RENDERER_HARD_TIMEOUT_MS, normalizeRetryDocumentId, createDocumentAnalysisPayload, calculateAnalysisProgress, isTerminalAnalysisStatus, bindDocumentAnalysisControls, createSingleFlightAnalysisStarter, createDurationAudienceContinuation, pollAnalysisUntilTerminal };
}));
