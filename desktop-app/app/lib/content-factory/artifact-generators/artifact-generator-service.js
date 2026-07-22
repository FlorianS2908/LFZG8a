const { packageNameFromCourseId, javaClassName } = require('../container-profile/project-template-service');

const artifactGenerators = new Map();

function registerArtifactGenerator(format, generator) {
  if (!format || typeof generator !== 'function') throw new Error('Artefakt-Generator benötigt Format und Funktion.');
  artifactGenerators.set(String(format).toLowerCase(), generator);
}

function generateArtifactFiles(input = {}) {
  const course = input.course || {};
  const targets = input.artifactTargets || [];
  return targets.flatMap((target) => generateTarget({ ...input, course, target })).filter(Boolean);
}

function generateTarget({ course, target }) {
  const registered = artifactGenerators.get(String(target.format || '').toLowerCase());
  if (registered) return registered({ course, target, file });
  if (target.format === 'maven-project') return mavenFiles(course, target);
  if (target.format === 'java') return [file(target, javaContent(target), target.solutionOnly)];
  if (target.format === 'py') return [file(target, pythonContent(target), target.solutionOnly)];
  if (target.format === 'ipynb') return [file(target, notebookContent(target), target.solutionOnly)];
  if (target.format === 'sql') return [file(target, sqlContent(target), target.solutionOnly)];
  if (target.format === 'php') return [file(target, phpContent(target), target.solutionOnly)];
  if (target.format === 'drawio') return [file(target, drawioContent(target), target.solutionOnly)];
  if (target.format === 'css') return [file(target, '/* Arbeitsdatei: eigene Styles hier ergaenzen. */\nbody { font-family: Arial, sans-serif; }\n', false)];
  if (target.format === 'html') return [file(target, '<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Starter</title><link rel="stylesheet" href="arbeitsdatei.css"></head><body><main><h1>Starter</h1><p>Bearbeiten Sie die Aufgabe anhand der Vorgaben.</p></main></body></html>\n', target.solutionOnly)];
  if (target.format === 'md') return [file(target, readmeContent(target), target.solutionOnly)];
  return [file(target, readmeContent(target), target.solutionOnly)];
}

function file(target, content, solutionOnly = false) {
  return {
    path: target.targetPath,
    content,
    role: target.role,
    kind: target.kind,
    solutionOnly,
    metadata: {
      title: target.title || target.kind,
      reason: target.reason || '',
      targetAudienceImpact: target.targetAudienceImpact || ''
    }
  };
}

function javaContent(target) {
  const className = javaClassName(target.title || 'Aufgabe');
  if (target.solutionOnly) {
    return `public class ${className}Loesung {\n  public static void main(String[] args) {\n    System.out.println("Erwartungshorizont im Dozentenbereich pruefen.");\n  }\n}\n`;
  }
  return `public class ${className} {\n  public static void main(String[] args) {\n    // TODO: Bearbeiten Sie die Aufgabe und dokumentieren Sie Ihr Vorgehen.\n    System.out.println("Starter");\n  }\n}\n`;
}

function mavenFiles(course, target) {
  const packageName = packageNameFromCourseId(course.courseId);
  const base = target.targetPath.replace(/README\.md$/i, '');
  const className = target.solutionOnly ? 'AppLoesung' : 'App';
  const files = [
    file({ ...target, targetPath: `${base}pom.xml` }, pomXml(packageName), target.solutionOnly),
    file({ ...target, targetPath: `${base}README.md` }, readmeContent(target), target.solutionOnly),
    file({ ...target, targetPath: `${base}src/main/java/${packageName.replace(/\./g, '/')}/${className}.java` }, `package ${packageName};\n\npublic class ${className} {\n  public static void main(String[] args) {\n    System.out.println("${target.solutionOnly ? 'Dozentenloesung' : 'Starter'}");\n  }\n}\n`, target.solutionOnly),
    file({ ...target, targetPath: `${base}src/test/java/${packageName.replace(/\./g, '/')}/${className}Test.java` }, `package ${packageName};\n\nclass ${className}Test {\n  // Optionaler Testplatzhalter fuer manuelle Erweiterung.\n}\n`, target.solutionOnly)
  ];
  return files;
}

function pomXml(packageName) {
  return `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>${packageName}</groupId>\n  <artifactId>kursaufgabe</artifactId>\n  <version>1.0.0</version>\n  <properties><maven.compiler.source>17</maven.compiler.source><maven.compiler.target>17</maven.compiler.target></properties>\n</project>\n`;
}

function pythonContent(target) {
  return target.solutionOnly
    ? '# Dozentenbereich: Erwartungshorizont und Beispielcode pruefen.\nprint("Dozentenloesung")\n'
    : '# TODO: Bearbeiten Sie die Aufgabe Schritt fuer Schritt.\nprint("Starter")\n';
}

function notebookContent(target) {
  return JSON.stringify({
    cells: [
      { cell_type: 'markdown', metadata: {}, source: [`# ${target.title || 'Notebook'}\n`, target.solutionOnly ? 'Dozentenfassung.\n' : 'Bearbeiten Sie die Aufgabe Schritt fuer Schritt.\n'] },
      { cell_type: 'markdown', metadata: {}, source: ['## Aufgabe\n', target.solutionOnly ? 'Erwartungshorizont und Beispielcode.\n' : 'Beschreiben Sie Ihr Vorgehen.\n'] },
      { cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: [target.solutionOnly ? 'print("Beispiel")\n' : '# TODO\n'] },
      { cell_type: 'markdown', metadata: {}, source: ['## Reflexion\n', 'Notieren Sie Erkenntnisse und offene Fragen.\n'] }
    ],
    metadata: { language_info: { name: 'python' } },
    nbformat: 4,
    nbformat_minor: 5
  }, null, 2);
}

function sqlContent(target) {
  if (target.solutionOnly) return '-- Dozentenbereich: Loesungsskript manuell pruefen.\nSELECT 1 AS erwartungshorizont;\n';
  return [
    '-- SQL wird nicht automatisch ausgefuehrt.',
    'CREATE DATABASE IF NOT EXISTS kurs_demo;',
    'CREATE TABLE IF NOT EXISTS beispiel (id INT PRIMARY KEY, name VARCHAR(100));',
    "INSERT INTO beispiel (id, name) VALUES (1, 'Demo');",
    '-- Aufgabe: Formulieren Sie passende SELECT-Abfragen.'
  ].join('\n') + '\n';
}

function phpContent(target) {
  return target.solutionOnly
    ? "<?php\n// Dozentenbereich: Beispielausgabe.\necho 'Dozentenloesung';\n"
    : "<?php\n// Starter fuer XAMPP. XAMPP wird nicht automatisch gestartet.\necho 'Starter';\n";
}

function drawioContent(target) {
  const label = escapeXml(target.solutionOnly ? 'Loesungsskizze' : 'Aufgabenskizze');
  return `<mxfile><diagram name="Diagramm"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="${label}" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="120" y="80" width="160" height="60" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>\n`;
}

function readmeContent(target) {
  return `# ${target.title || 'Artefakt'}\n\nDieses Artefakt wurde lokal erzeugt. Externe Tools, Code und SQL werden nicht automatisch ausgefuehrt.\n\nGrund: ${target.reason || 'Sicherer Kurscontainer-Export.'}\n`;
}

function escapeXml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

module.exports = {
  generateArtifactFiles,
  registerArtifactGenerator,
  listArtifactGenerators: () => [...artifactGenerators.keys()]
};
