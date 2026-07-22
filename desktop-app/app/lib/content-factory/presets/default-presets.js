const presets = [
  preset('java-beginner', 'Java Einsteiger', 'java', { priorKnowledge: 'none', learningLevel: 'intro', difficultyMode: 'all' }),
  preset('java-advanced', 'Java Fortgeschritten', 'java-maven', { priorKnowledge: 'intermediate', learningLevel: 'advanced', difficultyMode: 'medium_hard' }),
  preset('sql-phpmyadmin-beginner', 'SQL / phpMyAdmin Einsteiger', 'sql', { priorKnowledge: 'none', learningLevel: 'intro', difficultyMode: 'all' }),
  preset('python-beginner', 'Python Einsteiger', 'python', { priorKnowledge: 'none', learningLevel: 'intro', difficultyMode: 'all' }),
  preset('python-jupyter', 'Python / Jupyter', 'jupyter', { priorKnowledge: 'basic', learningLevel: 'basic', needsStepByStep: true }),
  preset('uml-pap-erm', 'UML / PAP / ERM', 'uml-pap', { priorKnowledge: 'basic', learningLevel: 'basic' }),
  preset('html-css-project', 'HTML/CSS Projekt', 'html-css', { priorKnowledge: 'basic', learningLevel: 'basic', projectOrientation: true }),
  preset('mixed-project', 'Gemischter Projektkurs', 'mixed-project', { priorKnowledge: 'basic', learningLevel: 'professional', projectOrientation: true })
];

function preset(id, label, courseType, audiencePatch) {
  return {
    id,
    label,
    containerProfile: {
      courseType,
      didacticCourse: presetDidactics(id, courseType, audiencePatch),
      artifactMode: 'web-and-files',
      studentWorkspace: true,
      teacherSolutions: true,
      generateStarterFiles: true,
      generateSolutionFiles: true,
      generateReadme: true,
      generateSetupGuide: true,
      generateRunScripts: false,
      allowExecutableTools: false,
      allowDatabaseActions: false
    },
    targetAudience: {
      educationContext: 'umschulung',
      ...audiencePatch
    }
  };
}

function presetDidactics(id, technology, audience = {}) {
  const project = /project/.test(id);
  const exam = /exam/.test(id);
  return {
    schemaVersion: 2,
    technology,
    selectedTechnologies: technology === 'mixed-project' ? ['html-css', 'sql'] : [technology],
    courseFormat: exam ? 'exam-preparation' : project ? 'project' : 'practice',
    didacticProfile: exam ? 'exam-oriented' : project ? 'project-oriented' : audience.needsStepByStep ? 'strongly-guided' : 'balanced',
    audience: 'training-retraining',
    entryLevel: ['none', 'intro'].includes(audience.priorKnowledge) ? 'none' : audience.learningLevel === 'advanced' ? 'advanced' : 'basic',
    learningOrganization: project ? 'project-teams' : 'balanced-mix',
    differentiationProfile: 'basic-regular-transfer',
    successChecks: exam ? ['quiz', 'competency-check', 'final-check'] : ['comprehension-questions', 'practice-tasks', 'day-review']
  };
}

module.exports = {
  presets
};
