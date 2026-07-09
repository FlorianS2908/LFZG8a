const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');

async function main() {
  const opened = {
    lfzq8a: false,
    wizard: false
  };
  const errors = [];

  ipcMain.handle('workspace:get-state', () => ({
    settings: {
      teacherProfile: {
        displayName: 'Smoke Test',
        email: 'smoke@example.test',
        avatarDataUrl: ''
      }
    },
    supportedLanguages: [],
    dokuTool: {
      dataDir: 'userData/dokutool',
      user: { id: 'local-desktop-user' }
    }
  }));
  ipcMain.handle('workspace:save-profile', (event, profile) => ({
    teacherProfile: {
      displayName: profile.displayName,
      email: profile.email,
      avatarDataUrl: ''
    }
  }));
  ipcMain.handle('workspace:open-lfzq8a', () => {
    opened.lfzq8a = true;
    return true;
  });
  ipcMain.handle('workspace:open-wizard', () => {
    opened.wizard = true;
    return true;
  });
  ipcMain.handle('dokutool:quiz-config', () => ({
    sourceRepo: 'SmokeRepo',
    questionSchema: {
      firestorePath: 'fragenpools/{poolId}/questions',
      fields: [{ key: 'question', label: 'Frage' }]
    },
    questionPools: {
      status: 'Smoke lokal',
      pools: [{ id: 'software', label: 'Software', topics: ['grundlagen'], previewCount: 1 }]
    }
  }));
  ipcMain.handle('dokutool:quiz-questions', () => ({
    questions: [{
      question: 'Smoke Frage?',
      answers: ['Ja', 'Nein'],
      correctAnswer: 'Ja'
    }]
  }));
  ipcMain.handle('dokutool:reports-list', () => ({ reports: [] }));
  ipcMain.handle('dokutool:analyze', () => ({
    summary: {
      score: 80,
      grade: 'gut vorbereitet',
      note: 'Smoke'
    },
    results: [{
      category: 'Smoke',
      criterion: 'Renderer',
      status: 'gruen',
      message: 'OK'
    }]
  }));

  await app.whenReady();
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(appRoot, 'app', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.webContents.on('console-message', (event, level, message) => {
    if (/Electron Security Warning/.test(message)) {
      return;
    }
    if (level >= 2) {
      errors.push(message);
    }
  });

  await window.loadFile(path.join(appRoot, 'app', 'renderer', 'tool-center', 'workspace.html'));
  await new Promise((resolve) => setTimeout(resolve, 700));

  const result = await window.webContents.executeJavaScript(`
    (async () => {
      const text = document.body.innerText;
      const hasLoginText = /Einloggen|Registrieren|Abmelden/.test(text);
      document.querySelector('[data-open-tool="doku"]').click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      const dokuActive = document.querySelector('[data-view="doku"]').classList.contains('is-active');
      document.querySelector('[data-run-doku-check]').click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      const dokuReport = document.querySelector('[data-doku-report]').innerText;
      document.querySelector('[data-back-workspace]').click();
      document.querySelector('[data-open-tool="quiz"]').click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      const quizActive = document.querySelector('[data-view="quiz"]').classList.contains('is-active');
      document.querySelector('[data-quiz-pool]').value = 'software';
      document.querySelector('[data-quiz-pool]').dispatchEvent(new Event('change'));
      document.querySelector('[data-load-questions]').click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      const quizQuestions = document.querySelector('[data-question-preview]').innerText;
      document.querySelector('[data-back-workspace]').click();
      document.querySelector('[data-open-timer="sql"]').click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      const timerActive = document.querySelector('[data-view="timer"]').classList.contains('is-active');
      const timerTitle = document.querySelector('[data-timer-title]').textContent;
      document.querySelector('[data-back-workspace]').click();
      document.querySelector('[data-open-lfzq8a]').click();
      document.querySelector('[data-open-wizard]').click();
      return { hasLoginText, dokuActive, dokuReport, quizActive, quizQuestions, timerActive, timerTitle };
    })();
  `);

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  if (result.hasLoginText || !result.dokuActive || !/Smoke/.test(result.dokuReport)) {
    throw new Error(`DokuTool-View fehlerhaft: ${JSON.stringify(result)}`);
  }
  if (!result.quizActive || !/Smoke Frage/.test(result.quizQuestions)) {
    throw new Error(`QuizTool-View fehlerhaft: ${JSON.stringify(result)}`);
  }
  if (!result.timerActive || result.timerTitle !== 'SQL') {
    throw new Error(`TimerQuiz-View fehlerhaft: ${JSON.stringify(result)}`);
  }
  if (!opened.lfzq8a || !opened.wizard) {
    throw new Error(`HTML/CSS/Wizard wurden nicht angebunden: ${JSON.stringify(opened)}`);
  }

  await window.close();
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.quit();
  process.exit(1);
});
