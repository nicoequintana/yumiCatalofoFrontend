import { test, expect } from "@playwright/test";
import {
  crearProductoDeTest,
  borrarProductoDeTest,
  borrarOrdenDeTest,
  crearCuentaClienteDeTest,
  borrarCuentaClienteDeTest,
  iniciarSesionCliente,
  prisma,
} from "./helpers/db.js";
import { neutralizarContextoComercial } from "./helpers/contextoComercial.js";

const NOMBRE_CLIENTE_TEST = "E2E-TEST-Cliente Playwright";

/**
 * Flujo feliz de checkout AUTENTICADO (reescrito en la Parte 5 de cuentas de
 * cliente — antes probaba el checkout de invitado; `/checkout` pasó a vivir
 * bajo `RequireAuthCliente`, que es INCONDICIONAL: no mira ningún flag, así
 * que un comprador sin sesión nunca ve el formulario, con o sin
 * `CHECKOUT_REQUIERE_CUENTA`).
 *
 * Catálogo -> detalle -> agregar al carrito con cantidad -> /carrito ->
 * editar cantidad -> /checkout (redirige a login) -> login -> vuelve a
 * /checkout con el carrito intacto -> confirmar (ya NO pide email, sale de
 * la cuenta) -> confirmación -> verificar la orden en la DB, con
 * `cuentaClienteId` puesto.
 *
 * Requiere el backend real corriendo aparte (ver playwright.config.js y
 * e2e/README.md) contra la base de datos de desarrollo real — no hay mocks
 * ni base de datos de test separada.
 */
