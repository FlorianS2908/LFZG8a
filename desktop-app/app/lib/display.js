function getDisplaySummaries(displays, primaryDisplay) {
  return displays.map((display, index) => ({
    id: display.id,
    index,
    label: index === 0 ? 'Monitor 1' : `Monitor ${index + 1}`,
    primary: primaryDisplay ? display.id === primaryDisplay.id : index === 0,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor
  }));
}

function chooseTargetDisplay(displays, primaryDisplay, monitorIndex) {
  return displays[monitorIndex] || displays[1] || primaryDisplay || displays[0];
}

function createWindowOptions(display, preloadFile, extra = {}) {
  const area = display.workArea || display.bounds;
  return {
    x: area.x,
    y: area.y,
    width: Math.max(900, Math.floor(area.width * 0.95)),
    height: Math.max(700, Math.floor(area.height * 0.95)),
    minWidth: 900,
    minHeight: 650,
    show: false,
    backgroundColor: '#f3f8fb',
    webPreferences: {
      preload: preloadFile,
      contextIsolation: true,
      nodeIntegration: false
    },
    ...extra
  };
}

function createFullDisplayBounds(display) {
  const area = display.workArea || display.bounds;
  return {
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height
  };
}

module.exports = {
  getDisplaySummaries,
  chooseTargetDisplay,
  createWindowOptions,
  createFullDisplayBounds
};
