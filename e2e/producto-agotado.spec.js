import { test, expect } from "@playwright/test";
import { crearProductoDeTest, borrarProductoDeTest } from "./helpers/db.js";

/**
 * Sprint 7, Task 2 — Escenario 3: producto agotado.
 *
 * Dos capas de defensa, probadas por separado:
 *   1. UI: el badge "Agotado" se ve (detalle) y el CTA de agregar al carrito
 *      queda deshabilitado (`BotonAgregarCarrito.jsx`'s rama `agotado`).
 *   2. Backend: aunque alguien se salte la UI y pegue directo a
 *      `POST /api/ordenes` con ese producto en `items`, el backend lo
 *      rechaza igual (400) — `validarYSnapshotearProductos` en
 *      `ordenes.controller.js` chequea `disponibilidad === "AGOTADO"` server
 *      side, no confía en que el frontend haya bloqueado el submit.
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

  test("el detalle muestra el badge Agotado y deshabilita agregar al carrito", async ({ page }) => {
    await page.goto(`/producto/${producto.id}`);
    await expect(page.getByRole("heading", { name: "E2E-TEST-Producto Agotado" })).toBeVisible();

    // Badge "Agotado" visible en el panel de detalle (Badge.jsx, rama
    // disponibilidad === "AGOTADO").
    await expect(page.getByText("Agotado", { exact: true })).toBeVisible();

    // El CTA queda reemplazado por el botón deshabilitado "No disponible"
    // (BotonAgregarCarrito.jsx), no el flujo normal de cantidad + agregar.
    const botonNoDisponible = page.getByRole("button", { name: "No disponible" });
    await expect(botonNoDisponible).toBeVisible();
    await expect(botonNoDisponible).toBeDisabled();
    await expect(page.getByText("Este producto está agotado.")).toBeVisible();

    // El botón normal de "Agregar al carrito" no debe existir en absoluto en
    // este estado (no solo estar deshabilitado bajo otro nombre).
    await expect(page.getByRole("button", { name: /^Agregar al carrito$/i })).toHaveCount(0);
  });

  test("el catálogo también muestra el badge Agotado en la card del producto", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/buscar/i).fill("E2E-TEST-Producto Agotado");
    await expect(page).toHaveURL(/search=E2E-TEST-Producto/);

    const card = page.getByRole("link", { name: /E2E-TEST-Producto Agotado/i });
    await expect(card).toBeVisible();
    await expect(card.getByText("Agotado", { exact: true })).toBeVisible();
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
