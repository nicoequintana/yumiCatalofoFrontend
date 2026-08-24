import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "../context/ToastContext.jsx";
import { rutaProducto } from "../utils/slug.js";
import { urlAbsoluta } from "../constants/seo.js";

/**
 * Complemento de `frontend/src/utils/canonical.test.js` (Task 16).
 *
 * Ese archivo fija que `rutaProducto`/`urlAbsoluta` COMPONEN el string
 * correcto, pero no prueba que `ProductoDetalle` — el único lugar donde la
 * SPA realmente EMITE el canonical al `<head>` — lo esté usando.
 * `ProductoDetalle.jsx:106` es justo el camino que produce la invariante
 * central de toda esta feature ("canonical del crawler == canonical de la
 * SPA == entrada del sitemap"), y no tenía ninguna aserción automatizada —
 * solo verificado por lectura. `Coleccion` ya tiene la suya
 * (`paginas.seo.test.jsx`, "canoniza siempre a /coleccion limpio"); a esta
 * invariante le faltaba el espejo del lado de producto.
 *
 * Va en un archivo `.jsx` propio, co-localizado junto a `ProductoDetalle.jsx`
 * (mismo criterio que `ProductoDetalle.slug.test.jsx`), y no dentro de
 * `canonical.test.js`: ese archivo es `.js` sin JSX porque `vite:oxc` rechaza
 * JSX en `.js` (`[PARSE_ERROR] Unexpected JSX expression` al intentarlo), y
 * este test necesita renderizar el componente para leer el `<head>` real.
 *
 * El montaje (mock de `getProductById` + `ToastProvider` + `MemoryRouter`)
 * copia el patrón que ya resolvieron `paginas.seo.test.jsx` y
 * `ProductoDetalle.slug.test.jsx` para este mismo componente.
 */
const getProductByIdMock = vi.fn();

vi.mock("../api/products.js", () => ({
  getProductById: (...args) => getProductByIdMock(...args),
  registrarCompartido: vi.fn(),
  registrarFavorito: vi.fn(),
  registrarEvento: vi.fn(),
}));

const { default: ProductoDetalle } = await import("./ProductoDetalle.jsx");

const PRODUCTO = {
  id: 42,
  nombre: "Lámpara de diseño",
  precio: "45000.00",
  stock: 3,
  fotos: [],
  caracteristicas: [],
  beneficios: [],
  usos: [],
  idealPara: [],
  incluye: [],
  especificaciones: [],
  categoria: null,
  video: null,
};

function canonicalDelHead() {
  return document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
}

describe("ProductoDetalle emite el canonical calculado por rutaProducto", () => {
  beforeEach(() => {
    getProductByIdMock.mockReset();
    getProductByIdMock.mockResolvedValue(PRODUCTO);
  });

  it("el <link rel=canonical> del head coincide con urlAbsoluta(rutaProducto(producto))", async () => {
    render(
      <MemoryRouter initialEntries={["/producto/42-lampara-de-diseno"]}>
        <ToastProvider>
          <Routes>
            <Route path="/producto/:idSlug" element={<ProductoDetalle />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(canonicalDelHead()).toBe(urlAbsoluta(rutaProducto(PRODUCTO)));
    });
    expect(canonicalDelHead()).toBe("https://yima-productos.com/producto/42-lampara-de-diseno");
  });
});
