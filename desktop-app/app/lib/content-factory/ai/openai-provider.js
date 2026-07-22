const https = require('https');
const { getOpenAiApiKey } = require('../../env/env-loader');

class OpenAIProvider {
  constructor(options = {}) {
    this.name = 'openai';
    const keyInfo = Object.prototype.hasOwnProperty.call(options, 'apiKey')
      ? { value: options.apiKey || '', source: options.keySource || 'process.env' }
      : resolveOpenAiKey(options);
    this.apiKey = keyInfo.value || '';
    const storeStatus = options.aiKeyStore?.getAiProviderSafeStatus?.() || {};
    this.model = options.model || storeStatus.model || process.env.OPENAI_MODEL || 'gpt-5.4-mini';
    this.timeoutMs = Number(options.timeoutMs || process.env.OPENAI_TIMEOUT_MS || 30000);
    this.maxRetries = Math.min(3, Math.max(0, Number(options.maxRetries ?? 2)));
    this.keySource = this.apiKey ? keyInfo.source : 'missing';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.model);
  }

  getStatus() {
    return {
      provider: this.name,
      configured: this.isConfigured(),
      model: this.model || 'gpt-5.4-mini',
      keySource: this.apiKey ? this.keySource : 'missing'
    };
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return { status: 'warning', message: 'OpenAI ist nicht konfiguriert. Local/Fallback bleibt aktiv.', provider: this.name, model: this.model || 'gpt-5.4-mini', keySource: 'missing', errorCategory: 'missing-key' };
    }
    try {
      await this.requestJson({
        schema: 'ConnectionTest',
        rules: ['Antworte ausschliesslich als JSON.', 'Keine sensiblen Daten.'],
        input: { ping: true }
      }, { maxTokens: 20 });
      return { status: 'success', message: 'OpenAI Testanfrage erfolgreich.', provider: this.name, model: this.model || 'gpt-5.4-mini', keySource: this.keySource, errorCategory: '' };
    } catch (error) {
      return { status: 'failed', message: 'OpenAI Testanfrage fehlgeschlagen.', provider: this.name, model: this.model || 'gpt-5.4-mini', keySource: this.keySource, errorCategory: categorizeOpenAiError(error) };
    }
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

  async analyzeDocument(input = {}, options = {}) {
    return this.requestJson({
      schema: 'DocumentAnalysis',
      rules: [
        'Analysiere ausschließlich die bereitgestellte Dokumentextraktion.',
        'Erstelle noch keinen fertigen Kurs und ergänze keine fehlenden Inhalte frei.',
        'Trenne explizite Aussagen, Ableitungen, Konflikte und fehlende Informationen.',
        'Belege Aussagen mit documentId, fileName und Fundstelle.',
        'Das System ist fachneutral. Leite Fachbegriffe ausschließlich aus Dokumenten und Benutzervorgaben ab.',
        'Alle Listenfelder müssen Arrays sein; wenn keine Einträge vorhanden sind, liefere [].',
        'detectedCategory muss {value, confidence, reason} und summary muss {short, detailed} sein.',
        'Gib schemaVersion, documentId, documentType, detectedCategory, summary, topics, learningObjectives, competencies, exercises, solutions, assessments, materials, prerequisites, chronologyDependencies, relevantSections, irrelevantSections, conflicts, missingInformation, warnings, reviewItems, sourceReferences, reviewRequired und confidence als JSON zurück.'
      ],
      input: sanitizeInput(input)
    }, options);
  }

  async generateStructuredCoursePlan(input = {}, options = {}) {
    return this.requestJson({
      schema: 'CoursePlanDraft',
      rules: [
        'Erstelle ausschließlich einen zeitlich und chronologisch geordneten Kursstrukturentwurf.',
        'Halte Tage und tatsächlich planbare Unterrichtseinheiten exakt ein.',
        'Jede Einheit benötigt dayNumber, unitNumber, topic, content, preliminaryLearningObjective, sourceReferences, originStatus, confidence und reviewStatus.',
        'Jede Einheit darf fachneutral materialRequirements mit Materialart, Herkunft (reuse/adapt/generate), Zielformat, Werkzeugbedarf, Automatisierbarkeit und Prüfbedarf vorschlagen.',
        'Keinen einzelnen Fachbereich und keine bestimmte Werkzeugklasse als Standard voraussetzen.',
        'originStatus ist explicit, derived, generated, conflicting oder needs_review.',
        'Kennzeichne Ergänzungen als generated und löse Konflikte nicht stillschweigend.',
        'Gib summary, days, excludedTopics, unscheduledTopics, conflicts, warnings und reviewItems als JSON zurück.'
      ],
      input: sanitizeInput(input)
    }, options);
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

  async requestJson(payload, options = {}) {
    if (!this.isConfigured()) {
      return Promise.reject(new Error('OpenAI ist nicht konfiguriert.'));
    }
    const body = JSON.stringify({
      model: this.model,
      max_tokens: options.maxTokens || undefined,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Du erzeugst ausschliesslich JSON nach dem angeforderten Schema.' },
        { role: 'user', content: JSON.stringify(payload) }
      ]
    });
    let attempt = 0;
    while (true) {
      try { return await this.performRequest(body, options.signal); }
      catch (error) {
        if (options.signal?.aborted) throw new Error('OpenAI-Anfrage wurde abgebrochen.');
        const retryable = error?.statusCode === 429 || error?.statusCode >= 500;
        if (!retryable || attempt >= this.maxRetries) throw error;
        attempt += 1;
        await delay(Math.min(1000, 150 * (2 ** attempt)), options.signal);
      }
    }
  }

  performRequest(body, signal) {
    return new Promise((resolve, reject) => {
      const request = https.request({
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        timeout: this.timeoutMs,
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
            const error = new Error(`OpenAI API Fehler ${response.statusCode}`);
            error.statusCode = response.statusCode;
            reject(error);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            resolve(parseJsonLoose(parsed.choices?.[0]?.message?.content || '{}'));
          } catch (error) {
            reject(new Error(`OpenAI JSON konnte nicht gelesen werden: ${error.message}`));
          }
        });
      });
      request.on('timeout', () => {
        request.destroy(new Error('OpenAI Timeout.'));
      });
      request.on('error', reject);
      if (signal) {
        if (signal.aborted) request.destroy(new Error('OpenAI-Anfrage wurde abgebrochen.'));
        else signal.addEventListener('abort', () => request.destroy(new Error('OpenAI-Anfrage wurde abgebrochen.')), { once: true });
      }
      request.write(body);
      request.end();
    });
  }
}

