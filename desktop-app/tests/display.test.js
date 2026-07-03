const assert = require('node:assert/strict');
const {
  chooseTargetDisplay,
  createFullDisplayBounds,
  createWindowOptions,
  getDisplaySummaries
} = require('../app/lib/display');

const primaryDisplay = {
  id: 1,
  bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  workArea: { x: 0, y: 0, width: 1920, height: 1040 },
  scaleFactor: 1
};

const secondDisplay = {
  id: 2,
  bounds: { x: 1920, y: 0, width: 1920, height: 1080 },
  workArea: { x: 1920, y: 0, width: 1920, height: 1040 },
  scaleFactor: 1.25
};

test('display helpers mark primary display in summaries', () => {
  const summaries = getDisplaySummaries([primaryDisplay, secondDisplay], primaryDisplay);

  assert.deepEqual(summaries.map(({ index, label, primary }) => ({ index, label, primary })), [
    { index: 0, label: 'Monitor 1', primary: true },
    { index: 1, label: 'Monitor 2', primary: false }
  ]);
});

test('display helpers fall back to first display as primary without primary input', () => {
  const summaries = getDisplaySummaries([primaryDisplay, secondDisplay], null);

  assert.equal(summaries[0].primary, true);
  assert.equal(summaries[1].primary, false);
});

test('display helpers choose configured display when available', () => {
  assert.equal(chooseTargetDisplay([primaryDisplay, secondDisplay], primaryDisplay, 1), secondDisplay);
});

test('display helpers fall back to second display and then primary display', () => {
  assert.equal(chooseTargetDisplay([primaryDisplay, secondDisplay], primaryDisplay, 9), secondDisplay);
  assert.equal(chooseTargetDisplay([primaryDisplay], primaryDisplay, 9), primaryDisplay);
  assert.equal(chooseTargetDisplay([], primaryDisplay, 9), primaryDisplay);
});

test('display helpers fall back to the first available display without primary input', () => {
  assert.equal(chooseTargetDisplay([primaryDisplay], null, 9), primaryDisplay);
});

test('display helpers create stable window options from work area', () => {
  const options = createWindowOptions(secondDisplay, 'preload.js', { title: 'Test' });

  assert.deepEqual({
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    minWidth: options.minWidth,
    minHeight: options.minHeight,
    title: options.title,
    webPreferences: options.webPreferences
  }, {
    x: 1920,
    y: 0,
    width: 1824,
    height: 988,
    minWidth: 900,
    minHeight: 650,
    title: 'Test',
    webPreferences: {
      preload: 'preload.js',
      contextIsolation: true,
      nodeIntegration: false
    }
  });
});

test('display helpers create full teacher window bounds for the selected display', () => {
  assert.deepEqual(createFullDisplayBounds(secondDisplay), {
    x: 1920,
    y: 0,
    width: 1920,
    height: 1040
  });
});

test('display helpers use bounds fallback and minimum window size', () => {
  const compactDisplay = {
    id: 3,
    bounds: { x: -1200, y: 0, width: 800, height: 600 },
    scaleFactor: 1
  };

  const options = createWindowOptions(compactDisplay, 'preload.js');

  assert.deepEqual({
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height
  }, {
    x: -1200,
    y: 0,
    width: 900,
    height: 700
  });

  assert.deepEqual(createFullDisplayBounds(compactDisplay), {
    x: -1200,
    y: 0,
    width: 800,
    height: 600
  });
});
