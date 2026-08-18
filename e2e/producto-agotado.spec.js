import { test, expect } from "@playwright/test";
import { crearProductoDeTest, borrarProductoDeTest } from "./helpers/db.js";

/**
 * Sprint 7, Task 2 — Escenario 3: producto agotado.
 *
 * Actualizado tras una corrección de decisión de producto (post-Sprint 3):
 * todavía no existe un flujo real de gestión de stock, así que
 * `disponibilidad` dejó de ser una señal pública — ver el doc comment de
 * `Badge.jsx`. Ahora se prueban tres cosas, por separado:
 *   1. UI: el badge "Agotado" NO se ve en ningún lado público (detalle ni
 *      catálogo) y el CTA de agregar al carrito queda siempre habilitado,
 *      aunque el producto tenga `disponibilidad: "AGOTADO"`.
 *   2. UI, carrito/checkout: el mismo gate se extiende a `Carrito.jsx` y
 *      `Checkout.jsx` (ver sus doc comments) — un producto AGOTADO se puede
 *      agregar, ver en el carrito y llegar hasta el submit de checkout sin
 *      ningún aviso ni bloqueo distinto de un producto disponible.
 *   3. Backend: aunque el público no vea nada distinto, si alguien pega
 *      directo a `POST /api/ordenes` con ese producto en `items` (o llega
 *      hasta ahí vía la UI, ver test de abajo), el backend lo sigue
 *      rechazando (400) — `validarYSnapshotearProductos` en
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
    // Nombre accesible real: "shopping_cart Agregar al carrito" (el ícono es
    // un <span> de texto con el nombre del ligature de Material Symbols, no
    // aria-hidden, así que entra en el accessible name) — por eso sin ancla
    // `^...$` exacta, que nunca matcheó contra el markup real.
    const botonAgregar = page.getByRole("button", { name: /agregar al carrito/i });
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

  test("se puede agregar al carrito y llegar a checkout sin aviso, y el backend rechaza al confirmar", async ({
    page,
  }) => {
    // Prueba end-to-end de la UI la corrección de esta task: el carrito y el
    // checkout ya no tratan AGOTADO como "no disponible" (ver doc comments
    // de Carrito.jsx/Checkout.jsx). El backend sigue siendo quien rechaza.
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("yumi-carrito"));

    await page.goto(`/producto/${producto.id}`);
    await page.getByRole("button", { name: /agregar al carrito/i }).click();
    await expect(page.getByRole("button", { name: /agregado/i })).toBeVisible();

    // Carrito: sin aviso de "no disponible", CTA habilitado como Link real.
    await page.goto("/carrito");
    const linea = page.getByRole("listitem").filter({ hasText: "E2E-TEST-Producto Agotado" });
    await expect(linea).toBeVisible();
    await expect(page.getByText(/ya no está disponible/i)).toHaveCount(0);
    const ctaConfirmar = page.getByRole("link", { name: "Confirmar pedido" });
    await expect(ctaConfirmar).toBeVisible();
    await ctaConfirmar.click();

    // Checkout: llega al formulario sin redirección ni banner de aviso.
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByText(/ya no están disponibles/i)).toHaveCount(0);

    await page.getByLabel("DNI").fill("00999777");
    await page.getByLabel("Nombre").fill("E2E-TEST-Cliente Agotado Checkout");
    await page.getByLabel("Teléfono").fill("1122334455");
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    // El backend rechaza al confirmar — se muestra como error de envío, sin
    // navegar a la confirmación.
    await expect(page.getByRole("alert")).toContainText(/agotado/i);
    await expect(page).toHaveURL(/\/checkout$/);
  });
});
