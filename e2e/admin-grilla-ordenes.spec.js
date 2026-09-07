import { test, expect } from "@playwright/test";
import {
  crearProductoDeTest,
  borrarProductoDeTest,
  crearClienteDeTest,
  crearOrdenDeTest,
  borrarOrdenDeTest,
  crearUsuarioAdminDeTest,
  borrarUsuarioAdminDeTest,
  prisma,
} from "./helpers/db.js";

/**
 * `/catalogo/admin/ordenes` — la GRILLA paginada de órdenes, en navegador real.
 *
 * Reemplaza a `admin-tablero-ordenes.spec.js`, que probaba el tablero Kanban que
 * esta pantalla dejó de ser (07/09/2026). Aquel spec existía por el GESTO de
 * arrastre, que jsdom no puede simular; acá no hay gesto, así que lo que
 * justifica un E2E es otra cosa: el camino completo **UI → HTTP → base**, la
 * animación de despliegue del resumen (que jsdom tampoco corre) y el guard del
 * monto de la fila después del PATCH, que es un bug de contrato entre dos formas
 * de respuesta distintas y no una decisión de render.
 *
 * ⚠️ **Todo va en UN solo test con `test.step`, y eso no es pereza: el login
 * tiene rate limit de 8 intentos cada 15 minutos por IP.** Con un login por
 * test, este spec solo agotaría casi la mitad del cupo de la corrida y haría
 * fallar a los demás — ya pasó con el spec del tablero, y el primero en caerse
 * fue `admin-cambio-estado`, que ni siquiera era parte de esa feature. El costo
 * asumido es que un paso que falla tapa a los que siguen.
 *
 * **Todo el recorrido va filtrado por el DNI del cliente sembrado**
 * (`?dni=…`), y eso no es decoración: los tests corren contra la base de
 * DESARROLLO, que tiene órdenes reales. Sin acotar, ni la grilla ni —sobre todo—
 * los conteos de los chips serían decidibles: "Todos (N)" dependería de cuántos
 * pedidos entraron esta semana. Con el DNI puesto, el universo son exactamente
 * las dos órdenes que este spec siembra. De paso ejercita el filtro que llega
 * por link desde el detalle de una orden.
 */
