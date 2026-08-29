import { test, expect } from "@playwright/test";
import { crearProductoDeTest, borrarProductoDeTest } from "./helpers/db.js";

/**
 * Sprint 7, Task 2 — Escenario 3: producto agotado.
 *
 * Decisión de producto vigente: un producto sin stock (`stock: 0`) SE VE pero
 * NO SE PUEDE COMPRAR. El campo `disponibilidad` fue reemplazado por `stock`
 * (entero), así que "agotado" hoy significa `stock: 0`. Se prueban cuatro
 * cosas, por separado:
 *   1. Detalle: la ficha sigue siendo accesible (no 404 ni redirección), con
 *      el badge "Agotado" visible y el CTA de compra deshabilitado.
 *   2. Listado: el producto agotado NO ocupa lugar en la grilla pública de
 *      `/coleccion` — se lo excluye del listado (`construirFiltrosListado`),
 *      aunque su link directo siga abriendo.
 *   3. Backend: si alguien pega directo a `POST /api/ordenes` con ese producto
 *      en `items`, el backend lo rechaza (400) —
 *      `validarYSnapshotearProductos` en `ordenes.controller.js` chequea
 *      `stock <= 0` server side, sin depender de lo que haga el frontend.
 *      Esta es la defensa real; el CTA deshabilitado es solo UX.
 *   4. Carrito: un producto que se quedó sin stock DESPUÉS de haber sido
 *      agregado al carrito (el carrito vive en localStorage) no llega a
 *      pagarse — `Checkout.jsx` lo detecta al reconciliar contra el listado
 *      público y redirige a `/carrito`, que muestra el aviso por línea.
 */
test.describe("Producto agotado — visible pero no comprable", () => {
  let producto;

  test.beforeEach(async () => {
    producto = await crearProductoDeTest({
      nombre: "E2E-TEST-Producto Agotado",
      precio: "3200",
      stock: 0,
    });
  });

  test.afterEach(async () => {
    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
  });

  test("el detalle es accesible, muestra el badge Agotado y el CTA de compra queda deshabilitado", async ({
    page,
  }) => {
    await page.goto(`/producto/${producto.id}`);

    // La ficha abre de verdad: no redirige a la home ni devuelve 404.
    await expect(page).toHaveURL(new RegExp(`/producto/${producto.id}$`));
    await expect(page.getByRole("heading", { name: "E2E-TEST-Producto Agotado" })).toBeVisible();

    // El badge "Agotado" ahora SÍ es una señal pública.
    await expect(page.getByText("Agotado", { exact: true }).first()).toBeVisible();

    // El CTA existe pero está deshabilitado: se ve que el producto existe,
    // no se puede comprar. El ícono es un <span> de texto con el ligature de
    // Material Symbols (no aria-hidden), así que entra en el accessible name.
    const botonSinStock = page.getByRole("button", { name: /sin stock/i });
    await expect(botonSinStock).toBeVisible();
    await expect(botonSinStock).toBeDisabled();
  });

  test("el producto agotado no aparece en el listado público de /coleccion", async ({ page }) => {
    await page.goto("/coleccion");
    await page.getByPlaceholder(/buscar/i).fill("E2E-TEST-Producto Agotado");
    await expect(page).toHaveURL(/search=E2E-TEST-Producto/);

    // Excluido de la grilla pública: no ocupa un slot del listado.
    await expect(page.getByRole("link", { name: /E2E-TEST-Producto Agotado/i })).toHaveCount(0);
  });

  test("defensa en profundidad: POST /api/ordenes rechaza el producto agotado aunque se salte la UI", async ({
    request,
  }) => {
    const respuesta = await request.post("http://localhost:4000/api/ordenes", {
      data: {
        dni: "00999888", // dni sintético de test (no necesita limpieza: la request falla antes de escribir nada)
        nombre: "E2E-TEST-Cliente Defensa Backend",
        telefono: "1100000000",
        // El email es OBLIGATORIO desde la feature de notificaciones
        // (26/08/2026). Sin él la request moría en esa validación y este test
        // afirmaba sobre el mensaje equivocado — dejando el rechazo por stock,
        // que es lo que viene a cubrir, sin ninguna prueba real.
        email: "e2e-defensa@test.local",
        items: [{ productId: producto.id, cantidad: 1 }],
      },
    });

    expect(respuesta.status()).toBe(400);
    const body = await respuesta.json();
    expect(body.error).toContain("agotado");
  });

  test("un producto que se agotó estando en el carrito frena el checkout y avisa en /carrito", async ({
    page,
  }) => {
    // El carrito vive en localStorage: un producto agregado cuando todavía
    // había stock sigue ahí cuando se agota. `Checkout.jsx` reconcilia contra
    // el listado público en vivo — como un agotado ya no figura ahí, la línea
    // queda inválida, no hay nada que cobrar y se redirige a `/carrito`, que
    // es quien muestra el aviso puntual por línea (ver su doc comment).
    await page.goto("/");
    await page.evaluate(
      ([id]) => {
        localStorage.setItem("yumi-carrito", JSON.stringify([{ productId: id, cantidad: 1 }]));
      },
      [producto.id],
    );

    await page.goto("/checkout");

    // No se llega al formulario: la única línea del carrito quedó inválida.
    await expect(page).toHaveURL(/\/carrito$/);
    await expect(page.getByText(/ya no está disponible/i).first()).toBeVisible();
  });
});