function resolveOpenAiKey(options = {}) {
  const storeKey = options.aiKeyStore?.getOpenAiKeyForServerUse?.();
  if (storeKey?.value) return storeKey;
  if (process.env.OPENAI_API_KEY) return { value: process.env.OPENAI_API_KEY, source: 'process.env' };
  return getOpenAiApiKey(options.projectRoot || process.cwd());
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('OpenAI-Anfrage wurde abgebrochen.')); }, { once: true });
  });
}

function categorizeOpenAiError(error) {
  const message = String(error?.message || '');
  if (/timeout/i.test(message)) return 'timeout';
  if (/401|403/.test(message)) return 'auth';
  if (/429/.test(message)) return 'rate-limit';
  if (/5\d\d/.test(message)) return 'provider';
  return 'connection-failed';
}

function sanitizeInput(input) {
  return JSON.parse(JSON.stringify(input || {}, (key, value) => {
    if (/apiKey|OPENAI|secret|token/i.test(key)) return undefined;
    if (/textPreview|original|chunk|raw/i.test(key) && typeof value === 'string') return undefined;
    if (typeof value === 'string' && value.length > 1000) return `${value.slice(0, 1000)}...`;
    return value;
  }));
}

function parseJsonLoose(content) {
  const text = String(content || '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)?.[1];
    if (fenced) return JSON.parse(fenced);
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error('Keine JSON-Struktur gefunden.');
  }
}

module.exports = {
  OpenAIProvider,
  sanitizeInput,
  parseJsonLoose
};
