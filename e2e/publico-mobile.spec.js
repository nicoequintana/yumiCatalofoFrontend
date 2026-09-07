import { expect, test } from "@playwright/test";
import { neutralizarContextoComercial } from "./helpers/contextoComercial.js";

/**
 * La navegación del catálogo público en celular.
 *
 * Corre en el proyecto `mobile` (Pixel 7, 412×915). Es el único spec público
 * en viewport chico: la isla y la hoja son las dos piezas cuyo comportamiento
 * depende del tamaño de pantalla, y jsdom no aplica `@media`.
 */
test.beforeEach(async ({ page }) => {
  // El cartel de campaña es `fixed inset-0` e intercepta el primer click.
  await neutralizarContextoComercial(page);
});

test("la isla flotante está al alcance del pulgar y abre el menú", async ({ page }) => {
  await page.goto("/");

  const isla = page.getByTestId("isla-flotante");
  await expect(isla).toBeVisible();

  // Está en la mitad de abajo de la pantalla: es la razón de ser de la pieza.
  const caja = await isla.boundingBox();
  const alto = page.viewportSize().height;
  expect(caja.y).toBeGreaterThan(alto / 2);

  const boton = page.getByRole("button", { name: "Abrir menú" });
  await boton.click();

  const hoja = page.getByRole("dialog", { name: "Menú" });
  await expect(hoja).toBeVisible();
  await expect(hoja.getByRole("link", { name: /todos los productos/i })).toBeVisible();
});

test("cerrar la hoja devuelve el foco al botón que la abrió", async ({ page }) => {
  await page.goto("/");

  const boton = page.getByRole("button", { name: "Abrir menú" });
  await boton.click();
  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog", { name: "Menú" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeFocused();
});

test("la isla no tapa el final del catálogo", async ({ page }) => {
  await page.goto("/coleccion");

  // El zócalo del pie tiene que dejar su contenido alcanzable por scroll sin
  // que la isla se le monte encima.
  const footer = page.locator("footer");
  await expect(footer).toBeVisible();

  // La grilla llega por fetch: hasta que no está, el documento no tiene su
  // alto final y cualquier medición de abajo mide otra página.
  await expect(page.locator('a[href^="/producto/"]').first()).toBeVisible();

  // ⚠️ **`page.mouse.wheel(0, 20000)` NO scrollea en el proyecto `mobile`.**
  // El contexto va con `isMobile`/`hasTouch` (Pixel 7) y ahí el evento de rueda
  // no se traduce en desplazamiento del documento: la página se quedaba en
  // `scrollY = 0`. No lo delataba nada, porque `toBeVisible()` en Playwright
  // significa "no está `display:none`/`visibility:hidden`" y **no** "entra en
  // el viewport" — el test seguía de largo y fallaba recién en la comparación
  // final, con el pie a y≈2178 en una pantalla de 839 px de alto útil, o sea
  // un mensaje que señalaba a la isla cuando el problema era el gesto.
  //
  // ⚠️ Y `footer.scrollIntoViewIfNeeded()` tampoco alcanza, por otro motivo:
  // la grilla de `/coleccion` llega por fetch, así que mientras carga el
  // documento es CORTO y el pie ya está a la vista — Playwright decide que no
  // hace falta scrollear nada, los productos entran después y el pie se va a
  // 2.257 px sin que nadie vuelva a mover la página. Medido: `scrollY` quedaba
  // en 0 o a 41 px del fondo según qué ganara la carrera.
  //
  // Por eso el scroll se REINTENTA hasta tocar el fondo real del documento, y
  // eso mismo es la aserción intermedia: si la página no se mueve, la corrida
  // falla acá con un mensaje que habla del scroll y no de la isla.
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const alto = document.documentElement.scrollHeight;
          window.scrollTo(0, alto);
          const tope = alto - window.innerHeight;
          // Una página que todavía no supera el alto del viewport no tiene
          // fondo al que llegar: devolver 0 acá daría el poll por bueno sin
          // haber scrolleado nada, que es justo la carrera que este bloque
          // existe para descartar.
          if (tope <= 0) return Number.POSITIVE_INFINITY;
          return tope - window.scrollY;
        }),
      { message: "la página llegó al fondo del documento" },
    )
    .toBeLessThanOrEqual(1);

  // ⚠️ **Lo que se mide es dónde termina el CONTENIDO del pie, no la caja del
  // `<footer>`.** El zócalo que reserva el lugar de la isla es el `pb-24` del
  // contenedor interno del pie (`Footer.jsx`, "el zócalo se mudó acá"), o sea
  // que vive DENTRO del `<footer>`: su caja llega siempre hasta el fondo del
  // documento, y con la isla `fixed bottom-0` esa comparación no puede dar
  // nunca — ni agrandando el zócalo, porque agrandarlo agranda también la
  // caja. Medido a 412px: pie 630→839 (fondo del documento), isla 765→839.
  // El contenido real del pie termina en 839 − 96 = 743, con 22 px de aire
  // hasta la isla, que es exactamente lo que este test quiere afirmar.
  const finDelContenidoDelPie = await footer.evaluate((pie) => {
    const conZocalo = pie.firstElementChild;
    const relleno = Number.parseFloat(getComputedStyle(conZocalo).paddingBottom);
    return conZocalo.getBoundingClientRect().bottom - relleno;
  });
  const cajaIsla = await page.getByTestId("isla-flotante").boundingBox();
  // El contenido del pie tiene que terminar ANTES de donde empieza la isla (o
  // justo donde empieza): la aserción vieja pedía lo contrario del comentario
  // de arriba y afirmaba el solapamiento en vez de descartarlo.
  expect(
    finDelContenidoDelPie,
    "el contenido del pie termina antes de donde arranca la isla flotante",
  ).toBeLessThanOrEqual(cajaIsla.y);
});
