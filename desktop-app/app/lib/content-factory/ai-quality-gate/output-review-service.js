function reviewOutput(output = {}, context = {}) {
  if (context.purpose === 'generateArtifactContent') return reviewArtifactContent(output, context);
  return reviewDayGenerationResult(output, context);
}

function reviewDayGenerationResult(result = {}, context = {}) {
  const errors = [];
  const warnings = [];
  const serializedParticipant = JSON.stringify([result.webvariant?.participantHtmlSections || [], result.tasks || []]);
  const serialized = JSON.stringify(result || {});
  const profile = context.containerProfile || {};
  const audience = context.targetAudience || {};
  if (/loesung|l.sung|solution/i.test(serializedParticipant)) errors.push('Teilnehmerbereich enthaelt Loesungshinweise.');
  if (!(result.solutions || []).length) warnings.push('Dozentenloesungen fehlen oder sind leer.');
  if (!(result.tasks || []).length) errors.push('Aufgaben fehlen.');
  if (JSON.stringify(result.tasks || []).match(/Aufgabe noch ergaenzen|TODO fachlich|Platzhalter/i)) warnings.push('Aufgaben enthalten Platzhalter.');
  if (!(result.quiz || []).length) warnings.push('Quizfragen fehlen.');
  if (!(result.sourceRefs || []).length) warnings.push('sourceRefs fehlen.');
  if (!ageConsidered(result, audience)) warnings.push('ageRange wurde im Output nicht sichtbar beruecksichtigt.');
  if (serialized.match(/Originaltext|Reference chunk|Buchseite|rawText|textPreview|OPENAI_API_KEY|apiKey|secret|token/i)) errors.push('Output enthaelt Rohtext-/Referenzchunk- oder Secret-Hinweise.');
  if ((result.artifacts || []).some((item) => /\.(exe|bat|cmd|ps1)$/i.test(item.path || item.title || ''))) errors.push('Output enthaelt ausfuehrbare Artefakte.');
  if (['none', 'basic'].includes(audience.priorKnowledge) && /pom\.xml|maven-project|java-maven/i.test(serialized)) warnings.push('Java Einsteiger/Maven-Konflikt im Output.');
  if (profile.courseType === 'sql' && /drop\s+database|auto.*run|automatisch.*ausfuehr/i.test(serialized)) errors.push('SQL Output wirkt wie automatische Ausfuehrung.');
  if (profile.courseType === 'uml-pap' && !/draw\.io|drawio|\.drawio|mxfile/i.test(serialized)) warnings.push('Draw.io Artefakt fehlt oder ist nicht plausibel sichtbar.');
  (result.artifacts || []).forEach((artifact) => {
    const targetPath = artifact.path || artifact.targetPath || '';
    if (/\.drawio$/i.test(targetPath) && artifact.content && !/^<mxfile[\s>]/.test(String(artifact.content).trim())) errors.push('Draw.io Artefakt ist nicht plausibel.');
    if (/\.ipynb$/i.test(targetPath) && artifact.content) {
      try { JSON.parse(artifact.content); } catch { errors.push('Jupyter Artefakt ist kein valides JSON.'); }
    }
  });
  const status = errors.length ? 'failed' : warnings.length ? 'warning' : 'passed';
  return {
    status,
    score: Math.max(0, 100 - errors.length * 25 - warnings.length * 8),
    errors,
    warnings,
    recommendations: [...errors, ...warnings]
  };
}

function reviewArtifactContent(artifact = {}, context = {}) {
  const errors = [];
  const warnings = [];
  const path = artifact.path || artifact.targetPath || '';
  const content = artifact.content || '';
  if (artifact.solutionOnly && /^teilnehmer\//i.test(path)) errors.push('solutionOnly Artefakt liegt im Teilnehmerbereich.');
  if (!artifact.solutionOnly && /^teilnehmer\//i.test(path) && /loesung|solution/i.test(content + path)) errors.push('Teilnehmerartefakt enthaelt Loesung.');
  if (/\.(exe|bat|cmd|ps1)$/i.test(path)) errors.push('Ausfuehrbares Artefakt blockiert.');
  if (['none', 'basic'].includes(context.targetAudience?.priorKnowledge) && /pom\.xml|maven-project/i.test(path + content)) warnings.push('Java Einsteiger mit Maven manuell pruefen.');
  if (/\.sql$/i.test(path) && /exec|auto.*run|drop\s+database|automatisch.*ausfuehr/i.test(content)) errors.push('SQL wirkt wie automatische Ausfuehrung.');
  if (/\.drawio$/i.test(path) && !/^<mxfile[\s>]/.test(String(content).trim())) errors.push('Draw.io XML ist nicht plausibel.');
  if (/\.ipynb$/i.test(path)) {
    try { JSON.parse(content); } catch { errors.push('Jupyter Notebook ist kein valides JSON.'); }
  }
  if (/Originaltext|Reference chunk|Buchseite|rawText|textPreview|OPENAI_API_KEY|apiKey|secret|token/i.test(content)) errors.push('Artefakt enthaelt Rohtext- oder Secret-Hinweise.');
  const status = errors.length ? 'failed' : warnings.length ? 'warning' : 'passed';
  return { status, score: Math.max(0, 100 - errors.length * 25 - warnings.length * 8), errors, warnings, recommendations: [...errors, ...warnings] };
}

function ageConsidered(result, audience = {}) {
  if (!audience.ageRange || ['mixed', 'unknown'].includes(String(audience.ageRange).toLowerCase())) return true;
  const text = JSON.stringify(result);
  if (audience.ageRange === '16-20') return /Schritt|Beispiel|kurz|einfach/i.test(text);
  if (audience.ageRange === '30+') return /beruf|Arbeitssituation|Praxis/i.test(text);
  return /Transfer|Begruendung|Beispiel/i.test(text);
}

module.exports = {
  reviewOutput,
  reviewDayGenerationResult,
  reviewArtifactContent
};
