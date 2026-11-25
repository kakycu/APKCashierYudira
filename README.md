# Visiones - CashFlow

Calculadora de billetes multidenominación, 100 % local (sin peticiones de red).

## Estructura

- `index.html` (raíz): simple redirección para abrir la app con doble clic.
- `www/`: **código fuente de la aplicación**.
  - `index.html`, `styles.css`, `app.js`
  - `fonts/` (Inter + JetBrains Mono, `.woff2` con licencias OFL)
  - `vendor/fontawesome/` (iconos locales)
  - `icons/` (iconos 192/512 y maskable generados desde `visioneslogo.png`)
  - `manifest.webmanifest`
  - `sounds/` (vacío; los sonidos se generan con Web Audio)

> Los archivos `fonts/`, `vendor/`, `sounds/` y `visioneslogo.png` en la raíz son copias de los originales; la app ya no los usa. Puedes eliminarlos cuando quieras.

## Adaptación móvil / APK (fase 1 aplicada)

`app.js` detecta Capacitor mediante `window.Capacitor` sin importar paquetes, así que **la versión web sigue funcionando igual** si los plugins no están instalados:

- `body.native` oculta los botones de ventana y ajusta `safe-area` / `touch-action`.
- `Preferences` se usa como copia persistente de `localStorage` y se restaura al arrancar.
- `Clipboard` nativo con fallback a `navigator.clipboard` y `execCommand`.
- `App.addListener('backButton', …)`: vuelve a la pestaña Calculadora o pide confirmación para salir.
- `StatusBar` sigue el tema claro/oscuro.
- El `prompt()` de la nota fue sustituido por un modal propio.
- Un único `AudioContext` se reutiliza y se reanuda en el primer toque.

Cuando los plugins no están presentes, todo usa las alternativas web automáticamente.

## Preparar el APK (fase 2, cuando quieras)

```bash
npm init -y
npm i @capacitor/core
npm i -D @capacitor/cli
npm i @capacitor/android @capacitor/app @capacitor/clipboard @capacitor/preferences @capacitor/status-bar
npx cap init VisionesCashFlow com.visiones.cashflow --web-dir=www
npx cap add android
npx cap sync
```

`capacitor.config.json` debe conservar `webDir: "www"` y `androidScheme: "https"`. Después abre `android/` en Android Studio y genera un APK firmado (*Build → Generate Signed Bundle / APK*). `minSdkVersion 22`, `targetSdkVersion 35`.

Cada vez que cambies `www/`: `npx cap sync` y recompilar.

## Pruebas recomendadas

Modo avión, botón Atrás, notch/pantalla corta, rotación, copiar al portapapeles, sonido tras el primer toque y persistencia del historial tras actualizar la APK.
