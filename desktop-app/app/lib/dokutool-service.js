const fs = require('fs');
const path = require('path');
const { ensureDir, readJson, writeJson } = require('./json-store');

const quizSourceRepo = 'FlorianSchaffer2908/IHK_APP';

const fachrichtungen = {
  fiae: {
    label: 'FIAE',
    title: 'Fachinformatiker/-in Anwendungsentwicklung',
    info: 'Softwareentwicklung, Datenbanken, Web und Projektarbeit.'
  },
  fisi: {
    label: 'FISI',
    title: 'Fachinformatiker/-in Systemintegration',
    info: 'Infrastruktur, Netzwerke, Betrieb und IT-Services.'
  },
  kits: {
    label: 'KITS',
    title: 'Kaufleute fuer IT-System-Management',
    info: 'IT-Produkte, Kundenberatung und kaufmaennische Prozesse.'
  },
  kabue: {
    label: 'KABUE',
    title: 'Kaufleute fuer Bueromanagement',
    info: 'Organisation, Kommunikation und Office-Prozesse.'
  }
};

const roleTemplates = [
  { id: 'learner', label: 'Lernende', description: 'Fragen laden und Training dokumentieren.' },
  { id: 'teacher', label: 'Dozent', description: 'Fragenpools steuern und Ergebnisse einordnen.' },
  { id: 'desktop', label: 'Desktop lokal', description: 'Kein Login, lokale Datenhaltung in Electron.' }
];

const questionSchema = {
  firestorePath: 'fragenpools/{poolId}/questions',
  fields: [
    { key: 'question', label: 'Frage' },
    { key: 'answers', label: 'Antwortoptionen' },
    { key: 'correctAnswer', label: 'Richtige Antwort' },
    { key: 'topic', label: 'Topic' }
  ]
};

const sampleQuestions = {
  software: [
    {
      id: 'software-1',
      topic: 'grundlagen',
      question: 'Welche Aufgabe hat ein Versionsverwaltungssystem?',
      answers: ['Code formatieren', 'Aenderungen nachvollziehbar speichern', 'CSS kompilieren', 'Server neu starten'],
      correctAnswer: 'Aenderungen nachvollziehbar speichern'
    },
    {
      id: 'software-2',
      topic: 'prozesse',
      question: 'Was beschreibt ein Akzeptanzkriterium?',
      answers: ['Eine konkrete Erfuellungsbedingung', 'Eine Programmiersprache', 'Eine Datenbanktabelle', 'Eine IP-Adresse'],
      correctAnswer: 'Eine konkrete Erfuellungsbedingung'
    }
  ],
  sql: [
    {
      id: 'sql-1',
      topic: 'select',
      question: 'Welche SQL-Anweisung liest Daten aus einer Tabelle?',
      answers: ['INSERT', 'SELECT', 'UPDATE', 'DROP'],
      correctAnswer: 'SELECT'
    },
    {
      id: 'sql-2',
      topic: 'joins',
      question: 'Wofuer wird ein JOIN verwendet?',
      answers: ['Tabellen verknuepfen', 'Daten loeschen', 'Spalten umbenennen', 'Transaktionen abbrechen'],
      correctAnswer: 'Tabellen verknuepfen'
    }
  ],
  python: [
    {
      id: 'python-1',
      topic: 'syntax',
      question: 'Welche Struktur speichert Schluessel-Wert-Paare in Python?',
      answers: ['list', 'tuple', 'dict', 'set'],
      correctAnswer: 'dict'
    },
    {
      id: 'python-2',
      topic: 'funktionen',
      question: 'Welches Keyword definiert eine Funktion?',
      answers: ['func', 'def', 'function', 'lambda only'],
      correctAnswer: 'def'
    }
  ]
};

