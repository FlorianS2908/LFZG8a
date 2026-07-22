const SCHEMA_VERSION = 2;
const TECHNOLOGIES = ['theory', 'html-css', 'java', 'java-maven', 'python', 'jupyter', 'sql', 'php-xampp', 'uml-pap', 'mixed-project', 'custom'];
const COURSE_FORMATS = ['theory-exercises', 'practice', 'project', 'exam-preparation', 'workshop', 'blended-learning', 'custom'];
const DIDACTIC_PROFILES = ['balanced', 'strongly-guided', 'practice-oriented', 'project-oriented', 'exam-oriented', 'self-directed', 'custom'];
const AUDIENCES = ['training-retraining', 'professional-development', 'school', 'university', 'experienced', 'mixed', 'custom'];
const ENTRY_LEVELS = ['none', 'basic', 'advanced', 'mixed'];
const LEARNING_ORGANIZATIONS = ['balanced-mix', 'individual', 'pair', 'group', 'project-teams', 'self-study'];
const DIFFERENTIATION_PROFILES = ['none', 'basic-regular', 'basic-regular-transfer', 'full'];
const SUCCESS_CHECKS = ['prior-check', 'comprehension-questions', 'practice-tasks', 'self-check', 'day-review', 'quiz', 'competency-check', 'next-day-review', 'spaced-review', 'project-review', 'final-check'];

const DIDACTIC_SEQUENCES = Object.freeze({
  balanced: ['entry', 'explanation', 'practice', 'transfer', 'consolidation'],
  'strongly-guided': ['small-step-explanation', 'demonstration', 'guided-practice'],
  'practice-oriented': ['short-theory', 'demonstration', 'extensive-application'],
  'project-oriented': ['scenario', 'planning', 'implementation', 'review', 'presentation'],
  'exam-oriented': ['review', 'exam-tasks', 'evaluation'],
  'self-directed': ['learning-assignment', 'supports', 'self-check', 'reflection'],
  custom: []
});

function createDidacticCourseConfiguration(input = {}) {
  const legacyTechnology = TECHNOLOGIES.includes(input.courseType) ? input.courseType : 'theory';
  const technology = TECHNOLOGIES.includes(input.technology) ? input.technology : legacyTechnology;
  return {
    schemaVersion: SCHEMA_VERSION,
    technology,
    selectedTechnologies: unique(input.selectedTechnologies || (technology === 'mixed-project' ? [] : [technology])),
    customTechnology: clean(input.customTechnology),
    courseFormat: allowed(input.courseFormat, COURSE_FORMATS, 'theory-exercises'),
    customCourseFormat: clean(input.customCourseFormat),
    didacticProfile: allowed(input.didacticProfile, DIDACTIC_PROFILES, 'balanced'),
    customDidacticProfile: clean(input.customDidacticProfile),
    didacticSequence: [...(DIDACTIC_SEQUENCES[allowed(input.didacticProfile, DIDACTIC_PROFILES, 'balanced')] || [])],
    audience: allowed(input.audience, AUDIENCES, 'training-retraining'),
    customAudience: clean(input.customAudience),
    entryLevel: allowed(input.entryLevel, ENTRY_LEVELS, 'basic'),
    mixedLevelDifferentiation: input.entryLevel === 'mixed' ? input.mixedLevelDifferentiation !== false : false,
    learningOrganization: allowed(input.learningOrganization, LEARNING_ORGANIZATIONS, 'balanced-mix'),
    differentiationProfile: allowed(input.differentiationProfile, DIFFERENTIATION_PROFILES, 'basic-regular'),
    differentiationFeatures: differentiationFeatures(allowed(input.differentiationProfile, DIFFERENTIATION_PROFILES, 'basic-regular')),
    successChecks: unique(input.successChecks || ['comprehension-questions', 'practice-tasks', 'day-review']),
    materialOutputs: unique(input.materialOutputs || defaultMaterials(technology)),
    technicalEnvironment: unique(input.technicalEnvironment || defaultEnvironment(technology)),
    legacyValues: { ...(input.legacyValues || {}), ...(!TECHNOLOGIES.includes(input.courseType) && input.courseType ? { courseType: input.courseType } : {}) }
  };
}

