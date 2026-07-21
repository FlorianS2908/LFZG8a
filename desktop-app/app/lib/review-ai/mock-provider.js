class DeterministicReviewProvider {
  constructor(resultFactory) { this.id = 'deterministic-review-mock'; this.resultFactory = resultFactory; }
  async review(request, { signal } = {}) {
    if (signal?.aborted) throw new Error('Review abgebrochen.');
    if (this.resultFactory) return this.resultFactory(request);
    const definition = request.definition;
    return {
      schemaVersion: '1.0', reviewId: `review-${Date.now()}`, definitionId: definition.id, definitionVersion: definition.version,
      decision: 'passed', score: 100, summary: 'Alle konfigurierten Kriterien wurden im deterministischen Testlauf erfüllt.',
      criteria: definition.criteria.map((criterion) => ({ criterionId: criterion.id, status: 'passed', score: 100, explanation: 'Im bereitgestellten Kontext erfüllt.' })),
      findings: [], proposedChanges: []
    };
  }
}
module.exports = { DeterministicReviewProvider };
