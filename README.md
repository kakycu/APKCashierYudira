# ChashierYudira (antes Visiones - CashFlow)

Calculadora de billetes multidenominación, 100 % local: no envía datos ni depende de la red para funcionar. Solo consulta GitHub para detectar versiones nuevas (en la APK, al abrir; en la web, al pulsar el botón).

Repositorio: https://github.com/kakycu/APKCashierYudira

El APK generado se llama **`ChashierYudira.apk`**. Las tarjetas del historial muestran el desglose de billetes (por ejemplo `7×10,000`, `1×500`). En **Calculadora**, el espacio de **Filtrar denominaciones** está dividido en dos: a la izquierda se repite el card del **Total acumulado** (con el mismo estilo y valores sincronizados con el panel final) y a la derecha quedan el buscador y los botones **Vaciar** y **Guardar**. En **Denominaciones** puedes activar/desactivar cada una y borrar las que hayas agregado; las originales (`3, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000`) nunca muestran botón de borrar y no se pueden eliminar. La moneda se elige en un desplegable compacto (`CUP`, `USD`, `EUR`, `MXN` o **Personalizada…**) con el mismo estilo de los controles, en una sola fila para ahorrar espacio; al elegir **Personalizada…** se enfoca el campo del código y se aplica con el botón de check.

## Pantalla de entrada

Al abrir la app (también en la APK) se muestra `www/intro.html` con esta coreografía: entra el círculo (`01_Circulo.png`) con la misma transición del original, después aparece el unicornio (`02_Unicornio.png`) más pequeño, luego `Yudira.png` cae desde arriba en grande y queda centrada dentro del círculo, sin recuadro ni borde (solo su recorte PNG con `drop-shadow`), y finalmente el unicornio sube por delante de la foto y se coloca encima del círculo. Al pasar el cursor sobre `Yudira.png`, la imagen se agranda suavemente (con un leve glow cian) y vuelve exactamente a su tamaño al retirarlo. Debajo aparece el botón **ENTRAR AL CASHIER DE YUDIRA**, que guarda un flag en `sessionStorage` y abre `index.html`. Bajo la versión se muestran el crédito `© Unicornio Software® - 2026` y la línea `En colaboración con MiPyMe "Visiones"`, con el unicornio en blanco completo y sin glow; el unicornio animado sobre Yudira lleva un glow blanco/cian más visible y termina un poco más pequeño. El icono de la app es `cashier.png`. Todos los botones incluyen icono, incluidos los diálogos.

## Menú lateral y actualizaciones (v2.0.1)

- Botón de hamburguesa en la barra de título: abre una barra lateral con las cuatro secciones, acciones rápidas (guardar, vaciar, tema, sonidos, preferencias), **Repetir animación de inicio**, **Autor**, **Cerrar aplicación** y **Buscar actualizaciones**.
- Dos botones flotantes con icono en el lado derecho inferior: **Ir al inicio** (`fa-arrow-up`) y **Ir al final** (`fa-arrow-down`). Funcionan tanto en la web como en la APK, respetan el scroll del documento y el contenedor `.app` en pantallas apaisadas, y se ocultan mientras el menú lateral está abierto.
- **Repetir animación de inicio** limpia la marca de sesión y vuelve a `intro.html`, de modo que la animación completa (círculo, Yudira y unicornio) se reproduce desde el principio; al pulsar **Entrar al Cashier de Yudira** se regresa a la app.
- **Autor** abre un modal con el perfil de Franklin Ramos Lamadrid (Kaky): título `Fundador · Ingeniería y Desarrollo`, su foto local `www/images/franklin-ramos-lamadrid.jpg`, la biografía de `about.php` y botones con icono para Facebook y Cerrar. Al tocar la foto se abre un segundo modal con la imagen completa (`www/images/franklin-ramos-lamadrid-full.jpg`) para verla con más detalle; se cierra con Escape, con Cerrar o tocando fuera y vuelve al perfil del autor. El modal del autor se cierra con Escape, con el botón Cerrar o tocando fuera; el botón Atrás de Android cierra primero el visor de foto, luego el perfil.
- El cierre usa `App.exitApp()` en Android y una confirmación + recarga en navegador; el botón Atrás cierra primero el menú.
- En la **APK**, al abrir la app (después de la intro) se comprueba en silencio el último *release* de GitHub; si hay una versión nueva se muestra el diálogo con el enlace directo al APK. Si no hay conexión, no se muestra ningún aviso y la app sigue funcionando sin red.
- En la **web**, la búsqueda sigue siendo manual: solo consulta GitHub al pulsar el botón. Si no hay conexión, avisa y la app sigue funcionando. En ambos casos el diálogo lleva el enlace al APK; en Android se abre con `window.open(url, '_system')`.
- Versiones: `APP_VERSION` en `www/app.js` debe coincidir con el tag de la release de GitHub (`v2.0.1`). Para probar la detección, instala primero `v2.0.0` y abre la app: debe aparecer el diálogo con el enlace a `v2.0.1`. Los sonidos vienen activados por defecto.

## Compilar desde GitHub

El workflow `.github/workflows/build-apk.yml` compila automáticamente en cada `push` a `main`. También puedes lanzarlo manualmente: pestaña **Actions** → *Compilar APK ChashierYudira* → **Run workflow**. El APK queda como artefacto descargable (`ChashierYudira`).

## Estructura

- `index.html` (raíz): redirección a `www/intro.html` para abrir con doble clic.
- `www/`: **código fuente de la aplicación**.
  - `intro.html` (animación de entrada), `index.html` (app), `styles.css`, `app.js`
  - `anim/` (solo `01_Circulo.png`, `02_Unicornio.png` y `Yudira.png`, usados en la animación)
  - `fonts/` (Inter + JetBrains Mono, `.woff2` con licencias OFL)
  - `vendor/fontawesome/` (iconos locales)
  - `icons/` (`cashier.png` original e iconos 192/512 y maskable generados desde él)
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

`capacitor.config.json` debe conservar `webDir: "www"` y `androidScheme: "https"`. Después abre `android/` en Android Studio y genera un APK firmado (*Build → Generate Signed Bundle / APK*). `minSdkVersion 24`, `targetSdkVersion 36`. El icono se genera desde `cashier.png` en `www/icons/` y en `android/app/src/main/res/mipmap-*/`.

Cada vez que cambies `www/`: `npx cap sync` y recompilar. La compilación usa los repositorios oficiales de Google y Maven Central; si estás en una red donde Google Maven no es accesible, añade `-PuseMirrors` a `./gradlew assembleDebug` para activar los espejos.

## Pruebas recomendadas

Modo avión, botón Atrás, notch/pantalla corta, rotación, copiar al portapapeles, sonido tras el primer toque y persistencia del historial tras actualizar la APK.
