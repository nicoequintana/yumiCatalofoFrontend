import { test, expect } from "@playwright/test";
import {
  crearProductoDeTest,
  borrarProductoDeTest,
  borrarOrdenDeTest,
  crearOrdenDeTest,
  crearUsuarioAdminDeTest,
  borrarUsuarioAdminDeTest,
  prisma,
} from "./helpers/db.js";

/**
 * El tablero Kanban de órdenes: arrastrar una tarjeta de una columna a otra.
 *
 * **Este spec existe porque el arrastre NO se puede testear en Vitest.** jsdom
 * no implementa `PointerEvent` ni `setPointerCapture`, así que el
 * `PointerSensor` de dnd-kit ni siquiera arranca; y aunque el `KeyboardSensor`
 * sí recibe los eventos, dnd-kit mide los droppables con
 * `getBoundingClientRect`, que en jsdom devuelve todo cero — la detección de
 * colisión resuelve degeneradamente y un test así pasaría o fallaría por
 * motivos ajenos al código. Los tests unitarios cubren la decisión
 * (`dragOrdenes.test.js`) y el camino drop → diálogo → PATCH a través de un
 * stub del tablero. El GESTO se cubre solo acá.
 *
 * ⚠️ **Todo va en UN solo test con `test.step`, y eso no es pereza: el login
 * tiene rate limit de 8 intentos cada 15 minutos por IP.** Con un login por
 * test, este spec solo agotaría casi la mitad del cupo y haría fallar a los
 * demás specs de la corrida — pasó, y el que se cayó primero fue
 * `admin-cambio-estado`, que ni siquiera es parte de esta feature. Mismo
 * criterio ya documentado en `admin-mobile.spec.js`. El costo asumido es que
 * un paso que falla tapa a los que siguen.
 *
 * Los pasos van de menos a más invasivo: los primeros no mutan la orden, y los
 * últimos la mueven PENDIENTE → EN_PREPARACION → ENTREGADA, verificando la base
 * en cada salto.
 */
