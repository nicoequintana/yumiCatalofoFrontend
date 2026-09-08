import { describe, expect, it } from "vitest";
import { claseCampo, claseEtiqueta } from "./clasesFormulario.js";

/**
 * Guard del anillo de foco de los campos del panel.
 *
 * MEDIDO EN NAVEGADOR: con `focus:border-primary focus:outline-none`, el
 * estado enfocado computaba `outline: solid 2px rgba(0,0,0,0)` —o sea el
 * outline TRANSPARENTE que emite `outline-none`— y `box-shadow: none`. El
 * único cambio real entre enfocado y no enfocado era el color de un borde de
 * **1px**: WCAG 2.2 SC 2.4.11 (Focus Appearance) pide un perímetro de al
 * menos 2px. El contraste sí pasaba (4.25:1), el grosor no.
 *
 * Se afirma sobre el STRING de clases y no sobre el estilo computado a
 * propósito: jsdom no resuelve utilidades de Tailwind, así que un test que
 * leyera `getComputedStyle` pasaría en verde con el bug puesto. La medición
 * real está en la verificación con navegador de esta tanda.
 */
describe("claseCampo — anillo de foco", () => {
  it("no vuelve a apagar el outline", () => {
    expect(claseCampo).not.toContain("outline-none");
  });

  it("dibuja un anillo sólido de 2px con color de token", () => {
    // `outline-2` sola no alcanza: sin `outline` (que fija `outline-style:
    // solid`) el estilo queda en el `auto` del navegador, y `auto` IGNORA
    // tanto el ancho como el color declarados.
    expect(claseCampo).toContain("focus-visible:outline");
    expect(claseCampo).toContain("focus-visible:outline-2");
    expect(claseCampo).toContain("focus-visible:outline-offset-2");
    expect(claseCampo).toContain("focus-visible:outline-primary");
  });

  it("usa focus-visible y no focus", () => {
    // Con `focus:` el anillo también aparece al hacer click con el mouse, que
    // es ruido visual para quien no lo necesita.
    expect(claseCampo).not.toMatch(/(^|\s)focus:/);
  });

  it("mantiene el color en tokens semánticos, sin hex", () => {
    for (const clase of [claseCampo, claseEtiqueta]) {
      expect(clase).not.toMatch(/#[0-9a-f]{3,8}/i);
      expect(clase).not.toContain("dark:");
    }
  });
});
