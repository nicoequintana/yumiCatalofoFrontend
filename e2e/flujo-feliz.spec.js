import { test, expect } from "@playwright/test";
import {
  crearProductoDeTest,
  borrarProductoDeTest,
  borrarOrdenDeTest,
  crearDniDeTest,
  prisma,
} from "./helpers/db.js";

const NOMBRE_CLIENTE_TEST = "E2E-TEST-Cliente Playwright";

/**
 * Sprint 7, Task 1 — Escenario 1: flujo feliz completo de guest checkout.
 *
 * Catálogo -> detalle -> agregar al carrito con cantidad -> /carrito ->
 * editar cantidad -> /checkout -> completar datos -> confirmar ->
 * confirmación -> verificar la orden creada directamente en la DB (Prisma,
 * no HTTP: más simple y no depende de que exista una segunda pantalla que
 * muestre el detalle de la orden al cliente).
 *
 * Requiere el backend real corriendo aparte (ver playwright.config.js y
 * e2e/README.md) contra la base de datos de desarrollo real — no hay mocks
 * ni base de datos de test separada.
 */

test.describe("Flujo feliz — checkout de invitado", () => {
  let producto;
  let dniTest;

  test.beforeEach(async ({ page }) => {
    producto = await crearProductoDeTest({
      nombre: "E2E-TEST-Producto Flujo Feliz",
      precio: "2500",
    });
    // Generado ANTES del checkout (no recién al leer la orden de vuelta),
    // así el cleanup de abajo puede encontrar al cliente/orden por este dni
    // aunque el test falle a mitad de camino, entre el submit y la lectura
    // final de la DB — sin esto, una falla ahí dejaría el Cliente/Orden
    // huérfanos hasta el próximo `limpiarTodoRastroDeTest()`.
    dniTest = crearDniDeTest();

    // Carrito vive en localStorage — arrancar cada test sin residuo de una
    // corrida anterior en el mismo browser/contexto.
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("yumi-carrito"));
  });

  test.afterEach(async () => {
    // Busca por dni en vez de depender de una variable seteada a mitad del
    // test: así el cleanup corre igual aunque la aserción que hubiera
    // guardado el id explícitamente nunca se llegue a ejecutar.
    const clienteEnDb = await prisma.cliente.findUnique({ where: { dni: dniTest } }).catch(() => null);
    if (clienteEnDb) {
      const ordenEnDb = await prisma.orden.findFirst({ where: { clienteId: clienteEnDb.id } }).catch(() => null);
      if (ordenEnDb) {
        await borrarOrdenDeTest(ordenEnDb.id, clienteEnDb.id);
      } else {
        await prisma.cliente.delete({ where: { id: clienteEnDb.id } }).catch(() => {});
      }
    }

    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
  });

  test("catálogo -> detalle -> carrito -> checkout -> confirmación, con orden verificada en DB", async ({
    page,
  }) => {
    // 1. Colección: buscar el producto de test por nombre (search es texto
    // libre contra `nombre`, ver Coleccion.jsx/FiltrosCatalogo.jsx) y navegar
    // a su detalle. Usar el buscador evita depender de en qué posición del
    // grid cae la card entre productos reales de dev.
    await page.goto("/coleccion");
    await page
      .getByPlaceholder(/buscar/i)
      .fill("E2E-TEST-Producto Flujo Feliz");

    // El input de búsqueda debouncea 350ms antes de escribir a la URL (ver
    // Coleccion.jsx's DEBOUNCE_SEARCH_MS) y recién ahí dispara el refetch que
    // vuelve a renderizar el grid de resultados. Esperar a que la URL refleje
    // el filtro evita clickear el link justo en medio de ese re-render (el
    // nodo del link puede desmontarse/remontarse al llegar la respuesta).
    await expect(page).toHaveURL(/search=E2E-TEST-Producto/);

    const linkProducto = page.getByRole("link", { name: /E2E-TEST-Producto Flujo Feliz/i });
    await expect(linkProducto).toBeVisible();
    await linkProducto.click();

    await expect(page).toHaveURL(new RegExp(`/producto/${producto.id}$`));
    await expect(page.getByRole("heading", { name: "E2E-TEST-Producto Flujo Feliz" })).toBeVisible();

    // 2. Detalle: subir la cantidad a 2 con el SelectorCantidad y agregar al
    // carrito.
    await page.getByRole("button", { name: "Aumentar cantidad" }).click();
    await page.getByRole("button", { name: /agregar al carrito/i }).click();
    await expect(page.getByRole("button", { name: /agregado/i })).toBeVisible();

    // 3. /carrito: la línea aparece con cantidad 2 y precio correcto.
    await page.goto("/carrito");
    const linea = page.getByRole("listitem").filter({ hasText: "E2E-TEST-Producto Flujo Feliz" });
    await expect(linea).toBeVisible();
    await expect(linea.getByText("$ 2.500")).toBeVisible(); // precio unitario
    await expect(linea.getByText("$ 5.000")).toBeVisible(); // subtotal (2 x 2500)

    const totalAntes = page.getByTestId("carrito-total");
    await expect(totalAntes).toHaveText("$ 5.000");

    // Editar la cantidad a 3 vía SelectorCantidad y verificar que el total
    // se actualiza (2500 x 3 = 7500).
    await linea.getByRole("button", { name: "Aumentar cantidad" }).click();
    await expect(linea.getByText("$ 7.500")).toBeVisible();
    await expect(page.getByTestId("carrito-total")).toHaveText("$ 7.500");

    // 4. CTA "Confirmar pedido" — debe ser un <Link> real y habilitado (no
    // aria-disabled), ver Carrito.jsx. Un carrito sano con un único producto
    // válido nunca cae en la rama <button disabled>.
    const ctaConfirmar = page.getByRole("link", { name: "Confirmar pedido" });
    await expect(ctaConfirmar).toBeVisible();
    await ctaConfirmar.click();

    await expect(page).toHaveURL(/\/checkout$/);

    // 5. Completar el formulario de checkout con datos marcados como test.
    await page.getByLabel("DNI").fill(dniTest);
    await page.getByLabel("Nombre").fill(NOMBRE_CLIENTE_TEST);
    await page.getByLabel("Teléfono").fill("1122334455");
    await page.getByLabel("Email").fill("flujo-feliz-e2e@example.com");

    // 6. Submit — un solo click. El botón se deshabilita mientras está en
    // vuelo (`enviando`), así que un segundo click deliberado sería un no-op
    // por el propio `disabled`; no hace falta (ni conviene) simular un
    // double-click acá, alcanza con esperar la navegación resultante.
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    // 7. Confirmación.
    await expect(page).toHaveURL(/\/checkout\/confirmacion$/);
    await expect(page.getByText("¡Pedido confirmado!")).toBeVisible();
    await expect(page.getByText(/Orden #\d+ recibida/)).toBeVisible();
    await expect(page.getByText(/3 × E2E-TEST-Producto Flujo Feliz/)).toBeVisible();

    // 8. Verificación directa en la DB — no tautológica: se relee la orden
    // recién creada desde Prisma (no desde lo que la UI acaba de mostrar) y
    // se comparan sus campos contra los valores esperados de punta a punta.
    const clienteEnDb = await prisma.cliente.findUnique({ where: { dni: dniTest } });
    expect(clienteEnDb).not.toBeNull();
    expect(clienteEnDb.nombre).toBe(NOMBRE_CLIENTE_TEST);
    expect(clienteEnDb.telefono).toBe("1122334455");

    const ordenEnDb = await prisma.orden.findFirst({
      where: { clienteId: clienteEnDb.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    expect(ordenEnDb).not.toBeNull();

    expect(ordenEnDb.items).toHaveLength(1);
    const item = ordenEnDb.items[0];
    expect(item.productId).toBe(producto.id);
    expect(item.nombreProducto).toBe("E2E-TEST-Producto Flujo Feliz");
    // Se compara numéricamente y no como string exacto: la columna es
    // `Decimal(10, 0)`, pero cómo el driver mssql serializa ese Decimal a
    // string no es una garantía del proyecto. Lo que importa para la
    // integridad del snapshot es el VALOR.
    expect(parseFloat(item.precioUnitario.toString())).toBe(2500);
    expect(item.cantidad).toBe(3);
  });
});