test.describe("Tablero de órdenes", () => {
  let producto;
  let orden;
  let usuarioAdmin;

  test.beforeEach(async () => {
    producto = await crearProductoDeTest({
      nombre: "E2E-TEST-Producto Tablero",
      precio: "4500",
    });

    orden = await crearOrdenDeTest({
      estado: "PENDIENTE",
      items: [
        {
          productId: producto.id,
          nombreProducto: producto.nombre,
          precioUnitario: producto.precio.toString(),
          cantidad: 1,
        },
      ],
    });

    usuarioAdmin = await crearUsuarioAdminDeTest();
  });

  test.afterEach(async () => {
    if (orden?.id) await borrarOrdenDeTest(orden.id, orden.clienteId);
    if (producto?.id) await borrarProductoDeTest(producto.id);
    if (usuarioAdmin?.id) await borrarUsuarioAdminDeTest(usuarioAdmin.id);
  });

  /** La columna de un estado, por su nombre accesible. */
  function columna(page, etiqueta) {
    return page.getByRole("region", { name: new RegExp(`^${etiqueta}:`) });
  }

  /** La tarjeta de la orden sembrada. Es el área de arrastre entera: no hay manijón. */
  function tarjetaDe(page) {
    return page.locator(`[data-tarjeta-orden]:has-text("#${orden.id}")`).first();
  }

  /**
   * Arrastra la tarjeta hasta una zona de destino.
   *
   * ⚠️ `page.dragAndDrop` falla seguido contra dnd-kit: manda un solo
   * movimiento y no supera la `activationConstraint` de 8 px del PointerSensor.
   * Hay que mover el mouse en pasos y pasar el umbral en el primer tramo.
   */
  /**
   * Confirma el diálogo y espera a que el PATCH realmente haya terminado.
   *
   * ⚠️ **No alcanza con ver la tarjeta en la columna destino.** Con el diálogo
   * abierto la tarjeta YA se dibuja ahí (`previsualizarMovimiento`), así que esa
   * aserción pasa de inmediato, antes de que el PATCH responda — y leer la base
   * en ese momento devuelve el estado VIEJO. La señal de que el movimiento se
   * escribió es que el diálogo se cerró: eso ocurre recién en el `then` del
   * PATCH.
   */
  async function confirmarSinNotificar(page) {
    await page.getByRole("button", { name: "Guardar sin notificar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }

  async function arrastrarA(page, destino) {
    const origen = await tarjetaDe(page).boundingBox();
    const caja = await destino.boundingBox();

    await page.mouse.move(origen.x + origen.width / 2, origen.y + 16);
    await page.mouse.down();
    await page.mouse.move(origen.x + 60, origen.y + 30, { steps: 5 });
    await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2, { steps: 15 });
    await page.mouse.up();
  }

  test("resumen, previsualización, arrastre con mouse y camino de teclado", async ({ page }) => {
    await test.step("login real por el formulario", async () => {
      await page.goto("/catalogo/admin/login");
      await page.getByLabel("Email").fill(usuarioAdmin.email);
      // `exact: true` por el botón "Mostrar contraseña" del ojito, cuyo nombre
      // accesible también contiene "contraseña".
      await page.getByLabel("Contraseña", { exact: true }).fill(usuarioAdmin.password);
      await page.getByRole("button", { name: "Ingresar" }).click();
      await expect(page).toHaveURL(/\/catalogo\/admin\/productos$/);

      await page.goto("/catalogo/admin/ordenes");
      await expect(columna(page, "Pendiente").locator(`text=#${orden.id}`)).toBeVisible();
    });

    await test.step("el resumen abre solo al tocar su botón, y Escape devuelve el foco", async () => {
      const boton = page.getByRole("button", {
        name: new RegExp(`productos de la orden #${orden.id}`),
      });

      // Pasar el mouse por encima NO tiene que abrir nada: la apertura por
      // hover se sacó porque tapaba las tarjetas de al lado y competía con el
      // gesto de arrastre, que empieza en el mismo lugar.
      await tarjetaDe(page).hover();
      await expect(boton).toHaveAttribute("aria-expanded", "false");

      await boton.click();
      await expect(boton).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByText(producto.nombre)).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(boton).toHaveAttribute("aria-expanded", "false");
      await expect(boton).toBeFocused();
    });

    await test.step("con el modal abierto la tarjeta YA está en la columna destino", async () => {
      await arrastrarA(page, columna(page, "Cancelada"));
      await expect(page.getByRole("dialog")).toBeVisible();

      // Sin esta previsualización se la ve VOLVER a su columna original detrás
      // del modal — el gesto contrario al que se acaba de hacer.
      await expect(columna(page, "Cancelada").locator(`text=#${orden.id}`)).toBeVisible();

      await page.getByRole("button", { name: "Cancelar" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      // Y al cancelar vuelve sola: la previsualización es derivada, no estado.
      await expect(columna(page, "Pendiente").locator(`text=#${orden.id}`)).toBeVisible();

      const enDb = await prisma.orden.findUnique({ where: { id: orden.id } });
      expect(enDb.estado).toBe("PENDIENTE");
    });

    await test.step('el enlace "Ver" sigue funcionando pese al arrastre', async () => {
      // La tarjeta ENTERA es el área de arrastre y contiene este enlace: lo
      // único que hace que el click llegue es la `activationConstraint` de 8 px
      // del PointerSensor. Sin ella, este paso se cae.
      await page.getByRole("link", { name: `Ver la orden #${orden.id}` }).click();
      await expect(page.getByRole("heading", { name: `Orden #${orden.id}` })).toBeVisible();

      await page.goto("/catalogo/admin/ordenes");
      await expect(tarjetaDe(page)).toBeVisible();
    });

    await test.step("arrastrar con el mouse mueve la orden y lo persiste", async () => {
      await arrastrarA(page, columna(page, "En preparación"));

      // Soltar NO confirma: abre el diálogo de notificación de siempre.
      await expect(page.getByRole("dialog")).toBeVisible();
      await confirmarSinNotificar(page);

      await expect(columna(page, "En preparación").locator(`text=#${orden.id}`)).toBeVisible();
      await expect(columna(page, "Pendiente").locator(`text=#${orden.id}`)).toHaveCount(0);

      // Verificación directa en la base, no tautológica contra la UI.
      const enDb = await prisma.orden.findUnique({ where: { id: orden.id } });
      expect(enDb.estado).toBe("EN_PREPARACION");
    });

    await test.step("el camino de teclado mueve la orden sin tocar el mouse", async () => {
      // Es literalmente la razón por la que se aceptó `@dnd-kit/core`. Si esto
      // se cae, el tablero quedó por debajo del estándar de accesibilidad del
      // resto del panel. Ojo: NO funciona con el `coordinateGetter` por defecto
      // del KeyboardSensor, que mueve de a 25 px — ver `coordenadasPorColumna`.
      const tarjeta = tarjetaDe(page);
      await tarjeta.focus();
      await expect(tarjeta).toBeFocused();

      await page.keyboard.press("Space"); // levantar

      // ⚠️ Hay que ESPERAR a que dnd-kit termine de levantar antes de mandar la
      // flecha. Levantar no es sincrónico, y una flecha que llega antes se
      // procesa como si no hubiera arrastre: el Space final termina soltando
      // sobre la MISMA columna y no pasa nada, sin error. Es una carrera del
      // test, no del código — y es intermitente, que es peor.
      //
      // La señal es el clon del `DragOverlay`, que existe SOLO mientras dura
      // el gesto. El anuncio del `aria-live` no sirve: conserva el texto del
      // arrastre anterior, así que una espera sobre él pasa de inmediato sin
      // esperar nada.
      await expect(page.locator('[data-tarjeta-orden][aria-hidden="true"]')).toBeAttached();

      await page.keyboard.press("ArrowRight"); // a la columna de al lado
      await page.keyboard.press("Space"); // soltar

      await expect(page.getByRole("dialog")).toBeVisible();
      await confirmarSinNotificar(page);

      await expect(columna(page, "Entregada").locator(`text=#${orden.id}`)).toBeVisible();

      const enDb = await prisma.orden.findUnique({ where: { id: orden.id } });
      expect(enDb.estado).toBe("ENTREGADA");
    });
  });
});
