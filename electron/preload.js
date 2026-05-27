const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('vesselAPI', {
  version: () => '0.1.0',

  vessel: {
    getProfile:  ()     => ipcRenderer.invoke('vessel:getProfile'),
    saveProfile: (data) => ipcRenderer.invoke('vessel:saveProfile', data),
  },

  equipment: {
    getAll:     ()     => ipcRenderer.invoke('equipment:getAll'),
    saveItem:   (data) => ipcRenderer.invoke('equipment:saveItem', data),
    deleteItem: (id)   => ipcRenderer.invoke('equipment:deleteItem', id),
  },

  crew: {
    getAll:                 ()     => ipcRenderer.invoke('crew:getAll'),
    getAllIncludingInactive: ()     => ipcRenderer.invoke('crew:getAllIncludingInactive'),
    saveMember:             (data) => ipcRenderer.invoke('crew:saveMember', data),
  },

  trips: {
    getAll:  ()     => ipcRenderer.invoke('trips:getAll'),
    getOne:  (id)   => ipcRenderer.invoke('trips:getOne', id),
    save:    (data) => ipcRenderer.invoke('trips:save', data),
    delete:  (id)   => ipcRenderer.invoke('trips:delete', id),
  },

  credentials: {
    getForCrew: (crewId) => ipcRenderer.invoke('credentials:getForCrew', crewId),
    save:       (data)   => ipcRenderer.invoke('credentials:save', data),
    delete:     (id)     => ipcRenderer.invoke('credentials:delete', id),
  },

  trainingTypes: {
    getAll: ()     => ipcRenderer.invoke('trainingTypes:getAll'),
    save:   (data) => ipcRenderer.invoke('trainingTypes:save', data),
  },

  training: {
    getForCrew: (crewId) => ipcRenderer.invoke('training:getForCrew', crewId),
    getAll:     ()       => ipcRenderer.invoke('training:getAll'),
    save:       (data)   => ipcRenderer.invoke('training:save', data),
    delete:     (id)     => ipcRenderer.invoke('training:delete', id),
  },

  seaDays: {
    getForCrew: (crewId) => ipcRenderer.invoke('seaDays:getForCrew', crewId),
  },

  attachments: {
    copyFile: (sourcePath) => ipcRenderer.invoke('attachments:copyFile', sourcePath),
    openFile: (filePath)   => ipcRenderer.invoke('attachments:openFile', filePath),
  },

  checklists: {
    getAll:    ()     => ipcRenderer.invoke('checklists:getAll'),
    getOne:    (id)   => ipcRenderer.invoke('checklists:getOne', id),
    create:    (data) => ipcRenderer.invoke('checklists:create', data),
    checkItem: (data) => ipcRenderer.invoke('checklists:checkItem', data),
    delete:    (id)   => ipcRenderer.invoke('checklists:delete', id),
  },

  safetyLog: {
    getAll:    ()     => ipcRenderer.invoke('safetyLog:getAll'),
    getOne:    (id)   => ipcRenderer.invoke('safetyLog:getOne', id),
    getLatest: ()     => ipcRenderer.invoke('safetyLog:getLatest'),
    create:    (data) => ipcRenderer.invoke('safetyLog:create', data),
    saveItem:  (data) => ipcRenderer.invoke('safetyLog:saveItem', data),
    update:    (data) => ipcRenderer.invoke('safetyLog:update', data),
    delete:    (id)   => ipcRenderer.invoke('safetyLog:delete', id),
  },
})
