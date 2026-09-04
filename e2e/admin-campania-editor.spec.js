import { test, expect } from "@playwright/test";
import {
  MARCA_TEST,
  borrarCampaniaDeTest,
  borrarProductoDeTest,
  borrarUsuarioAdminDeTest,
  crearProductoDeTest,
  crearUsuarioAdminDeTest,
  prisma,
} from "./helpers/db.js";

/**
 * Tanda 5 — el recorrido completo de una campaña con vitrina, de punta a punta:
 * se crea desde el editor en página, se le eligen los productos, y ese mismo
 * dato sale por el cartel del catálogo público hasta la grilla filtrada.
 *
 * QUÉ CUBRE QUE NO CUBRA UN TEST UNITARIO. Las tres piezas nuevas de la tanda se
 * tocan solo acá: la vitrina (`CampaniaProducto`) se guarda en el panel, el CTA
 * por intención (`modalCtaTipo: "CAMPANIA"`) se resuelve a una ruta EN EL
 * BACKEND al leer, y `GET /products?campania=ID` la sirve. Cada una tiene sus
 * tests con Prisma mockeado; lo que ninguno puede afirmar es que la ruta que el
 * backend arma sea la que el router del frontend sabe abrir.
 *
 * ⚠️ **UN SOLO LOGIN, con `test.step` para las etapas.** El limitador es de 8
 * intentos cada 15 minutos POR IP y lo comparte la suite entera: un spec con
 * login por test no falla solo, tumba a los que corren después. Está escrito en
 * `e2e/README.md`.
 *
 * ⚠️ **Este spec NO usa `neutralizarContextoComercial`, y es a propósito.** El
 * resto de los specs públicos lo necesita porque el cartel es `fixed inset-0` e
 * intercepta el primer click de cualquier página; acá el cartel ES lo que se
 * está probando. Por eso la campaña se crea con **prioridad 999**: el modal es
 * un recurso exclusivo que se decide por prioridad, y la base de desarrollo
 * puede tener campañas reales vigentes compitiendo por él.
 */
