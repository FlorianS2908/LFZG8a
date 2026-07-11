const courseTypes = ['theory', 'html-css', 'java', 'java-maven', 'python', 'jupyter', 'sql', 'php-xampp', 'uml-pap', 'database-project', 'mixed-project'];

function createDefaultContainerProfile(input = {}) {
  const courseType = courseTypes.includes(input.courseType) ? input.courseType : 'theory';
  return {
    courseType,
    artifactMode: input.artifactMode || defaultArtifactMode(courseType),
    studentWorkspace: input.studentWorkspace !== false,
    teacherSolutions: input.teacherSolutions !== false,
    generateStarterFiles: input.generateStarterFiles !== false,
    generateSolutionFiles: input.generateSolutionFiles !== false,
    generateReadme: input.generateReadme !== false,
    generateSetupGuide: input.generateSetupGuide !== false,
    generateRunScripts: input.generateRunScripts === true,
    allowExecutableTools: input.allowExecutableTools === true,
    allowDatabaseActions: input.allowDatabaseActions === true
  };
}

function defaultArtifactMode(courseType) {
  return courseType === 'theory' ? 'web-only' : 'web-and-files';
}

module.exports = {
  courseTypes,
  createDefaultContainerProfile
};
