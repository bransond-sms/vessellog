const { contextBridge } = require('electron')

// We will expose database and filesystem APIs here as we build each module.
// For now this file just establishes the secure bridge between
// the Electron main process and the React frontend.

contextBridge.exposeInMainWorld('vesselAPI', {
  version: () => '1.0.0',
})