test.describe("Editor de campaña: vitrina, cartel y la grilla filtrada", () => {
  let producto;
  let usuarioAdmin;
  /** La campaña la crea la UI, así que su id recién se conoce a mitad del test. */
  let campaniaId;
  const nombreCampania = `${MARCA_TEST}Campaña Editor`;

  test.beforeEach(async () => {
    producto = await crearProductoDeTest({
      nombre: `${MARCA_TEST}Producto Vitrina`,
      precio: "7300",
    });
    usuarioAdmin = await crearUsuarioAdminDeTest();
    campaniaId = null;
  });

  test.afterEach(async () => {
    // La campaña primero: borrarla se lleva su `CampaniaProducto` por cascade,
    // así el producto sale sin nada colgando.
    if (campaniaId) {
      await borrarCampaniaDeTest(campaniaId);
    }
    if (producto?.id) {
      await borrarProductoDeTest(producto.id);
    }
    if (usuarioAdmin?.id) {
      await borrarUsuarioAdminDeTest(usuarioAdmin.id);
    }
  });

  test("crear con cartel -> elegir la vitrina -> el CTA del catálogo lleva a la grilla de esa campaña", async ({
    page,
  }) => {
    let hoy;

    await test.step("qué día es HOY lo dice el backend", async () => {
      // ⚠️ No se calcula acá. El repo ya tiene UNA definición de "día"
      // (`lib/horarioArgentino.js`) y el endpoint público la emite como
      // `claveDia` justamente para que el frontend no invente una segunda. Un
      // `new Date()` en este spec sería la tercera, y entre las 21:00 y las
      // 23:59 argentinas daría el día siguiente: la campaña nacería empezando
      // mañana y el cartel no se mostraría nunca.
      const respuesta = await page.request.get("http://localhost:4000/api/campanias/activas");
      expect(respuesta.ok()).toBe(true);
      ({ claveDia: hoy } = await respuesta.json());
      expect(hoy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    await test.step("login real por el formulario", async () => {
      await page.goto("/catalogo/admin/login");
      await page.getByLabel("Email").fill(usuarioAdmin.email);
      // `exact: true` por el botón "Mostrar contraseña" de `CampoPassword`, cuyo
      // nombre accesible también contiene "contraseña" (ver
      // admin-cambio-estado.spec.js).
      await page.getByLabel("Contraseña", { exact: true }).fill(usuarioAdmin.password);
      await page.getByRole("button", { name: "Ingresar" }).click();
      await expect(page).toHaveURL(/\/catalogo\/admin\/productos$/);
    });

    await test.step("alta de la campaña, con el cartel apuntando a su vitrina", async () => {
      await page.goto("/catalogo/admin/campanias/nueva");
      await expect(page.getByRole("heading", { name: "Nueva campaña" })).toBeVisible();

      await page.getByLabel("Nombre").fill(nombreCampania);
      await page.getByLabel("Estado").selectOption("HABILITADA");
      await page.getByLabel("Desde").fill(hoy);
      // La etiqueta es "Hasta · inclusive": el sufijo es la ayuda, y forma parte
      // del nombre accesible.
      await page.getByLabel(/^Hasta/).fill(hoy);
      // Prioridad ALTA para ganarle a cualquier campaña vigente de la base de
      // desarrollo — el cartel es uno solo y lo decide este número.
      await page.getByLabel("Prioridad").fill("999");

      await page.getByRole("switch", { name: /Mostrar cada vez que alguien entra/ }).click();
      await page.getByLabel("Título").fill("Vitrina de prueba E2E");

      // El destino se guarda como INTENCIÓN. La ruta la arma el backend al leer.
      await page.getByRole("radio", { name: /Los productos de la campaña/ }).check();

      // Con la vitrina vacía ese destino no sirve, y el editor lo dice antes de
      // guardar. Es el mismo aviso que da `DialogoProgramar` sobre una promoción
      // sin productos.
      await expect(page.getByText(/Todavía no hay ningún producto en la vitrina/)).toBeVisible();

      await page.getByRole("button", { name: "Guardar" }).click();

      // Tras el alta se aterriza en la EDICIÓN de lo recién creado, no en el
      // listado: es la divergencia deliberada respecto del editor de producto
      // (la vitrina y el Doodle necesitan un id).
      await expect(page).toHaveURL(/\/catalogo\/admin\/campanias\/\d+\/editar$/);
      campaniaId = Number(page.url().match(/\/campanias\/(\d+)\/editar/)[1]);
    });

    await test.step("elegir el producto de la vitrina, y que quede persistido", async () => {
      await expect(page.getByRole("heading", { name: "Productos de la campaña" })).toBeVisible();

      await page.getByLabel("Buscar productos").fill(producto.nombre);
      const botonAgregar = page.getByRole("button", { name: `Agregar ${producto.nombre}` });
      await expect(botonAgregar).toBeVisible();
      await botonAgregar.click();

      await expect(page.getByRole("heading", { name: "En la vitrina · 1" })).toBeVisible();
      // El aviso desaparece porque el destino ya lleva a algo.
      await expect(page.getByText(/Todavía no hay ningún producto en la vitrina/)).toHaveCount(0);

      // Contra la BASE, no contra lo que la pantalla acaba de dibujar: la
      // vitrina se persiste sola contra `PUT /:id/productos`, sin pasar por el
      // submit del formulario.
      const enLaVitrina = await prisma.campaniaProducto.count({ where: { campaniaId } });
      expect(enLaVitrina).toBe(1);
    });

    await test.step("el cartel del catálogo lleva a la grilla de esa campaña", async () => {
      await page.goto("/");

      const cartel = page.getByRole("dialog", { name: "Vitrina de prueba E2E" });
      await expect(cartel).toBeVisible();

      // "Ver más" es `CTA_TEXTO_POR_DEFECTO`, que el backend resuelve al leer:
      // el admin no escribió ningún texto de botón.
      await cartel.getByRole("link", { name: "Ver más" }).click();

      // La ruta la armó el backend contra lo que existe hoy. Que el router del
      // frontend la sepa abrir es exactamente lo que ningún test unitario de
      // ninguno de los dos lados puede afirmar.
      await expect(page).toHaveURL(new RegExp(`/coleccion\\?campania=${campaniaId}$`));

      await expect(page.getByText(`Campaña: ${nombreCampania}`)).toBeVisible();
      await expect(page.getByRole("link", { name: new RegExp(producto.nombre) })).toBeVisible();
    });
  });
});
