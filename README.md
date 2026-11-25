# ChashierYudira (antes Visiones - CashFlow)

Calculadora de billetes multidenominación, 100 % local (sin peticiones de red).

Repositorio: https://github.com/kakycu/APKCashierYudira

El APK generado se llama **`ChashierYudira.apk`**. Las tarjetas del historial muestran el desglose de billetes (por ejemplo `7×10,000`, `1×500`).

## Pantalla de entrada

Al abrir la app (también en la APK) se muestra `www/intro.html` con esta coreografía: entra el círculo (`01_Circulo.png`) con la misma transición del original, después aparece el unicornio (`02_Unicornio.png`) más pequeño, luego `Yudira.png` cae desde arriba en grande y queda centrada dentro del círculo, sin recuadro ni borde (solo su recorte PNG con `drop-shadow`), y finalmente el unicornio sube por delante de la foto y se coloca encima del círculo. Debajo aparece el botón **ENTRAR AL CASHIER DE YUDIRA**, que guarda un flag en `sessionStorage` y abre `index.html`. Bajo la versión se muestra el crédito `(c) Unicornio Software(r) - 2026` con el unicornio con glow blanco. Todos los botones incluyen icono, incluidos los diálogos.

## Menú lateral y actualizaciones (v2.0.0)

- Botón de hamburguesa en la barra de título: abre una barra lateral con las cuatro secciones, acciones rápidas (guardar, vaciar, tema, sonidos, preferencias), **Cerrar aplicación** y **Buscar actualizaciones**.
- El cierre usa `App.exitApp()` en Android y una confirmación + recarga en navegador; el botón Atrás cierra primero el menú.
- La búsqueda de versiones es **manual y opcional**: consulta el último *release* de GitHub solo al pulsarla. Si no hay conexión, avisa y la app sigue funcionando sin red. Si hay una versión nueva, muestra un diálogo con el enlace directo al APK; en Android se abre con `window.open(url, '_system')`.
- Versiones: `APP_VERSION` en `www/app.js` debe coincidir con el tag de la release de GitHub (`v2.0.0`).

## Compilar desde GitHub

El workflow `.github/workflows/build-apk.yml` compila automáticamente en cada `push` a `main`. También puedes lanzarlo manualmente: pestaña **Actions** → *Compilar APK ChashierYudira* → **Run workflow**. El APK queda como artefacto descargable (`ChashierYudira`).

## Estructura

- `index.html` (raíz): redirección a `www/intro.html` para abrir con doble clic.
- `www/`: **código fuente de la aplicación**.
  - `intro.html` (animación de entrada), `index.html` (app), `styles.css`, `app.js`
  - `anim/` (solo `01_Circulo.png`, `02_Unicornio.png` y `Yudira.png`, usados en la animación)
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
