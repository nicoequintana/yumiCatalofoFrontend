import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminSaludCatalogo from "./AdminSaludCatalogo.jsx";
import * as productsApi from "../../api/products.js";

vi.mock("../../api/products.js");

/**
 * Guard del ÁREA TÁCTIL de los links de acción de "Salud del catálogo".
 *
 * Medido en navegador el 07/09/2026 con `elementFromPoint` (área EFECTIVA, no
 * la caja declarada): «Marcar destacados» 93×29 a 390 y 93×30 a 1280, «Ver los
 * que menos fotos tienen» 93×30 y 93×29 — el ancho ya sobra (la caja declarada
 * es de 182 y 274), lo que falta es el ALTO contra el mínimo de 44×44
 * (WCAG 2.5.8).
 *
 * Son píldoras de texto en una lista densa: agrandar la caja empujaría cada
 * fila del chequeo, así que el área se extiende con el pseudo-elemento de
 * `utils/areaTactil.js` y el tamaño visible se queda como está. Los vecinos
 * están lejos —el número de la izquierda a `gap-4`, la fila de abajo a un
 * `py-4` de por medio—, así que no hay áreas que se pisen.
 *
 * jsdom no calcula layout: se afirma sobre las CLASES declaradas.
 */

const SALUD = {
  total: 80,
  publicados: 60,
  destacadosPublicados: 1,
  publicadosSinVistas: 4,
  publicadosSinFotos: 2,
  menosDeDosFotos: 7,
  sinCategoria: 3,
  agotadosConVistas: 1,
  agotados: 5,
  ocultos: 6,
  sinCosto: 8,
};

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/productos/salud"]}>
      <AdminSaludCatalogo />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  productsApi.getSaludCatalogo.mockResolvedValue(SALUD);
});

describe("AdminSaludCatalogo — área táctil", () => {
  it.each([["Marcar destacados"], ["Ver los que menos fotos tienen"]])(
    "«%s» extiende su área a 44 de alto sin crecer de tamaño visible",
    async (nombre) => {
      renderPagina();

      const [link] = await screen.findAllByRole("link", { name: nombre });

      expect(link.className).toContain("relative");
      expect(link.className).toContain("before:content-['']");
      expect(link.className).toContain("before:h-11");
      // Ancho propio: la píldora ya sobra de ancho y así no invade al número
      // que tiene al lado.
      expect(link.className).toContain("before:w-full");
      // El tamaño visible es el de siempre.
      expect(link.className).toContain("py-1.5");
    },
  );
});
