import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import configTailwind from "../tailwind.config.js";

const archivoActual = fileURLToPath(import.meta.url);
const dirSrc = dirname(archivoActual);
const raiz = dirname(dirSrc); // sube a frontend/
const indexCss = readFileSync(`${raiz}/src/index.css`, "utf8");
const tailwindConfig = readFileSync(`${raiz}/tailwind.config.js`, "utf8");

describe("token brand-teal", () => {
  it("se declara en CANALES, no en hex", () => {
    // Con hex, Tailwind no encuentra el placeholder <alpha-value>, descarta la
    // utilidad y no emite CSS: la clase queda en el markup sin nada detrás.
    expect(indexCss).toMatch(/--color-brand-teal:\s*26 106 128;/);
    expect(indexCss).not.toMatch(/--color-brand-teal:\s*#/);
  });

  it("está expuesto en tailwind.config.js con el wrapper de alpha", () => {
    expect(tailwindConfig).toMatch(
      /"brand-teal":\s*"rgb\(var\(--color-brand-teal\) \/ <alpha-value>\)"/,
    );
  });

  it("NO se declara en el tema oscuro del admin: es color de marca, no de tema", () => {
    // `indexOf` sobre el string pelado encontraría la MENCIÓN del selector en
    // el comentario de encabezado, no el bloque. Se ancla al principio de
    // línea y a la llave de apertura para dar con la regla de verdad.
    const inicioBloque = indexCss.search(/^\[data-tema-admin="oscuro"\]\s*\{/m);
    expect(inicioBloque).toBeGreaterThan(-1);
    const oscuro = indexCss.slice(inicioBloque);
    expect(oscuro).not.toMatch(/--color-brand-teal/);
  });
});

/**
 * Corta un bloque CSS desde donde matchea `regexInicio` hasta el cierre de
 * llave a nivel de raíz (`\n}`). Mismo mecanismo que ya usan a mano los tests
 * de `:root, .paleta-clara` y `[data-tema-admin="oscuro"]` más abajo en este
 * archivo — acá se nombra una vez para no repetir el `search`/`indexOf` en
 * cada test nuevo.
 */
function extraerBloque(css, regexInicio) {
  const inicio = css.search(regexInicio);
  if (inicio === -1) return "";
  const fin = css.indexOf("\n}", inicio);
  return css.slice(inicio, fin === -1 ? undefined : fin);
}

// Los 30 tokens semánticos (los 34 del admin MENOS los 4 alias literales del
// mockup viejo — terracotta-warm/moss-green/golden-sand/cream-base — que no
// se redefinen en `.tema-publico`, ver más abajo).
const TOKENS_SEMANTICOS = [
  "background",
  "on-background",
  "surface",
  "surface-container-lowest",
  "surface-container-low",
  "surface-container",
  "surface-container-high",
  "surface-container-highest",
  "surface-variant",
  "on-surface",
  "on-surface-variant",
  "outline",
  "outline-variant",
  "primary",
  "on-primary",
  "primary-container",
  "on-primary-container",
  "secondary",
  "on-secondary",
  "secondary-container",
  "on-secondary-container",
  "tertiary",
  "on-tertiary",
  "tertiary-container",
  "on-tertiary-container",
  "error",
  "on-error",
  "error-container",
  "on-error-container",
  "inverse-surface",
];

describe("paleta pública (.tema-publico)", () => {
  it("define los 30 tokens semánticos en .tema-publico, en canales", () => {
    const bloque = extraerBloque(indexCss, /\.tema-publico\s*\{/);
    TOKENS_SEMANTICOS.forEach((token) => {
      expect(bloque).toMatch(new RegExp(`--color-${token}:\\s*\\d{1,3} \\d{1,3} \\d{1,3};`));
    });
  });

  it(".tema-publico NO redefine los 4 alias ni brand-teal (heredan del admin)", () => {
    const bloque = extraerBloque(indexCss, /\.tema-publico\s*\{/);
    ["terracotta-warm", "moss-green", "golden-sand", "cream-base", "brand-teal"].forEach((alias) => {
      expect(bloque).not.toMatch(new RegExp(`--color-${alias}:`));
    });
  });

  it("el primary público es 0 49 60, y el admin sigue en 157 62 29", () => {
    expect(extraerBloque(indexCss, /^:root,\r?\n\.paleta-clara \{/m)).toMatch(/--color-primary:\s*157 62 29;/);
    expect(extraerBloque(indexCss, /\.tema-publico\s*\{/)).toMatch(/--color-primary:\s*0 49 60;/);
  });

  it("las tres variables de fuente están en Outfit/DM Sans dentro de .tema-publico, y en Plus Jakarta Sans en :root", () => {
    const publico = extraerBloque(indexCss, /\.tema-publico\s*\{/);
    expect(publico).toMatch(/--font-display:\s*"Outfit"/);
    expect(publico).toMatch(/--font-label:\s*"Outfit"/);
    expect(publico).toMatch(/--font-body:\s*"DM Sans"/);
    const admin = extraerBloque(indexCss, /^:root,\r?\n\.paleta-clara \{/m);
    expect(admin).toMatch(/--font-display:\s*"Plus Jakarta Sans"/);
  });

  it("tailwind.config.js referencia var(--font-x) en los 11 tokens, nunca un nombre fijo", () => {
    const fontFamilySection = tailwindConfig.slice(
      tailwindConfig.indexOf("fontFamily:"),
      tailwindConfig.indexOf("fontSize:"),
    );
    expect(fontFamilySection).not.toMatch(/"Plus Jakarta Sans"/);
    expect(fontFamilySection).toMatch(/var\(--font-display\)/);
    expect(fontFamilySection).toMatch(/var\(--font-label\)/);
    expect(fontFamilySection).toMatch(/var\(--font-body\)/);
  });
});

/*
 * Los tokens TIPOGRÁFICOS fallan igual de callados que los de color: una clase
 * `text-label-lg` sobre un token que nadie definió no emite CSS, no da warning
 * y no rompe ningún test. El navegador cae al 16px/400 heredado y, con el
 * preflight de Tailwind aplastando el peso de los `h1..h6`, un título termina
 * MÁS LIVIANO que su propio subtítulo. Jerarquía invertida, suite verde.
 *
 * Este guard barre el markup real y exige que cada token usado exista en las
 * DOS listas de `tailwind.config.js`: `fontSize` (que además lleva el peso) y
 * `fontFamily`.
 */
const FAMILIAS_TIPOGRAFICAS = "display|headline|body|label";
const CLASE_TIPOGRAFICA = new RegExp(`\\b(?:text|font)-((?:${FAMILIAS_TIPOGRAFICAS})-[a-z-]+)`, "g");

/**
 * Deuda PREEXISTENTE que había, anterior al rediseño de las pantallas de
 * cuenta: dos tokens que el panel admin usaba sin que estuvieran definidos
 * (`body-sm` en ~30 lugares, `headline-sm` en ~15). El sistema tipográfico
 * responsive (ver `docs/reglas/diseno-y-tema.md`) los definió: la lista queda
 * VACÍA a propósito, y no se borra el mecanismo — un token nuevo sin definir
 * tiene que volver a hacer fallar este test.
 */
const PENDIENTES_SIN_DEFINIR = new Set([]);

function archivosDeMarkup(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) return archivosDeMarkup(ruta);
    if (!/\.(js|jsx)$/.test(entrada.name)) return [];
    if (/\.test\.(js|jsx)$/.test(entrada.name)) return [];
    return [ruta];
  });
}

function tokensTipograficosUsados() {
  const usos = new Map(); // token -> archivos que lo usan
  for (const ruta of archivosDeMarkup(`${raiz}/src`)) {
    const contenido = readFileSync(ruta, "utf8");
    for (const [, token] of contenido.matchAll(CLASE_TIPOGRAFICA)) {
      if (!usos.has(token)) usos.set(token, new Set());
      usos.get(token).add(ruta.slice(raiz.length + 1).replaceAll("\\", "/"));
    }
  }
  return usos;
}

describe("tokens tipográficos", () => {
  const usados = tokensTipograficosUsados();
  const { fontSize, fontFamily } = configTailwind.theme.extend;

  // Un escaneo sin piso convierte "no encontré nada" en "está todo bien": si
  // `archivosDeMarkup` se queda con una lista vacía (filtro de extensión roto,
  // `src/` movido, el directorio equivocado), los DOS guards de arriba
  // comparan contra `[]`, no encuentran faltantes y quedan en verde sin haber
  // mirado un solo archivo — el mismo modo de falla que estos guards existen
  // para prevenir, ahora DENTRO del guard. Verificado: cambiar el filtro de
  // `archivosDeMarkup` de `.js|.jsx` a algo que no matchee ningún archivo hace
  // pasar los 13 tests de este archivo igual. Los pisos son holgados (hoy son
  // ~203 archivos y 11 tokens) pero no triviales.
  it("el escaneo de markup no está vacío: hay piso de archivos y de tokens usados", () => {
    const archivos = archivosDeMarkup(`${raiz}/src`);
    expect(archivos.length).toBeGreaterThan(150);
    expect(usados.size).toBeGreaterThan(8);
  });

  it("todo token usado en el markup está definido en fontSize", () => {
    const faltantes = [...usados]
      .filter(([token]) => !PENDIENTES_SIN_DEFINIR.has(token) && !(token in fontSize))
      .map(([token, archivos]) => `${token} (${[...archivos].join(", ")})`);
    expect(faltantes).toEqual([]);
  });

  it("todo token usado en el markup está definido en fontFamily", () => {
    const faltantes = [...usados]
      .filter(([token]) => !PENDIENTES_SIN_DEFINIR.has(token) && !(token in fontFamily))
      .map(([token, archivos]) => `${token} (${[...archivos].join(", ")})`);
    expect(faltantes).toEqual([]);
  });

  it("no quedan pendientes sin definir: la lista sigue vacía", () => {
    const sinDefinir = [...usados.keys()].filter((token) => !(token in fontSize));
    expect(sinDefinir.sort()).toEqual([...PENDIENTES_SIN_DEFINIR].sort());
  });

  // Desde el sistema tipográfico responsive, `fontSize[token][0]` ya no es un
  // valor en px: es `var(--fs-token)` (ver `index.css`). El tamaño real hay
  // que leerlo de la custom property, no del config — el peso sigue siendo
  // literal en `tailwind.config.js`, así que ese sí se lee de ahí.
  const pxDesdeCss = (token) => {
    const match = indexCss.match(new RegExp(`--fs-${token}:\\s*([\\d.]+)px;`));
    return match ? Number.parseFloat(match[1]) : NaN;
  };

  it("label-lg es más pesado que body-md y más grande que label-md: por eso sirve de título", () => {
    // Este test afirma una RELACIÓN, no tres números. La versión anterior
    // clavaba `16px` y se puso roja el día que se bajó la escala un peldaño,
    // sin que nada estuviera mal: medía el valor en vez de la propiedad.
    //
    // La propiedad que sostiene el diseño es que un título de fila domine al
    // subtítulo que lleva debajo. Eso se cumple mientras `label-lg` sea más
    // grande que `label-md` (el subtítulo) y más pesado que `body-md` (el
    // cuerpo). El tamaño exacto puede moverse; el orden, no.
    const peso = (token) => Number(fontSize[token][1].fontWeight);

    expect(fontSize["label-lg"]).toBeDefined();
    expect(pxDesdeCss("label-lg")).toBeGreaterThan(pxDesdeCss("label-md"));
    expect(peso("label-lg")).toBeGreaterThan(peso("body-md"));
  });

  it("body-md NO baja de 16px: es el tamaño de los campos y iOS hace zoom por debajo", () => {
    // Safari en iOS amplía TODA la página al enfocar un input con menos de
    // 16px, y no vuelve solo. No se puede desactivar desde CSS. Los campos
    // toman este token vía `CampoPassword` y `pages/cuenta/clasesCuenta.js`,
    // así que bajarlo rompe el formulario en todos los iPhone.
    //
    // Cuando el resto de la escala bajó un peldaño, este token se quedó. El
    // test está para que la próxima vez que alguien "termine el trabajo" se
    // entere acá y no en un checkout real.
    expect(pxDesdeCss("body-md")).toBeGreaterThanOrEqual(16);
  });
});

/*
 * Sistema tipográfico responsive: los `fontSize` de Tailwind no pueden variar
 * por media query, así que el tamaño vive en una custom property de
 * `index.css` (`--fs-<token>`) y `tailwind.config.js` solo la referencia con
 * `var()`. Es el mismo mecanismo que ya usan los colores del proyecto (ver el
 * bloque de arriba): un `var()` que apunta a una propiedad que no existe hace
 * que el navegador DESCARTE la declaración completa, sin error ni warning. Un
 * token que se agregue a `fontSize` sin su par en `index.css` se resuelve al
 * tamaño heredado y nadie se entera hasta mirar la pantalla.
 *
 * Seis tokens cambian de tamaño en escritorio (≥1024px); esa lista sale de la
 * tabla tipográfica que aportó el usuario, no del código: si un token nuevo
 * necesita variar en desktop, este test no lo va a exigir solo — hay que
 * sumarlo acá también.
 */
const TOKENS_QUE_CAMBIAN_EN_DESKTOP = [
  "display-xl",
  "display-lg",
  "headline-lg",
  "headline-md",
  "headline-sm",
  "body-lg",
];

describe("sistema tipográfico responsive", () => {
  const { fontSize } = configTailwind.theme.extend;

  // Corte del bloque `:root, .paleta-clara` en index.css: desde su apertura
  // hasta la primera línea que abre OTRO selector a nivel de raíz (no una
  // media query, que va anidada dentro de la hoja pero define el mismo
  // selector). Sirve para no confundir una propiedad de este bloque con una
  // que aparezca más abajo, por ejemplo en `[data-tema-admin="oscuro"]`.
  const inicioRoot = indexCss.search(/^:root,\r?\n\.paleta-clara \{/m);

  it("el bloque `:root, .paleta-clara` existe en index.css", () => {
    expect(inicioRoot).toBeGreaterThan(-1);
  });

  it("todo token de la escala tiene --fs y --lh definidos en `:root, .paleta-clara`", () => {
    const finRoot = indexCss.indexOf("\n}", inicioRoot);
    const bloqueRoot = indexCss.slice(inicioRoot, finRoot);

    const faltantes = Object.keys(fontSize).filter((token) => {
      const tieneFs = new RegExp(`--fs-${token}:\\s*[\\d.]+px;`).test(bloqueRoot);
      const tieneLh = new RegExp(`--lh-${token}:\\s*[\\d.]+;`).test(bloqueRoot);
      return !tieneFs || !tieneLh;
    });
    expect(faltantes).toEqual([]);
  });

  function bloqueMediaDesktop() {
    const inicioMedia = indexCss.search(/@media \(min-width: 1024px\) \{\s*:root, \.paleta-clara \{/);
    expect(inicioMedia).toBeGreaterThan(-1);
    const finMedia = indexCss.indexOf("\n  }", inicioMedia);
    return indexCss.slice(inicioMedia, finMedia);
  }

  it("los tokens de la tabla que cambian en desktop redefinen --fs dentro de @media (min-width: 1024px)", () => {
    const bloqueMedia = bloqueMediaDesktop();

    const faltantes = TOKENS_QUE_CAMBIAN_EN_DESKTOP.filter(
      (token) => !new RegExp(`--fs-${token}:\\s*[\\d.]+px;`).test(bloqueMedia),
    );
    expect(faltantes).toEqual([]);
  });

  it("`body-md` NO se redefine dentro de la media query de escritorio", () => {
    // `pxDesdeCss` (más arriba) lee la PRIMERA coincidencia de `--fs-<token>`
    // en TODO el archivo, o sea siempre la de `:root`. Un `--fs-body-md: 14px`
    // agregado dentro del bloque de 1024px pasaría el guard de "body-md no
    // baja de 16px" sin que nada chille, porque ese guard nunca mira la media
    // query. Es el invariante de mayor apuesta del archivo (el zoom de iOS en
    // los inputs), así que este test mira el bloque de la media query
    // directamente, no el valor resuelto.
    const bloqueMedia = bloqueMediaDesktop();
    expect(bloqueMedia).not.toMatch(/--fs-body-md:/);
  });

  it("cada fontSize de la escala referencia su custom property con var(), no un valor fijo", () => {
    // Si alguien vuelve a escribir un px suelto acá, el tamaño deja de
    // responder a la media query y el escritorio se queda con el de mobile.
    const faltantes = Object.entries(fontSize)
      .filter(([token, valor]) => valor[0] !== `var(--fs-${token})`)
      .map(([token]) => token);
    expect(faltantes).toEqual([]);
  });
});

describe("piso de 11px: nada por debajo, ni badges ni legales", () => {
  // `FiltrosCatalogo.jsx:363` fue la única violación conocida (10px, contador
  // de filtros activos). Un tamaño arbitrario por debajo de 11px no pasa por
  // ningún token de la escala y no lo agarra el guard de arriba: hay que
  // barrer el markup literal.
  const PISO_PX = 11;
  const PX_POR_REM = 16;
  // Cubre `text-[10px]`, `text-[10.5px]` (decimales) y `text-[0.625rem]`
  // (rem, convertido a px con base 16) — el regex viejo (`\d{1,2}px` sin
  // punto ni unidad `rem`) dejaba pasar las dos últimas formas sin marcar
  // nada: hoy no hay ninguna en el repo, así que es cobertura faltante, no
  // un agujero abierto.
  const CLASE_TEXTO_ARBITRARIA = /text-\[([\d.]+)(px|rem)\]/g;

  function violacionesDePiso(contenido) {
    const violaciones = [];
    for (const [, valor, unidad] of contenido.matchAll(CLASE_TEXTO_ARBITRARIA)) {
      const px = unidad === "rem" ? Number.parseFloat(valor) * PX_POR_REM : Number.parseFloat(valor);
      if (px < PISO_PX) violaciones.push(`text-[${valor}${unidad}]`);
    }
    return violaciones;
  }

  it("detecta decimales y `rem`, no solo enteros en `px`", () => {
    // El patrón anterior (`\d{1,2}px`) no matcheaba ninguno de estos tres:
    // ni el punto decimal ni la unidad `rem` estaban contemplados.
    expect(violacionesDePiso("text-[10.5px]")).toEqual(["text-[10.5px]"]);
    expect(violacionesDePiso("text-[0.625rem]")).toEqual(["text-[0.625rem]"]); // 0.625rem = 10px
    expect(violacionesDePiso("text-[0.6875rem]")).toEqual([]); // 0.6875rem = 11px, en el piso
  });

  it("ningún `text-[Npx]`/`text-[Nrem]` en src/ pisa los 11px", () => {
    const violaciones = [];
    for (const ruta of archivosDeMarkup(`${raiz}/src`)) {
      const contenido = readFileSync(ruta, "utf8");
      for (const violacion of violacionesDePiso(contenido)) {
        violaciones.push(`${ruta.slice(raiz.length + 1).replaceAll("\\", "/")} (${violacion})`);
      }
    }
    expect(violaciones).toEqual([]);
  });
});
