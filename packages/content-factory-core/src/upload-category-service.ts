import type { UploadArea, UploadCategoryDefinition } from './types.ts';

export const uploadCategoryDefinitions: UploadCategoryDefinition[] = [
  {
    area: 'ai-materials',
    title: 'Materialien mittels KI generieren',
    description: 'Nutzen Sie diese Option, wenn keine fertigen Materialien vorhanden sind. Die ContentFactory erzeugt spaeter Basisentwuerfe aus Unterrichtsplan, Kursdaten und offenen Lernzielen.',
    examples: ['Webvarianten aus Unterrichtsplan', 'Basisaufgaben je Tag', 'Quizideen', 'Projektkontext als Entwurf'],
    accept: [],
    safetyNote: 'Es muss nichts anderes hochgeladen werden. Der Export bleibt ein Draft und sollte fachlich geprueft werden.'
  },
  {
    area: 'materials',
    title: 'Unterrichtsmaterialien',
    description: 'Materialien, mit denen Inhalte erklaert werden: Folien, PDFs, Word-Dateien, Markdown, HTML-Webvarianten oder Notebooks.',
    examples: ['Praesentationen', 'Handouts', 'Webvarianten', 'zentrale Wissensvermittlung', 'Notebooks mit Theorie'],
    accept: ['.pptx', '.pdf', '.docx', '.md', '.html', '.ipynb']
  },
  {
    area: 'tasks',
    title: 'Aufgaben',
    description: 'Aufgaben, die Teilnehmer bearbeiten sollen. Die ContentFactory ordnet sie passenden Tagen und Themen zu.',
    examples: ['Aufgabenblaetter', 'Notebook-Aufgaben', 'HTML-Aufgaben', 'Uebungsdateien'],
    accept: ['.html', '.md', '.pdf', '.docx', '.ipynb', '.json', 'sonstige']
  },
  {
    area: 'solutions',
    title: 'Loesungen',
    description: 'Loesungsvorschlaege oder Dozentenfassungen. Diese Dateien duerfen niemals im Teilnehmerbereich landen.',
    examples: ['Musterloesungen', 'Dozenten-Notebooks', 'Loesungs-PDFs', 'Loesungscode'],
    accept: ['.html', '.md', '.pdf', '.docx', '.ipynb', '.java', '.cs', '.sql', '.zip'],
    safetyNote: 'Loesungen werden spaeter automatisch vom Teilnehmerbereich getrennt.'
  },
  {
    area: 'quiz',
    title: 'Fragenpools / Quiz',
    description: 'Vorhandene Fragenpools fuer Tagesquiz oder eigene Quiz-Kacheln.',
    examples: ['JSON-Fragenpool', 'XML-Fragenpool', 'Word-Fragenkatalog', 'TXT-Fragensammlung'],
    accept: ['.json', '.xml', '.docx', '.txt']
  },
  {
    area: 'project',
    title: 'Projektmaterialien',
    description: 'Materialien fuer ein durchgehendes Projekt oder Szenario.',
    examples: ['Projektszenario', 'Ausgangssituation', 'Startercode', 'Bilder', 'Loesungsversion'],
    accept: ['.zip', '.html', '.css', '.js', '.java', '.cs', '.php', '.sql', '.png', '.jpg', '.pdf', '.docx']
  },
  {
    area: 'source-code',
    title: 'Quellcode',
    description: 'Technische Dateien als Beispiel, Startercode oder Loesungscode. Sie werden analysiert, aber niemals ausgefuehrt.',
    examples: ['HTML/CSS/JavaScript', 'Java', 'C#', 'PHP', 'Python', 'TypeScript'],
    accept: ['.html', '.css', '.js', '.ts', '.tsx', '.jsx', '.php', '.java', '.cs', '.py'],
    safetyNote: 'Quellcode wird analysiert, aber nicht ausgefuehrt.'
  },
  {
    area: 'database',
    title: 'Datenbank / SQL',
    description: 'SQL-Dateien und Datenbankmaterialien. DDL, DML, SELECT, Views, Trigger und Prozeduren werden erkannt.',
    examples: ['CREATE TABLE', 'INSERT-Testdaten', 'SELECT-Aufgaben', 'JOIN-Abfragen', 'Stored Procedures'],
    accept: ['.sql', '.csv optional'],
    safetyNote: 'SQL wird aus Sicherheitsgruenden nicht automatisch ausgefuehrt.'
  },
  {
    area: 'assets',
    title: 'Assets / Medien',
    description: 'Bilder, Icons und Begleitdateien fuer Aufgaben, Projekte oder Webvarianten.',
    examples: ['Screenshots', 'Bilder', 'Icons', 'SVGs', 'Projektgrafiken'],
    accept: ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif']
  },
  {
    area: 'other',
    title: 'Sonstige Dateien',
    description: 'Dateien, die nicht eindeutig erkannt werden. Sie koennen spaeter manuell zugeordnet, ignoriert oder als Begleitmaterial uebernommen werden.',
    examples: ['unbekannte Dateitypen', 'alte Exportdateien', 'zusaetzliche Materialien'],
    accept: ['sonstige']
  },
  {
    area: 'zip-package',
    title: 'Komplettes Materialpaket als ZIP hochladen',
    description: 'Nutzen Sie diesen Bereich, wenn alle Kursdateien bereits in einem Ordner gesammelt wurden. Das ZIP wird sicher sortiert und anschliessend geprueft.',
    examples: ['gesammelter Kursordner', 'Export aus Altsystem', 'Materialpaket pro Lernfeld'],
    accept: ['.zip'],
    safetyNote: '.git und node_modules werden ignoriert, ausfuehrbare Dateien blockiert, .env-Dateien nicht exportiert, Code und SQL nie ausgefuehrt.'
  }
];

export function getUploadCategory(area: UploadArea): UploadCategoryDefinition | undefined {
  return uploadCategoryDefinitions.find((category) => category.area === area);
}
