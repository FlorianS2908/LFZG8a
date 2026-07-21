const presets = [
  preset('java-beginner', 'Java Einsteiger', 'java', { priorKnowledge: 'none', learningLevel: 'intro', difficultyMode: 'easy' }),
  preset('java-advanced', 'Java Fortgeschritten', 'java-maven', { priorKnowledge: 'intermediate', learningLevel: 'advanced', difficultyMode: 'hard' }),
  preset('sql-phpmyadmin-beginner', 'SQL / phpMyAdmin Einsteiger', 'sql', { priorKnowledge: 'none', learningLevel: 'intro', difficultyMode: 'easy' }),
  preset('python-beginner', 'Python Einsteiger', 'python', { priorKnowledge: 'none', learningLevel: 'intro', difficultyMode: 'easy' }),
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

module.exports = {
  presets
};