function getInitials(name) {
  return String(name || 'Desktop User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'DU';
}

function createProfile(settings) {
  const profile = settings.teacherProfile || {};
  const displayName = profile.displayName || 'Dozent';
  const [firstName = displayName, ...lastParts] = displayName.split(/\s+/);
  return {
    id: 'local-desktop-user',
    displayName,
    email: profile.email || '',
    avatarDataUrl: profile.avatarDataUrl || '',
    initials: getInitials(displayName),
    quizProfile: {
      firstName,
      lastName: lastParts.join(' '),
      fach: 'fiae'
    }
  };
}

function createDokuToolService({ appData }) {
  const dokuDataDir = path.join(appData.dataDir, 'dokutool');
  const reportsPath = path.join(dokuDataDir, 'reports.json');
  const quizProfilePath = path.join(dokuDataDir, 'quiz-profile.json');

  function ensureDokuData() {
    ensureDir(dokuDataDir);
    if (!readJson(reportsPath, null)) {
      writeJson(reportsPath, []);
    }
    if (!readJson(quizProfilePath, null)) {
      writeJson(quizProfilePath, {});
    }
  }

  function getDesktopUser() {
    ensureDokuData();
    const profile = createProfile(appData.getSettings());
    const quizProfile = readJson(quizProfilePath, {});
    return {
      ...profile,
      quizProfile: {
        ...profile.quizProfile,
        ...quizProfile
      }
    };
  }

  function listQuestionPools() {
    return [
      { id: 'software', label: 'Software Entwicklung Allgemein', topics: ['grundlagen', 'prozesse'], previewCount: sampleQuestions.software.length },
      { id: 'sql', label: 'SQL', topics: ['select', 'joins'], previewCount: sampleQuestions.sql.length },
      { id: 'python', label: 'Python', topics: ['syntax', 'funktionen'], previewCount: sampleQuestions.python.length }
    ];
  }

  function getQuizConfig() {
    return {
      sourceRepo: quizSourceRepo,
      fachrichtungen,
      roleTemplates,
      questionSchema,
      questionPools: {
        connected: false,
        root: 'lokale-desktop-fragenpools',
        status: 'Lokaler Desktop-Modus: Beispiel-Fragenpools sind offline verfuegbar.',
        pools: listQuestionPools()
      },
      profile: getDesktopUser().quizProfile
    };
  }

  function getQuizQuestions({ poolId, topic, max } = {}) {
    const questions = sampleQuestions[poolId] || [];
    const limit = Math.min(Math.max(Number(max) || 20, 1), 50);
    return {
      questions: questions
        .filter((question) => !topic || question.topic === topic)
        .slice(0, limit)
    };
  }

  function saveQuizProfile(profileInput = {}) {
    ensureDokuData();
    const nextProfile = {
      firstName: String(profileInput.firstName || '').trim(),
      lastName: String(profileInput.lastName || '').trim(),
      fach: fachrichtungen[profileInput.fach] ? profileInput.fach : ''
    };
    writeJson(quizProfilePath, nextProfile);
    return {
      profile: {
        ...getDesktopUser().quizProfile,
        ...nextProfile
      }
    };
  }

  function analyzeDocument(input = {}) {
    ensureDokuData();
    const title = String(input.title || input.fileName || 'Lokale Doku-Pruefung');
    const text = String(input.text || '');
    const words = text.split(/\s+/).filter(Boolean);
    const headings = (text.match(/^#{1,3}\s+.+$/gm) || []).map((heading) => heading.replace(/^#+\s+/, ''));
    const hasSchedule = /zeitplan|meilenstein|phase|planung/i.test(text);
    const hasCost = /kosten|ressource|budget|aufwand/i.test(text);
    const hasGoal = /ziel|projektziel|nutzen|abnahme/i.test(text);
    const results = [
      {
        category: 'Dokumentstruktur',
        criterion: 'Textumfang',
        status: words.length >= 150 ? 'gruen' : words.length >= 50 ? 'gelb' : 'rot',
        severity: 'mittel',
        message: `${words.length} Woerter erkannt.`
      },
      {
        category: 'Dokumentstruktur',
        criterion: 'Ueberschriften',
        status: headings.length >= 3 ? 'gruen' : headings.length >= 1 ? 'gelb' : 'rot',
        severity: 'mittel',
        message: `${headings.length} Ueberschrift(en) erkannt.`
      },
      {
        category: 'IHK-Projekt',
        criterion: 'Projektziel erkennbar',
        status: hasGoal ? 'gruen' : 'gelb',
        severity: 'hoch',
        message: hasGoal ? 'Ziel-/Abnahmebegriffe gefunden.' : 'Projektziel sollte deutlicher formuliert werden.'
      },
      {
        category: 'IHK-Projekt',
        criterion: 'Zeitplanung',
        status: hasSchedule ? 'gruen' : 'gelb',
        severity: 'mittel',
        message: hasSchedule ? 'Planungsbegriffe gefunden.' : 'Zeitplanung oder Phasen fehlen noch.'
      },
      {
        category: 'IHK-Projekt',
        criterion: 'Kosten/Ressourcen',
        status: hasCost ? 'gruen' : 'grau',
        severity: 'niedrig',
        message: hasCost ? 'Kosten-/Ressourcenbegriffe gefunden.' : 'Kosten und Ressourcen wurden lokal nicht erkannt.'
      }
    ];
    const score = Math.round((results.filter((item) => item.status === 'gruen').length / results.length) * 100);
    const report = {
      id: `dokutool-${Date.now()}`,
      createdAt: new Date().toISOString(),
      metadata: {
        title,
        format: 'desktop-text',
        fileName: input.fileName || '',
        headings
      },
      summary: {
        score,
        grade: score >= 80 ? 'gut vorbereitet' : score >= 50 ? 'prüfbar mit Nacharbeit' : 'deutliche Nacharbeit',
        redCount: results.filter((item) => item.status === 'rot').length,
        yellowCount: results.filter((item) => item.status === 'gelb').length,
        grayCount: results.filter((item) => item.status === 'grau').length,
        totalCriteria: results.length,
        note: 'Lokale Desktop-Pruefung ohne externe KI und ohne Login.'
      },
      ai: {
        used: false,
        reason: 'Desktop-Modus ohne API-Key.'
      },
      results
    };
    const reports = readJson(reportsPath, []);
    writeJson(reportsPath, [{ id: report.id, createdAt: report.createdAt, title, report }, ...reports].slice(0, 100));
    return report;
  }

  function listReports() {
    ensureDokuData();
    return {
      reports: readJson(reportsPath, []).map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt,
        title: entry.title,
        score: entry.report?.summary?.score ?? null,
        grade: entry.report?.summary?.grade || ''
      }))
    };
  }

  function getReport(reportId) {
    ensureDokuData();
    const entry = readJson(reportsPath, []).find((item) => item.id === reportId);
    return entry ? { report: entry.report, meta: entry } : null;
  }

  return {
    dataDir: dokuDataDir,
    getDesktopUser,
    getQuizConfig,
    getQuizQuestions,
    saveQuizProfile,
    analyzeDocument,
    listReports,
    getReport
  };
}

module.exports = {
  createDokuToolService,
  fachrichtungen,
  roleTemplates,
  questionSchema
};
