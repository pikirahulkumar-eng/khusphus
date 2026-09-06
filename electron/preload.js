const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  sendNotification: (title, body) => ipcRenderer.send('notify', { title, body }),
  isElectron: true,
});

// Inject global desktop CSS for cursor pointer and desktop feel
window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.id = 'sunao-electron-custom-styles';
  style.innerHTML = `
    * {
      -webkit-user-select: auto;
      user-select: auto;
    }
    button, [role="button"], [data-focusable="true"], a, [tabindex="0"] {
      cursor: pointer !important;
    }
    input, textarea {
      cursor: text !important;
    }
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.4);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(100, 116, 139, 0.7);
    }
  `;
  document.head.appendChild(style);
});
