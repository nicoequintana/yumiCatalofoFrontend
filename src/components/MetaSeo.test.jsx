import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import MetaSeo from "./MetaSeo.jsx";
import { _reiniciarLimpiezaEstaticaParaTests } from "../utils/metaEstaticos.js";

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

// El mecanismo en sí (idempotencia, qué borra y qué respeta) se prueba en
// `utils/metaEstaticos.test.js`, junto al código que lo implementa. Acá
// solo se confirma el punto de integración: que montar `MetaSeo` de verdad
// lo dispara.
describe("limpieza de los tags estáticos duplicados de index.html", () => {
  // El flag vive a nivel de módulo (`utils/metaEstaticos.js`, mismo patrón
  // que useCarrito/useFavoritos/useTemaAdmin): sin resetearlo acá, el efecto
  // ya se consumió con el primer `render(<MetaSeo />)` de este archivo y
  // este test no vería ningún nodo borrarse. `document.head` es estado
  // global compartido entre tests, así que el nodo falso (simulando lo que
  // `index.html` deja puesto antes de que React monte) se saca al final,
  // sobreviva o no al efecto.
  let etiquetaMarcada;

  beforeEach(() => {
    _reiniciarLimpiezaEstaticaParaTests();

    etiquetaMarcada = document.createElement("meta");
    etiquetaMarcada.setAttribute("data-seo-estatico", "");
    etiquetaMarcada.setAttribute("property", "og:title");
    etiquetaMarcada.setAttribute("content", "YIMA — genérico de index.html");
    document.head.appendChild(etiquetaMarcada);
  });

  afterEach(() => {
    etiquetaMarcada.remove();
  });

  it("dispara la limpieza de tags estáticos duplicados al montar", () => {
    render(<MetaSeo titulo="t" descripcion="d" canonical="https://y.com/a" />);

    expect(document.head.querySelector("[data-seo-estatico]")).toBe(null);
  });
});