function validateDidacticCourseConfiguration(input = {}) {
  const value = createDidacticCourseConfiguration(input); const errors = []; const warnings = [];
  if (value.technology === 'custom' && !value.customTechnology) errors.push(issue('CUSTOM_TECHNOLOGY_REQUIRED', 'Bitte eine Bezeichnung für das benutzerdefinierte Fachgebiet eingeben.'));
  if (value.technology === 'mixed-project' && value.selectedTechnologies.filter((item) => item !== 'mixed-project').length < 2) errors.push(issue('MIXED_TECHNOLOGIES_REQUIRED', 'Für einen gemischten Technologiekurs mindestens zwei Technologien auswählen.'));
  if (value.courseFormat === 'custom' && !value.customCourseFormat) errors.push(issue('CUSTOM_COURSE_FORMAT_REQUIRED', 'Bitte das individuelle Kursformat beschreiben.'));
  if (value.didacticProfile === 'custom' && !value.customDidacticProfile) errors.push(issue('CUSTOM_DIDACTIC_PROFILE_REQUIRED', 'Bitte das individuelle didaktische Profil beschreiben.'));
  if (value.audience === 'custom' && !value.customAudience) errors.push(issue('CUSTOM_AUDIENCE_REQUIRED', 'Bitte die benutzerdefinierte Zielgruppe angeben.'));
  if (value.didacticProfile === 'self-directed' && !value.successChecks.includes('self-check')) warnings.push(issue('SELF_CHECK_RECOMMENDED', 'Für selbstgesteuertes Lernen wird Selbstkontrolle empfohlen.'));
  if (value.differentiationProfile === 'full' && !value.materialOutputs.includes('tasks')) warnings.push(issue('TASKS_RECOMMENDED', 'Vollständige Differenzierung benötigt Aufgabenmaterial.'));
  if (value.courseFormat === 'exam-preparation' && !value.successChecks.some((item) => ['competency-check', 'quiz', 'final-check'].includes(item))) warnings.push(issue('EXAM_CHECK_RECOMMENDED', 'Für Prüfungsvorbereitung wird ein Kompetenz-, Quiz- oder Abschlusscheck empfohlen.'));
  if (value.technology === 'jupyter' && !value.technicalEnvironment.includes('notebook')) errors.push(issue('NOTEBOOK_REQUIRED', 'Python mit Jupyter benötigt eine Notebook-Umgebung.'));
  if (value.technology === 'theory' && value.technicalEnvironment.includes('maven-project')) warnings.push(issue('MAVEN_UNUSUAL', 'Ein Maven-Projekt ist für einen allgemeinen Theoriekurs ungewöhnlich.'));
  return { valid: !errors.length, value, errors, warnings };
}

function summarizeDidacticCourseConfiguration(input = {}) {
  const { value } = validateDidacticCourseConfiguration(input);
  const technology = value.customTechnology || label(value.technology);
  return `${technology} für ${value.customAudience || label(value.audience)} auf dem Niveau „${label(value.entryLevel)}“. ${label(value.courseFormat)} mit dem didaktischen Profil „${label(value.didacticProfile)}“, ${label(value.learningOrganization)} und ${label(value.differentiationProfile)}.`;
}

function differentiationFeatures(profile) { return profile === 'full' ? ['minimum-goal', 'regular-task', 'support', 'transfer-task', 'fast-finisher-task', 'alternative-explanation'] : profile === 'basic-regular-transfer' ? ['minimum-goal', 'regular-task', 'transfer-task'] : profile === 'basic-regular' ? ['minimum-goal', 'regular-task'] : []; }
function defaultMaterials(technology) { return technology === 'theory' ? ['web', 'handout', 'tasks', 'quiz'] : ['web', 'tasks', 'solutions', 'starter-files', 'solution-files']; }
function defaultEnvironment(technology) { return ({ jupyter: ['participant-workspace', 'notebook'], 'java-maven': ['participant-workspace', 'maven-project'], 'html-css': ['participant-workspace', 'html-css-project'], sql: ['participant-workspace', 'database-files'], 'php-xampp': ['participant-workspace', 'database-files', 'external-tools'] })[technology] || ['participant-workspace']; }
function allowed(value, values, fallback) { return values.includes(value) ? value : fallback; }
function unique(values) { return [...new Set((values || []).filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()))]; }
function clean(value) { return String(value || '').trim().slice(0, 160); }
function issue(code, message) { return { code, message }; }
function label(value) { return String(value || '').replace(/-/g, ' '); }

module.exports = { SCHEMA_VERSION, TECHNOLOGIES, COURSE_FORMATS, DIDACTIC_PROFILES, AUDIENCES, ENTRY_LEVELS, LEARNING_ORGANIZATIONS, DIFFERENTIATION_PROFILES, SUCCESS_CHECKS, DIDACTIC_SEQUENCES, createDidacticCourseConfiguration, validateDidacticCourseConfiguration, summarizeDidacticCourseConfiguration };
