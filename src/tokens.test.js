import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";

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
    const oscuro = indexCss.slice(indexCss.indexOf('[data-tema-admin="oscuro"]'));
    expect(oscuro).not.toMatch(/--color-brand-teal/);
  });
});
