const https = require('https');

class OpenAIProvider {
  constructor(options = {}) {
    this.name = 'openai';
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = options.model || process.env.OPENAI_MODEL || '';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.model);
  }

  async generateDayDraft(input = {}) {
    const prompt = {
      schema: 'DayGenerationResult',
      rules: [
        'Antworte ausschliesslich als JSON.',
        'Keine Markdown-Ausgabe.',
        'Keine langen Zitate oder Originaltexte uebernehmen.',
        'Teilnehmerbereich darf keine Loesungen enthalten.',
        'Loesungen nur in solutions fuer Dozenten.',
        'sourceRefs uebernehmen und aiGenerated true setzen.'
      ],
      input: sanitizeInput(input)
    };
    return this.requestJson(prompt);
  }

  async generateCurriculumPlan(input = {}) {
    const prompt = {
      schema: 'CurriculumPlanDraftPartial',
      rules: [
        'Antworte ausschliesslich als JSON.',
        'Keine Originalpassagen uebernehmen.',
        'Nur Themen, Tagesverteilung, Warnungen und sourceRefs liefern.'
      ],
      input: sanitizeInput(input)
    };
    return this.requestJson(prompt);
  }

  async reviseDayDraft(input = {}) {
    const prompt = {
      schema: 'DayGenerationResult',
      rules: [
        'Antworte ausschliesslich als JSON.',
        'Ueberarbeite den vorhandenen Tagesentwurf anhand correctionPrompt.',
        'Teilnehmerbereich ohne Loesungen.'
      ],
      input: sanitizeInput(input)
    };
    return this.requestJson(prompt);
  }

  requestJson(payload) {
    if (!this.isConfigured()) {
      return Promise.reject(new Error('OpenAI ist nicht konfiguriert.'));
    }
    const body = JSON.stringify({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Du erzeugst ausschliesslich JSON nach dem angeforderten Schema.' },
        { role: 'user', content: JSON.stringify(payload) }
      ]
    });
    return new Promise((resolve, reject) => {
      const request = https.request({
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        timeout: 30000,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`OpenAI API Fehler ${response.statusCode}`));
            return;
          }
          try {
            const parsed = JSON.parse(data);
            resolve(JSON.parse(parsed.choices?.[0]?.message?.content || '{}'));
          } catch (error) {
            reject(new Error(`OpenAI JSON konnte nicht gelesen werden: ${error.message}`));
          }
        });
      });
      request.on('timeout', () => {
        request.destroy(new Error('OpenAI Timeout.'));
      });
      request.on('error', reject);
      request.write(body);
      request.end();
    });
  }
}

function sanitizeInput(input) {
  return JSON.parse(JSON.stringify(input || {}, (key, value) => {
    if (/apiKey|OPENAI|secret|token/i.test(key)) return undefined;
    if (typeof value === 'string' && value.length > 1000) return `${value.slice(0, 1000)}...`;
    return value;
  }));
}

module.exports = {
  OpenAIProvider
};