test.describe("Grilla de órdenes", () => {
  let producto;
  let cliente;
  /** La orden de HOY: la que se mueve de estado y la que sobrevive a "Hoy". */
  let ordenReciente;
  /** Una orden de hace 40 días: existe para que el filtro de período decida algo. */
  let ordenAntigua;
  let usuarioAdmin;

  /** Cuántos días atrás entró `ordenAntigua`. Muy afuera de cualquier preset. */
  const DIAS_DE_ANTIGUEDAD = 40;

  /**
   * Las dos líneas de `ordenReciente`.
   *
   * **Son DOS y con nombres distintos a propósito.** Dos, porque el guard del
   * PATCH afirma que la fila conserva su `cantidadItems` — con una sola línea,
   * un `1` correcto y un `1` casual se ven igual. Y con nombres distintos porque
   * el resumen keyea por `nombreProducto + cantidad` y porque el paso del
   * despliegue busca el nombre del producto por texto exacto.
   */
  const CANTIDAD_ITEMS = 2;

  test.beforeEach(async () => {
    producto = await crearProductoDeTest({
      nombre: "E2E-TEST-Producto Grilla",
      precio: "4500",
    });

    // Las dos órdenes cuelgan del MISMO cliente: es lo que hace que un único
    // `?dni=` acote el universo entero del spec.
    cliente = await crearClienteDeTest();

    ordenReciente = await crearOrdenDeTest({
      clienteId: cliente.id,
      estado: "PENDIENTE",
      items: [
        {
          productId: producto.id,
          nombreProducto: producto.nombre,
          precioUnitario: producto.precio.toString(),
          cantidad: 2,
        },
        {
          productId: producto.id,
          nombreProducto: "E2E-TEST-Repuesto Grilla",
          precioUnitario: "1500",
          cantidad: 1,
        },
      ],
    });

    ordenAntigua = await crearOrdenDeTest({
      clienteId: cliente.id,
      estado: "CANCELADA",
      createdAt: new Date(Date.now() - DIAS_DE_ANTIGUEDAD * 24 * 60 * 60 * 1000),
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
    // Las órdenes primero y el cliente después: `Cliente -> Orden` es
    // `onDelete: NoAction`. `borrarOrdenDeTest` borra el cliente recién cuando
    // se queda sin órdenes, así que el segundo llamado es el que lo limpia.
    if (ordenAntigua?.id) await borrarOrdenDeTest(ordenAntigua.id, cliente?.id);
    if (ordenReciente?.id) await borrarOrdenDeTest(ordenReciente.id, cliente?.id);
    if (producto?.id) await borrarProductoDeTest(producto.id);
    if (usuarioAdmin?.id) await borrarUsuarioAdminDeTest(usuarioAdmin.id);
  });

  /** La URL de la grilla acotada al cliente sembrado. */
  function rutaGrilla() {
    return `/catalogo/admin/ordenes?dni=${cliente.dni}`;
  }

  /**
   * La pantalla terminó de cargar: hay `<h1>` y no queda ningún spinner
   * anunciándose. El `role="status"` es el del `Spinner` suelto del estado de
   * carga — el del botón "Actualizar" va dentro de un `aria-hidden`, así que no
   * cuenta.
   */
  async function esperarGrilla(page) {
    await expect(page.getByRole("heading", { level: 1, name: "Órdenes" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Cargando" })).toHaveCount(0);
  }

  /**
   * La fila de una orden, ubicada por su celda de identidad (`#<id>`).
   *
   * Se ancla en `data-celda="identidad"` y con un regex anclado, no en un
   * `hasText` suelto: `#41` es subcadena de `#418`, y un match parcial elegiría
   * la fila equivocada sin que nada falle.
   */
  function filaDe(page, ordenId) {
    return page.locator("tbody > tr").filter({
      has: page.locator('td[data-celda="identidad"]', { hasText: new RegExp(`^#${ordenId}$`) }),
    });
  }

  /** El disparador del resumen de productos de una orden. */
  function botonResumenDe(page, ordenId) {
    return page.getByRole("button", { name: new RegExp(`productos de la orden #${ordenId}$`) });
  }

  /** El grupo de chips de estado, por su rótulo VISIBLE ("Estado"). */
  function grupoEstado(page) {
    return page.getByRole("group", { name: "Estado" });
  }

  /** El grupo de presets de período, por su rótulo VISIBLE ("Período"). */
  function grupoPeriodo(page) {
    return page.getByRole("group", { name: "Período" });
  }

  test("resumen, detalle, cambio de estado, filtro de período y chips con conteo", async ({
    page,
  }) => {
    await test.step("login real por el formulario y llegada a la grilla", async () => {
      await page.goto("/catalogo/admin/login");
      await page.getByLabel("Email").fill(usuarioAdmin.email);
      // `exact: true` por el botón "Mostrar contraseña" del ojito, cuyo nombre
      // accesible también contiene "contraseña".
      await page.getByLabel("Contraseña", { exact: true }).fill(usuarioAdmin.password);
      await page.getByRole("button", { name: "Ingresar" }).click();
      await expect(page).toHaveURL(/\/catalogo\/admin\/productos$/);

      await page.goto(rutaGrilla());
      await esperarGrilla(page);

      // Es una TABLA, no un tablero: la orden sembrada es una fila con sus
      // celdas rotuladas, no una tarjeta dentro de una columna de estado.
      await expect(filaDe(page, ordenReciente.id)).toHaveCount(1);
      await expect(filaDe(page, ordenAntigua.id)).toHaveCount(1);
      await expect(
        filaDe(page, ordenReciente.id).locator('td[data-label="Cliente"]'),
      ).toHaveText(cliente.nombre);

      // El DNI llegó por la URL y la pantalla lo muestra como chip que se puede
      // quitar, no como campo tipeable.
      await expect(page.getByRole("button", { name: "Quitar filtro por DNI" })).toBeVisible();
    });

    await test.step("el resumen abre al click y Escape lo cierra devolviendo el foco", async () => {
      const boton = botonResumenDe(page, ordenReciente.id);
      await expect(boton).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator('tr[data-fila="expansion"]')).toHaveCount(0);

      await boton.click();
      await expect(boton).toHaveAttribute("aria-expanded", "true");

      // El resumen abre EN LA TABLA, en una `<tr>` extra que empuja al resto —
      // no en un panel flotante como en la tarjeta del tablero.
      const expansion = page.locator('tr[data-fila="expansion"]');
      await expect(expansion).toHaveCount(1);
      await expect(expansion.locator("[data-despliegue]")).toHaveAttribute(
        "data-despliegue",
        "abierto",
      );
      await expect(page.getByText(producto.nombre, { exact: true })).toBeVisible();
      await expect(page.getByText("E2E-TEST-Repuesto Grilla", { exact: true })).toBeVisible();

      await page.keyboard.press("Escape");

      await expect(boton).toHaveAttribute("aria-expanded", "false");
      await expect(boton).toBeFocused();

      // ⚠️ **No se afirma que el bloque desaparezca en el acto.** El cierre está
      // ANIMADO (`grid-template-rows: 1fr → 0fr`) y la fila sigue montada
      // mientras colapsa, justamente para que se la vea colapsar: desmontarla en
      // el mismo tick la haría desaparecer de un salto. `toHaveCount(0)` es
      // auto-reintentable, así que ESPERA el desmonte diferido en vez de negarlo.
      //
      // Y tampoco se afirma el estado intermedio (`data-despliegue="cerrado"`
      // sobre la fila todavía montada): esa ventana dura los 200 ms de la
      // animación, así que una aserción sobre ella pasa o falla según cuándo la
      // evalúe Playwright — un test intermitente, que es peor que no tenerlo.
      await expect(expansion).toHaveCount(0);
    });

    await test.step('el enlace "Ver" abre el detalle y volver conserva el filtro', async () => {
      await page.getByRole("link", { name: `Ver la orden #${ordenReciente.id}` }).click();
      await expect(
        page.getByRole("heading", { name: `Orden #${ordenReciente.id}` }),
      ).toBeVisible();

      await page.goBack();
      // Los filtros viven en la URL: volver del detalle cae en la MISMA vista,
      // no en el listado completo.
      await expect(page).toHaveURL(new RegExp(`dni=${cliente.dni}`));
      await esperarGrilla(page);
      await expect(filaDe(page, ordenReciente.id)).toHaveCount(1);
    });

    await test.step("el select de la fila mueve la orden, y la fila conserva monto e items", async () => {
      const fila = filaDe(page, ordenReciente.id);
      const boton = botonResumenDe(page, ordenReciente.id);

      // El estado ANTES: se captura de la pantalla en vez de recalcularlo, así
      // el guard no depende del formato de moneda ni del texto del rótulo.
      const totalAntes = (await fila.locator('td[data-label="Total"]').innerText()).trim();
      const etiquetaItemsAntes = await boton.getAttribute("aria-label");
      // Si ya arrancara sin datos, el guard de abajo compararía dos "—" y pasaría
      // sin probar nada.
      expect(totalAntes, "el monto de la fila antes del cambio").not.toBe("—");
      expect(etiquetaItemsAntes).toContain(`Ver los ${CANTIDAD_ITEMS} productos`);

      const select = page.getByRole("combobox", {
        name: `Cambiar estado de la orden #${ordenReciente.id}`,
      });
      await expect(select).toHaveValue("PENDIENTE");

      // Elegir un estado NO guarda: abre el diálogo de notificación, que es la
      // única puerta de escritura de la pantalla.
      await select.selectOption("EN_PREPARACION");

      // Se acota por nombre y no se usa `getByRole("dialog")` pelado: el drawer
      // del menú del admin también es un `dialog` montado.
      const dialogo = page.getByRole("dialog", {
        name: new RegExp(`Cambiar el estado de la orden #${ordenReciente.id}`),
      });
      await expect(dialogo).toBeVisible();

      // El cliente sembrado no tiene email, así que "Notificar y guardar" está
      // deshabilitado — y este spec no manda correo real en ninguna corrida.
      await expect(dialogo.getByRole("button", { name: "Notificar y guardar" })).toBeDisabled();
      await dialogo.getByRole("button", { name: "Guardar sin notificar" }).click();

      // ⚠️ **La señal de que el PATCH terminó es que el diálogo se CERRÓ**, no
      // que la fila cambió de aspecto: el cierre ocurre recién después de que la
      // respuesta llegó, así que leer la base antes devolvería el estado viejo.
      await expect(dialogo).toHaveCount(0);

      const enDb = await prisma.orden.findUnique({ where: { id: ordenReciente.id } });
      expect(enDb.estado).toBe("EN_PREPARACION");

      await expect(select).toHaveValue("EN_PREPARACION");
      // La fila se QUEDA en pantalla aunque cambie de estado: no hay filtro de
      // estado activo y, aun habiéndolo, desaparecer bajo el cursor escondería
      // la confirmación de lo que el admin acaba de hacer.
      await expect(fila).toHaveCount(1);

      // ⚠️ EL GUARD MÁS IMPORTANTE DE LA PANTALLA. `PATCH /ordenes/:id/estado`
      // responde con la forma DETALLE, que NO trae `total`, `cantidadItems` ni
      // `resumen` — son campos del LISTADO. Pisar la fila con la respuesta
      // entera le arranca el monto y el resumen sin ningún error y sin test
      // rojo: la celda cae al guion largo y el botón pasa a decir "Ver los
      // productos" en vez de "Ver los 2 productos".
      await expect(fila.locator('td[data-label="Total"]')).toHaveText(totalAntes);
      await expect(boton).toHaveAttribute("aria-label", etiquetaItemsAntes);
    });

    await test.step("el filtro de período acota la grilla, y los presets son excluyentes", async () => {
      const preset = (nombre) => grupoPeriodo(page).getByRole("button", { name: nombre, exact: true });

      // De entrada no hay período pedido: "Todo" es el preset activo y se ven
      // las dos órdenes del cliente.
      await expect(preset("Todo")).toHaveAttribute("aria-pressed", "true");
      await expect(filaDe(page, ordenAntigua.id)).toHaveCount(1);

      await preset("Hoy").click();
      await expect(page).toHaveURL(/dias=1/);
      await esperarGrilla(page);

      // La pantalla manda la INTENCIÓN (`?dias=1`) y el rango lo resuelve el
      // backend con el calendario argentino: la orden de hoy queda adentro y la
      // de hace 40 días, afuera.
      await expect(filaDe(page, ordenReciente.id)).toHaveCount(1);
      await expect(filaDe(page, ordenAntigua.id)).toHaveCount(0);

      await expect(preset("Hoy")).toHaveAttribute("aria-pressed", "true");
      await expect(preset("Todo")).toHaveAttribute("aria-pressed", "false");

      await preset("Todo").click();
      await expect(page).not.toHaveURL(/dias=/);
      await esperarGrilla(page);
      await expect(filaDe(page, ordenReciente.id)).toHaveCount(1);
      await expect(filaDe(page, ordenAntigua.id)).toHaveCount(1);
    });

    await test.step("los chips de estado llevan su conteo, y el conteo no se recalcula con el estado puesto", async () => {
      const chip = (nombre) => grupoEstado(page).getByRole("button", { name: nombre });

      // Los cinco conteos sobre el universo del DNI: dos órdenes, una en
      // EN_PREPARACION (la que se movió en el paso anterior) y una CANCELADA.
      await expect(chip(/^Todos/)).toHaveText("Todos (2)");
      await expect(chip(/^Pendiente/)).toHaveText("Pendiente (0)");
      await expect(chip(/^En preparación/)).toHaveText("En preparación (1)");
      await expect(chip(/^Entregada/)).toHaveText("Entregada (0)");
      await expect(chip(/^Cancelada/)).toHaveText("Cancelada (1)");

      await chip(/^Cancelada/).click();
      await expect(page).toHaveURL(/estado=CANCELADA/);
      await esperarGrilla(page);

      await expect(chip(/^Cancelada/)).toHaveAttribute("aria-pressed", "true");
      await expect(chip(/^Todos/)).toHaveAttribute("aria-pressed", "false");
      await expect(filaDe(page, ordenAntigua.id)).toHaveCount(1);
      await expect(filaDe(page, ordenReciente.id)).toHaveCount(0);

      // ⚠️ Los conteos NO cambian al elegir un chip: se piden con los mismos
      // filtros que el listado MENOS `estado`. Si el estado entrara en el
      // conteo, cada chip contaría solo lo suyo y tres de los cuatro dirían 0,
      // con el activo repitiendo el número del paginador.
      await expect(chip(/^Todos/)).toHaveText("Todos (2)");
      await expect(chip(/^En preparación/)).toHaveText("En preparación (1)");

      // Y con un filtro que no alcanza ninguna orden, el vacío dice "Sin
      // resultados" — nunca "Todavía no hay órdenes", que con un filtro puesto
      // sería falso.
      await chip(/^Entregada/).click();
      await esperarGrilla(page);
      await expect(page.getByRole("heading", { name: "Sin resultados" })).toBeVisible();
    });
  });
});
