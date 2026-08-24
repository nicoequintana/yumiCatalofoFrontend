import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { limpiarMetaEstaticos, _reiniciarLimpiezaEstaticaParaTests } from "./metaEstaticos.js";

// `document.head` es estado global compartido entre tests, y el flag de
// `limpiarMetaEstaticos` vive a nivel de módulo — cada caso arma sus propios
// nodos falsos (simulando lo que `index.html` deja puesto antes de que React
// monte), resetea el flag y limpia sus nodos al final, sobrevivan o no a la
// función bajo test. Así el orden de los tests no importa.
describe("limpiarMetaEstaticos", () => {
  let marcado;
  let sinMarcar;

  beforeEach(() => {
    _reiniciarLimpiezaEstaticaParaTests();

    marcado = document.createElement("meta");
    marcado.setAttribute("data-seo-estatico", "");
    marcado.setAttribute("property", "og:title");
    marcado.setAttribute("content", "YIMA — genérico de index.html");
    document.head.appendChild(marcado);

    // Representa un tag que index.html declara pero MetaSeo NO emite
    // (og:image:width, viewport, etc.) — sin data-seo-estatico porque
    // borrarlo lo perdería sin que nadie lo reemplace.
    sinMarcar = document.createElement("meta");
    sinMarcar.setAttribute("property", "og:image:width");
    sinMarcar.setAttribute("content", "1200");
    document.head.appendChild(sinMarcar);
  });

  afterEach(() => {
    marcado.remove();
    sinMarcar.remove();
  });

  it("borra del head los nodos marcados con data-seo-estatico", () => {
    limpiarMetaEstaticos();

    expect(document.head.querySelector("[data-seo-estatico]")).toBe(null);
  });

  it("no toca los tags estáticos sin marcar", () => {
    limpiarMetaEstaticos();

    expect(document.head.querySelector('meta[property="og:image:width"]').getAttribute("content")).toBe("1200");
  });

  it("corre una sola vez: una segunda llamada no vuelve a barrer el head", () => {
    limpiarMetaEstaticos();

    // Simula un segundo `MetaSeo` montando en otra ruta y agregando un tag
    // marcado nuevo — si la limpieza corriera de nuevo, este también caería.
    const otroMarcado = document.createElement("meta");
    otroMarcado.setAttribute("data-seo-estatico", "");
    document.head.appendChild(otroMarcado);

    limpiarMetaEstaticos();

    expect(document.head.contains(otroMarcado)).toBe(true);
    otroMarcado.remove();
  });
});
