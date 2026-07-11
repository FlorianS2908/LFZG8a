const defaultToolProfiles = [
  tool('drawio', 'Draw.io', 'diagram', ['drawio', 'xml'], 'Draw.io Desktop oder Webversion verwenden.'),
  tool('dia', 'Dia', 'diagram', ['dia'], 'Dia nur manuell verwenden; keine EXE importieren.'),
  tool('papdesigner', 'PAPDesigner', 'diagram', ['pap'], 'PAPDesigner manuell verwenden; EXE wird nicht exportiert.'),
  tool('structorizer', 'Structorizer', 'diagram', ['nsd'], 'Structorizer manuell verwenden.'),
  tool('vscode', 'Visual Studio Code', 'ide', ['java', 'py', 'php', 'html', 'css', 'sql'], 'Projektordner manuell in VS Code oeffnen.'),
  tool('eclipse', 'Eclipse', 'ide', ['java', 'maven-project'], 'Java-Projekt manuell importieren.'),
  tool('intellij', 'IntelliJ IDEA', 'ide', ['java', 'maven-project'], 'Maven-Projekt manuell importieren.'),
  tool('jupyter', 'Jupyter', 'notebook', ['ipynb'], 'Notebook manuell in Jupyter oeffnen.'),
  tool('xampp', 'XAMPP', 'webserver', ['php', 'sql'], 'XAMPP manuell starten.'),
  tool('phpmyadmin', 'phpMyAdmin', 'database', ['sql'], 'SQL-Dateien manuell importieren.'),
  tool('mysql', 'MySQL', 'database', ['sql'], 'Keine automatische Datenbankaktion.'),
  tool('docker', 'Docker', 'container', ['compose'], 'Nur bei expliziter Auswahl verwenden.')
];

function tool(id, name, kind, supportedFormats, installHint) {
  return {
    id,
    name,
    kind,
    supportedFormats,
    launchMode: 'manual',
    configuredPath: '',
    required: false,
    installHint,
    security: {
      executeAutomatically: false,
      allowGeneratedFiles: true,
      allowUploadedExecutables: false
    }
  };
}

function getDefaultToolProfiles(courseType = 'theory') {
  const idsByType = {
    java: ['vscode', 'eclipse', 'intellij'],
    'java-maven': ['vscode', 'eclipse', 'intellij'],
    python: ['vscode'],
    jupyter: ['jupyter', 'vscode'],
    sql: ['phpmyadmin', 'mysql'],
    'php-xampp': ['xampp', 'phpmyadmin', 'vscode'],
    'uml-pap': ['drawio', 'dia', 'papdesigner', 'structorizer'],
    'html-css': ['vscode']
  };
  const ids = idsByType[courseType] || [];
  return defaultToolProfiles.filter((profile) => ids.includes(profile.id));
}

module.exports = {
  defaultToolProfiles,
  getDefaultToolProfiles
};
