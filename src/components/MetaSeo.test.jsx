import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import MetaSeo, { _reiniciarLimpiezaEstaticaParaTests } from "./MetaSeo.jsx";

afterEach(cleanup);

function head(selector) {
  return document.head.querySelector(selector);
}

describe("MetaSeo", () => {
  it("hoistea el título al head", () => {
    render(<MetaSeo titulo="Set de cuchillos — YIMA" descripcion="x" canonical="https://y.com/a" />);
    expect(document.title).toBe("Set de cuchillos — YIMA");
  });

  it("emite description y canonical", () => {
    render(<MetaSeo titulo="t" descripcion="Seis piezas." canonical="https://y.com/a" />);

    expect(head('meta[name="description"]').getAttribute("content")).toBe("Seis piezas.");
    expect(head('link[rel="canonical"]').getAttribute("href")).toBe("https://y.com/a");
  });

  it("NO emite robots cuando noindex es falso", () => {
    render(<MetaSeo titulo="t" descripcion="d" canonical="https://y.com/a" />);
    expect(head('meta[name="robots"]')).toBe(null);
  });

  it("emite robots noindex cuando se lo pide", () => {
    render(<MetaSeo titulo="t" descripcion="d" canonical="https://y.com/a" noindex />);
    expect(head('meta[name="robots"]').getAttribute("content")).toBe("noindex, follow");
  });

  it("emite el bloque JSON-LD con el objeto serializado", () => {
    render(
      <MetaSeo titulo="t" descripcion="d" canonical="https://y.com/a"
        jsonLd={{ "@type": "Product", name: "Cuchillo" }} />,
    );

    const script = document.querySelector('script[type="application/ld+json"]');
    expect(JSON.parse(script.textContent)).toEqual({ "@type": "Product", name: "Cuchillo" });
  });

  it("acepta un array y emite un bloque por elemento", () => {
    render(
      <MetaSeo titulo="t" descripcion="d" canonical="https://y.com/a"
        jsonLd={[{ "@type": "Product" }, { "@type": "BreadcrumbList" }]} />,
    );

    expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(2);
  });

  it("escapa el < para que un </script> en el dato no cierre el bloque", () => {
    render(
      <MetaSeo titulo="t" descripcion="d" canonical="https://y.com/a"
        jsonLd={{ name: "Cuchillo </script><script>alert(1)</script>" }} />,
    );

    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script.textContent).not.toContain("</script>");
    // Y sigue siendo el mismo dato al parsear.
    expect(JSON.parse(script.textContent).name).toBe("Cuchillo </script><script>alert(1)</script>");
  });

  it("emite los tags Open Graph con la imagen por defecto cuando no se pasa una", () => {
    render(<MetaSeo titulo="t" descripcion="d" canonical="https://y.com/a" />);

    expect(head('meta[property="og:image"]').getAttribute("content")).toContain("og-default.png");
    expect(head('meta[property="og:url"]').getAttribute("content")).toBe("https://y.com/a");
  });
});

describe("limpieza de los tags estáticos duplicados de index.html", () => {
  // El flag que decide si ya se corrió la limpieza vive a nivel de módulo
  // (mismo patrón que useCarrito/useFavoritos/useTemaAdmin): sin resetearlo
  // acá, el efecto ya se consumió con el primer `render(<MetaSeo />)` de
  // este archivo y los tests de este bloque no verían ningún nodo borrarse.
  // `document.head` también es estado global compartido entre tests, así
  // que cada caso arma sus propios nodos falsos (simulando lo que
  // `index.html` deja puesto antes de que React monte) y los saca al final,
  // sobrevivan o no al efecto — sin esto un test que falla dejaría basura en
  // el `<head>` para los que corren después.
  let etiquetaMarcada;
  let etiquetaSinMarcar;

  beforeEach(() => {
    _reiniciarLimpiezaEstaticaParaTests();

    etiquetaMarcada = document.createElement("meta");
    etiquetaMarcada.setAttribute("data-seo-estatico", "");
    etiquetaMarcada.setAttribute("property", "og:title");
    etiquetaMarcada.setAttribute("content", "YIMA — genérico de index.html");
    document.head.appendChild(etiquetaMarcada);

    // Representa un tag que index.html declara pero MetaSeo NO emite
    // (og:image:width, viewport, etc.) — no lleva data-seo-estatico porque
    // borrarlo lo perdería sin que nadie lo reemplace.
    etiquetaSinMarcar = document.createElement("meta");
    etiquetaSinMarcar.setAttribute("property", "og:image:width");
    etiquetaSinMarcar.setAttribute("content", "1200");
    document.head.appendChild(etiquetaSinMarcar);
  });

  afterEach(() => {
    etiquetaMarcada.remove();
    etiquetaSinMarcar.remove();
  });

  it("borra del head los nodos marcados con data-seo-estatico al montar por primera vez", () => {
    render(<MetaSeo titulo="t" descripcion="d" canonical="https://y.com/a" />);

    expect(document.head.querySelector("[data-seo-estatico]")).toBe(null);
  });

  it("no toca los tags estáticos que MetaSeo no emite (sin marcar)", () => {
    render(<MetaSeo titulo="t" descripcion="d" canonical="https://y.com/a" />);

    expect(head('meta[property="og:image:width"]').getAttribute("content")).toBe("1200");
  });
});
