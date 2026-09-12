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

  it("los tokens de la tabla que cambian en desktop redefinen --fs dentro de @media (min-width: 1024px)", () => {
    const inicioMedia = indexCss.search(/@media \(min-width: 1024px\) \{\s*:root, \.paleta-clara \{/);
    expect(inicioMedia).toBeGreaterThan(-1);
    const finMedia = indexCss.indexOf("\n  }", inicioMedia);
    const bloqueMedia = indexCss.slice(inicioMedia, finMedia);

    const faltantes = TOKENS_QUE_CAMBIAN_EN_DESKTOP.filter(
      (token) => !new RegExp(`--fs-${token}:\\s*[\\d.]+px;`).test(bloqueMedia),
    );
    expect(faltantes).toEqual([]);
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
  const CLASE_TEXTO_ARBITRARIA = /text-\[(\d{1,2})px\]/g;

  it("ningún `text-[Npx]` en src/ pisa los 11px", () => {
    const violaciones = [];
    for (const ruta of archivosDeMarkup(`${raiz}/src`)) {
      const contenido = readFileSync(ruta, "utf8");
      for (const [, valor] of contenido.matchAll(CLASE_TEXTO_ARBITRARIA)) {
        if (Number.parseInt(valor, 10) < PISO_PX) {
          violaciones.push(`${ruta.slice(raiz.length + 1).replaceAll("\\", "/")} (text-[${valor}px])`);
        }
      }
    }
    expect(violaciones).toEqual([]);
  });
});
