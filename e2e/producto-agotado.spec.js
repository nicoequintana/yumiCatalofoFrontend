import { test, expect } from "@playwright/test";
import { crearProductoDeTest, borrarProductoDeTest } from "./helpers/db.js";

/**
 * Sprint 7, Task 2 — Escenario 3: producto agotado.
 *
 * Actualizado tras una corrección de decisión de producto (post-Sprint 3):
 * todavía no existe un flujo real de gestión de stock, así que
 * `disponibilidad` dejó de ser una señal pública — ver el doc comment de
 * `Badge.jsx`. Ahora se prueban dos cosas, por separado:
 *   1. UI: el badge "Agotado" NO se ve en ningún lado público (detalle ni
 *      catálogo) y el CTA de agregar al carrito queda siempre habilitado,
 *      aunque el producto tenga `disponibilidad: "AGOTADO"`.
 *   2. Backend: aunque el público no vea nada distinto, si alguien pega
 *      directo a `POST /api/ordenes` con ese producto en `items`, el backend
 *      lo sigue rechazando (400) — `validarYSnapshotearProductos` en
 *      `ordenes.controller.js` chequea `disponibilidad === "AGOTADO"` server
 *      side, sin depender de lo que haga el frontend. Esta defensa NO se
 *      tocó.
 */
test.describe("Producto agotado — bloqueo en UI y defensa en el backend", () => {
  let producto;

  test.beforeEach(async () => {
    producto = await crearProductoDeTest({
      nombre: "E2E-TEST-Producto Agotado",
      precio: "3200.00",
      disponibilidad: "AGOTADO",
    });
  });

  test.afterEach(async () => {
    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
  });

  test("el detalle NO muestra el badge Agotado y el CTA de agregar al carrito sigue habilitado", async ({
    page,
  }) => {
    await page.goto(`/producto/${producto.id}`);
    await expect(page.getByRole("heading", { name: "E2E-TEST-Producto Agotado" })).toBeVisible();

    // Badge "Agotado" oculto por decisión de producto (Badge.jsx no-op).
    await expect(page.getByText("Agotado", { exact: true })).toHaveCount(0);

    // El CTA normal sigue presente y habilitado — no se reemplaza por "No
    // disponible" (BotonAgregarCarrito.jsx, gate desactivado a propósito).
    const botonAgregar = page.getByRole("button", { name: /^Agregar al carrito$/i });
    await expect(botonAgregar).toBeVisible();
    await expect(botonAgregar).toBeEnabled();
    await expect(page.getByRole("button", { name: "No disponible" })).toHaveCount(0);
    await expect(page.getByText("Este producto está agotado.")).toHaveCount(0);
  });

  test("el catálogo tampoco muestra el badge Agotado en la card del producto", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/buscar/i).fill("E2E-TEST-Producto Agotado");
    await expect(page).toHaveURL(/search=E2E-TEST-Producto/);

    const card = page.getByRole("link", { name: /E2E-TEST-Producto Agotado/i });
    await expect(card).toBeVisible();
    await expect(card.getByText("Agotado", { exact: true })).toHaveCount(0);
  });

  test("defensa en profundidad: POST /api/ordenes rechaza el producto agotado aunque se salte la UI", async ({
    request,
  }) => {
    const respuesta = await request.post("http://localhost:4000/api/ordenes", {
      data: {
        dni: "00999888", // dni sintético de test (no necesita limpieza: la request falla antes de escribir nada)
        nombre: "E2E-TEST-Cliente Defensa Backend",
        telefono: "1100000000",
        items: [{ productId: producto.id, cantidad: 1 }],
      },
    });

    expect(respuesta.status()).toBe(400);
    const body = await respuesta.json();
    expect(body.error).toContain("agotado");
  });
});
