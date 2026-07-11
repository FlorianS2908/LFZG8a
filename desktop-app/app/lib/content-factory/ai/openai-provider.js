class OpenAIProvider {
  constructor(options = {}) {
    this.name = 'openai';
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = options.model || process.env.OPENAI_MODEL || '';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.model);
  }

  async generateDayDraft() {
    throw new Error('OpenAIProvider ist vorbereitet, aber im MVP ohne Server-Request deaktiviert.');
  }

  async generateCurriculumPlan() {
    throw new Error('OpenAIProvider ist vorbereitet, aber im MVP ohne Server-Request deaktiviert.');
  }
}

module.exports = {
  OpenAIProvider
};
