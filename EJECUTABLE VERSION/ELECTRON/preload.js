const { contextBridge } = require('electron');

/* Puente mínimo compatible con el código Capacitor de www/app.js.
   Con esto el escritorio usa el mismo modo "native" que la APK:
   el botón X cierra la ventana y la configuración persiste en localStorage. */
contextBridge.exposeInMainWorld('Capacitor', {
  getPlatform: () => 'electron',
  Plugins: {
    App: {
      exitApp: () => window.close(),
      addListener: () => {}
    },
    Preferences: {
      get: async ({ key }) => ({
        value: localStorage.getItem(String(key)) || undefined
      }),
      set: async ({ key, value }) => {
        localStorage.setItem(String(key), String(value));
      }
    }
  }
});