test.describe("Flujo feliz — checkout autenticado", () => {
  // El modal de campaña es `fixed inset-0` e intercepta el primer click de
  // cualquier página. Se neutraliza el contexto comercial para que estos
  // specs no dependan de si hay una campaña prendida en la base de dev.
  test.beforeEach(async ({ page }) => {
    await neutralizarContextoComercial(page);
  });

  let producto;
  let cuentaInfo;

  test.beforeEach(async ({ page }) => {
    producto = await crearProductoDeTest({
      nombre: "E2E-TEST-Producto Flujo Feliz",
      precio: "2500",
    });
    cuentaInfo = await crearCuentaClienteDeTest({
      nombre: NOMBRE_CLIENTE_TEST,
      telefono: "1122334455",
    });

    // Carrito vive en localStorage — arrancar cada test sin residuo de una
    // corrida anterior en el mismo browser/contexto.
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("yumi-carrito"));
  });

  test.afterEach(async () => {
    const ordenEnDb = await prisma.orden
      .findFirst({ where: { cuentaClienteId: cuentaInfo.cuenta.id } })
      .catch(() => null);
    if (ordenEnDb) {
      await borrarOrdenDeTest(ordenEnDb.id, ordenEnDb.clienteId ?? undefined);
    }
    await borrarCuentaClienteDeTest(cuentaInfo.cuenta.id);
    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
  });

  test("catálogo -> detalle -> carrito -> login -> checkout -> confirmación, orden con cuenta verificada en DB", async ({
    page,
  }) => {
    await test.step("agregar el producto al carrito desde el catálogo", async () => {
      await page.goto("/coleccion");
      // El buscador del header (`BuscadorSugerencias`, ≥lg) también matchea
      // /buscar/i por placeholder y accessible name ("Buscar en el
      // catálogo"): el nombre EXACTO distingue el campo de `FiltrosCatalogo`
      // ("Buscar" a secas, ver `docs/reglas/catalogo-publico.md`).
      await page
        .getByRole("textbox", { name: "Buscar", exact: true })
        .fill("E2E-TEST-Producto Flujo Feliz");
      // El input de búsqueda debouncea 350ms antes de escribir a la URL y
      // recién ahí dispara el refetch — esperar a que la URL refleje el
      // filtro evita clickear el link justo en medio de ese re-render.
      await expect(page).toHaveURL(/search=E2E-TEST-Producto/);

      const linkProducto = page.getByRole("link", { name: /E2E-TEST-Producto Flujo Feliz/i });
      await expect(linkProducto).toBeVisible();
      await linkProducto.click();

      // `(-|$)`: las URLs de producto son `/producto/{id}-{slug}`. El `$`
      // anclado al id importa: sin él, `/producto/52` matchearía también
      // `/producto/5289`.
      await expect(page).toHaveURL(new RegExp(`/producto/${producto.id}(-|$)`));
      await page.getByRole("button", { name: "Aumentar cantidad" }).click();
      await page.getByRole("button", { name: /agregar al carrito/i }).click();
      await expect(page.getByRole("button", { name: /agregado/i })).toBeVisible();

      await page.goto("/carrito");
      const linea = page.getByRole("listitem").filter({ hasText: "E2E-TEST-Producto Flujo Feliz" });
      await expect(linea).toBeVisible();
      await linea.getByRole("button", { name: "Aumentar cantidad" }).click();
      await expect(page.getByTestId("carrito-total")).toHaveText("$ 7.500"); // 2500 x 3

      await page.getByRole("link", { name: "Continuar" }).click();
    });

    await test.step("sin sesión, /checkout redirige a /cuenta/entrar con volverA", async () => {
      // Este es el comportamiento NUEVO que ningún otro spec afirma
      // explícitamente: el guard es incondicional, así que llegar a
      // /checkout sin sesión SIEMPRE cae acá, nunca al formulario.
      await expect(page).toHaveURL(`/cuenta/entrar?volverA=${encodeURIComponent("/checkout")}`);
    });

    await test.step("login -> vuelve a /checkout con el carrito intacto", async () => {
      await iniciarSesionCliente(page, {
        email: cuentaInfo.cuenta.email,
        password: cuentaInfo.password,
        tokenDispositivo: cuentaInfo.tokenDispositivo,
      });
      // `iniciarSesionCliente` navega de entrada a `/cuenta/entrar` PELADO
      // (sin el `volverA` que el guard había puesto en la URL), así que el
      // login exitoso cae en el destino por defecto de Entrar.jsx (`/cuenta`),
      // no de vuelta en `/checkout`. Se vuelve a navegar a mano: el carrito
      // sigue en localStorage y el login no lo toca.
      await page.goto("/checkout");
      await expect(page).toHaveURL(/\/checkout$/);
      await expect(page.getByText(/E2E-TEST-Producto Flujo Feliz/)).toBeVisible();
    });

    await test.step("el formulario ya NO pide email (viene de la cuenta) y confirma el pedido", async () => {
      await expect(page.getByLabel("Email")).toHaveCount(0);
      await expect(page.getByText(cuentaInfo.cuenta.email)).toBeVisible();

      await page.getByRole("button", { name: "Confirmar pedido" }).click();

      await expect(page).toHaveURL(/\/checkout\/confirmacion$/);
      await expect(page.getByText("¡Pedido confirmado!")).toBeVisible();
      await expect(page.getByText(/Orden #\d+ recibida/)).toBeVisible();
      await expect(page.getByText(/3 × E2E-TEST-Producto Flujo Feliz/)).toBeVisible();
    });

    await test.step("verificación directa en la DB: la orden tiene cuentaClienteId, y el contacto es el de la cuenta", async () => {
      const ordenEnDb = await prisma.orden.findFirst({
        where: { cuentaClienteId: cuentaInfo.cuenta.id },
        include: { items: true, cliente: true },
        orderBy: { createdAt: "desc" },
      });
      expect(ordenEnDb).not.toBeNull();
      expect(ordenEnDb.cuentaClienteId).toBe(cuentaInfo.cuenta.id);

      expect(ordenEnDb.items).toHaveLength(1);
      const item = ordenEnDb.items[0];
      expect(item.productId).toBe(producto.id);
      // Se compara numéricamente y no como string exacto: la columna es
      // `Decimal(10, 0)`, y cómo el driver mssql serializa ese Decimal a
      // string no es una garantía del proyecto. Lo que importa acá es el
      // VALOR.
      expect(parseFloat(item.precioUnitario.toString())).toBe(2500);
      expect(item.cantidad).toBe(3);
    });
  });
});
