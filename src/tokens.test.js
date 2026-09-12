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
 * Deuda PREEXISTENTE, anterior al rediseño de las pantallas de cuenta: dos
 * tokens que el panel admin usa sin que estén definidos (`body-sm` en ~30
 * lugares, `headline-sm` en ~15). Definirlos cambia el tamaño y el peso de
 * media docena de pantallas del panel de golpe, así que es una decisión de
 * diseño aparte y no un arreglo al pasar. Están acá para que la lista NO
 * crezca: un token nuevo sin definir hace fallar este test.
 */
const PENDIENTES_SIN_DEFINIR = new Set(["body-sm", "headline-sm"]);

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

  it("los pendientes siguen siendo esos dos y ninguno más: la lista no crece", () => {
    const sinDefinir = [...usados.keys()].filter((token) => !(token in fontSize));
    expect(sinDefinir.sort()).toEqual([...PENDIENTES_SIN_DEFINIR].sort());
  });

  it("label-lg pesa más que label-md, que es lo que lo hace servir de título", () => {
    // El motivo de que exista: la escala salta de 14px/600 (`label-md`) a
    // 16px/400 (`body-md`). Sin un peldaño de 16/600, un título de fila queda
    // más liviano que el subtítulo de 14/600 que lleva debajo.
    expect(fontSize["label-lg"]).toBeDefined();
    const [tamanio, opciones] = fontSize["label-lg"];
    expect(tamanio).toBe("16px");
    expect(opciones.fontWeight).toBe("600");
  });
});
