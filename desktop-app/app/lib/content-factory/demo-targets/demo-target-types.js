const DEMO_TOOLS = ['excel', 'word', 'vscode', 'browser', 'drawio', 'jupyter', 'sql', 'default'];
const DEMO_LAUNCH_MODES = ['open-file', 'open-folder', 'open-browser', 'show-in-folder', 'disabled-in-standalone'];
const BLOCKED_DEMO_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.msi', '.vbs', '.js'];
const SAFE_DEMO_EXTENSIONS = ['.csv', '.rtf', '.md', '.java', '.py', '.html', '.css', '.sql', '.drawio', '.ipynb', '.txt'];

function createDemoSafety(overrides = {}) {
  return {
    allowAutoRun: false,
    requiresUserClick: true,
    blockExecutable: true,
    containerRelativeOnly: true,
    ...overrides
  };
}

module.exports = {
  DEMO_TOOLS,
  DEMO_LAUNCH_MODES,
  BLOCKED_DEMO_EXTENSIONS,
  SAFE_DEMO_EXTENSIONS,
  createDemoSafety
};
