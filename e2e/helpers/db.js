/**
 * Helpers de datos para los tests E2E (Playwright + Prisma directo).
 *
 * Estos tests corren en Node (no en el browser), así que importar
 * `backend/src/lib/prisma.js` directamente es un patrón legítimo para
 * sembrar/limpiar datos sin pasar por HTTP — más simple y más confiable que
 * levantar un segundo cliente HTTP solo para setup/teardown.
 *
 * Estrategia de datos de test (decisión documentada, Sprint 7 Task 1): estos
 * tests corren contra la MISMA base de datos de desarrollo que usa el backend
 * real (la que apunta `DATABASE_URL` en `backend/.env`) — no hay una base de
 * datos de test separada. Para no ensuciar los datos reales de dev y poder
 * limpiar con confianza después de cada corrida, todo dato creado acá lleva
 * el prefijo `E2E-TEST-` en un campo identificable:
 *   - Product.sku      -> `E2E-TEST-<timestamp>-<random>`
 *   - Cliente.dni       -> dni sintético con prefijo numérico reservado (ver
 *                          `crearDniDeTest`) — el modelo exige 7-8 dígitos
 *                          (`esDniValido`), así que no puede llevar el
 *                          prefijo de texto; en su lugar, Cliente.nombre SÍ
 *                          lleva el prefijo `E2E-TEST-` como marca legible.
 * Esto permite:
 *   1. Reconocer a simple vista qué filas son de test en una consulta manual.
 *   2. Limpiar por patrón (`sku: { startsWith: "E2E-TEST-" }`,
 *      `nombre: { startsWith: "E2E-TEST-" }`) sin depender de IDs guardados
 *      en memoria, aunque igual se guardan IDs para un cleanup más preciso.
 *
 * Orden de borrado (importante, ver `backend/prisma/schema.prisma`):
 *   - Product -> Foto/Video/Caracteristica: cascade automático (onDelete:
 *     Cascade), no hace falta borrarlos a mano.
 *   - Orden -> ItemOrden: cascade automático.
 *   - Cliente -> Orden: `onDelete: NoAction` — NO cascade. Hay que borrar las
 *     Orden del cliente ANTES (o en el mismo batch) de borrar el Cliente, si
 *     no la FK lo rechaza.
 */

// `backend/src/lib/prisma.js` lee `DATABASE_URL` de `process.env` al
// importarse (ver `PrismaMssql(process.env.DATABASE_URL)`), pero Playwright
// corre este archivo desde `frontend/`, no desde `backend/` — `dotenv/config`
// por defecto carga el `.env` del cwd actual, que acá sería el de
// `frontend/` (inexistente) y no el de `backend/`. Por eso se apunta
// explícitamente al `.env` del backend ANTES de importar `prisma.js`, con la
// misma lib (`dotenv`) que ya es dependencia del backend.
import { config as cargarEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
cargarEnv({ path: path.resolve(__dirname, "../../../backend/.env") });

const { prisma } = await import("../../../backend/src/lib/prisma.js");

export const MARCA_TEST = "E2E-TEST-";

// Mismo costo que `backend/src/scripts/create-admin.js` — no hay razón para
// que el hash de test sea más barato/caro que el de producción, el tiempo de
// bcrypt.hash acá no es un cuello de botella real para un puñado de tests.
const SALT_ROUNDS = 10;

/**
 * Genera un DNI sintético de 8 dígitos, válido para `esDniValido` (7-8
 * dígitos) pero reservado para tests: siempre arranca con "00" seguido de 6
 * dígitos, un prefijo que ningún DNI argentino real puede tener (arrancan en
 * rangos bajos pero no en "00"). No puede llevar el prefijo de texto
 * `E2E-TEST-` porque el campo es numérico puro.
 *
 * Los 6 dígitos siguientes NO son un timestamp truncado (`Date.now().slice(-6)`
 * repite cada ~16.6 minutos, un rollover real entre corridas de test
 * separadas — CI reintentando, o dos corridas locales seguidas). En vez de
 * eso se combinan los nanosegundos de `process.hrtime()` (variables incluso
 * entre llamadas microsegundos aparte, a diferencia de `Date.now()`) con un
 * componente random, reduciendo la colisión a un caso de laboratorio en vez
 * de un riesgo real de una corrida cada 16-33 minutos.
 *
 * Por qué esto importa más de lo que parece: `upsertClienteConReintento`
 * (backend, `ordenes.controller.js`) NO rechaza un dni repetido — actualiza
 * en silencio el `Cliente` existente. Una colisión entre dos corridas de
 * test fusionaría sus Cliente sin error visible, y el cleanup de una corrida
 * (`borrarOrdenDeTest`/`afterEach`) podría borrar una fila que la otra
 * corrida todavía está usando.
 * @returns {string}
 */
export function crearDniDeTest() {
  const [, nanosegundos] = process.hrtime();
  // `nanosegundos` es el resto sub-segundo de hrtime (0-999999999) — de por
  // sí ya cambia en cada llamada, aunque dos llamadas caigan en el mismo
  // milisegundo de Date.now(). Se lo combina con 3 dígitos random para que
  // incluso dos llamadas que cayeran en el mismo nanosegundo (imposible en
  // la práctica, pero sin depender de esa garantía) sigan divergiendo.
  const partehrtime = nanosegundos % 1000;
  const random = Math.floor(Math.random() * 1000);
  const sufijo = String(partehrtime).padStart(3, "0") + String(random).padStart(3, "0");
  return `00${sufijo}`;
}

/**
 * Crea un producto de test: visible, en stock, con una foto placeholder
 * (no depende de una subida real a Cloudinary/Drive — el catálogo solo
 * necesita `fotos[0].url` para no mostrar el estado "sin imagen").
 * @param {object} [overrides] campos a pisar sobre los defaults
 * @returns {Promise<object>} el producto creado (con su `foto` incluida)
 */
export async function crearProductoDeTest(overrides = {}) {
  const sku = `${MARCA_TEST}${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const producto = await prisma.product.create({
    data: {
      nombre: overrides.nombre ?? `${MARCA_TEST}Producto E2E`,
      descripcion: overrides.descripcion ?? "Producto sembrado por un test E2E de Playwright.",
      precio: overrides.precio ?? "1000",
      sku,
      visibleEnCatalogo: overrides.visibleEnCatalogo ?? true,
      stock: overrides.stock ?? 10,
      fotos: {
        create: [
          {
            url: "https://placehold.co/600x600/png?text=E2E+Test",
            orden: 0,
          },
        ],
      },
    },
    include: { fotos: true },
  });

  return producto;
}

/**
 * Borra un producto de test por id (cascade automático se lleva sus
 * Foto/Video/Caracteristica). Silencioso si ya no existe (test que falló a
 * mitad de camino y no llegó a crear todo, o cleanup corrido dos veces).
 * @param {number} productId
 */
export async function borrarProductoDeTest(productId) {
  await prisma.product.delete({ where: { id: productId } }).catch(() => {});
}

/**
 * Crea un cliente de test directo vía Prisma (sin pasar por el checkout de
 * la UI). Usa `Cliente.nombre` marcado con `E2E-TEST-` y, si no se pasa un
 * `dni` explícito, uno generado por `crearDniDeTest()`.
 *
 * Para escenarios (Task 2) que necesitan un cliente ya existente ANTES de
 * ejercitar la UI — ej. "cliente recurrente con historial" — sin tener que
 * reimplementar a mano la regla de negocio de upsert-por-dni del backend
 * (`upsertClienteConReintento` en `ordenes.controller.js`): acá se crea
 * directo porque en un seed de test el dni es sintético y garantizado nuevo
 * (ver `crearDniDeTest`), así que no hace falta esa lógica de reintento.
 * @param {object} [overrides] campos a pisar sobre los defaults
 * @returns {Promise<object>} el cliente creado
 */
export async function crearClienteDeTest(overrides = {}) {
  return prisma.cliente.create({
    data: {
      dni: overrides.dni ?? crearDniDeTest(),
      nombre: overrides.nombre ?? `${MARCA_TEST}Cliente E2E`,
      telefono: overrides.telefono ?? "1122334455",
      email: overrides.email ?? null,
    },
  });
}

/**
 * Crea una orden de test directo vía Prisma (sin pasar por
 * `POST /api/ordenes` ni por el formulario de checkout), para escenarios que
 * necesitan una orden preexistente como fixture — ej. "cliente con órdenes
 * anteriores" o "admin cambia el estado de una orden ya creada" — sin forzar
 * un segundo recorrido completo de checkout por UI solo para tener datos de
 * partida.
 *
 * Si no se pasa `clienteId`, crea un cliente de test nuevo con
 * `crearClienteDeTest()`. Los items siguen la misma forma que
 * `ItemOrden`/el snapshot que arma `validarYSnapshotearProductos` en el
 * backend (`nombreProducto`/`precioUnitario`/`cantidad`) — el caller decide
 * ese snapshot explícitamente en vez de que este helper lo recalcule desde
 * un Product en vivo, para poder fijar valores exactos en el test.
 * @param {object} [opciones]
 * @param {number} [opciones.clienteId] cliente existente a reusar
 * @param {string} [opciones.estado] uno de PENDIENTE/EN_PREPARACION/ENTREGADA/CANCELADA
 * @param {Array<{productId: number, nombreProducto: string, precioUnitario: string, cantidad: number}>} opciones.items
 * @returns {Promise<object>} la orden creada, con `cliente` e `items` incluidos
 */
export async function crearOrdenDeTest({ clienteId, estado, items } = {}) {
  const clienteIdFinal = clienteId ?? (await crearClienteDeTest()).id;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("crearOrdenDeTest requiere al menos un item en `items`.");
  }

  return prisma.orden.create({
    data: {
      clienteId: clienteIdFinal,
      estado: estado ?? "PENDIENTE",
      items: { create: items },
    },
    include: { cliente: true, items: true },
  });
}

/**
 * Borra una orden de test y, si el cliente asociado no tiene más órdenes ni
 * fue reusado por otro test en la misma corrida, borra también el cliente.
 * Respeta el orden que exige el schema: Orden (cascade sobre ItemOrden)
 * ANTES que Cliente (`onDelete: NoAction`, rechaza el borrado si quedan
 * Orden referenciándolo).
 * @param {number} ordenId
 * @param {number} clienteId
 */
export async function borrarOrdenDeTest(ordenId, clienteId) {
  await prisma.orden.delete({ where: { id: ordenId } }).catch(() => {});

  if (clienteId === undefined) return;

  const ordenesRestantes = await prisma.orden.count({ where: { clienteId } }).catch(() => 1);
  if (ordenesRestantes === 0) {
    await prisma.cliente.delete({ where: { id: clienteId } }).catch(() => {});
  }
}

/**
 * Crea (o reusa) un usuario admin de test vía Prisma directo, replicando a
 * mano el mismo patrón que `backend/src/scripts/create-admin.js`
 * (`bcrypt.hash` con `SALT_ROUNDS = 10` sobre `Usuario.passwordHash`) — no se
 * puede shell-ear a ese script desde un test de Playwright de forma simple, y
 * el script además hace `process.exit(1)` ante un email duplicado, algo que
 * SÍ pasaría acá si corridas repetidas de test reusaran el mismo email fijo.
 *
 * Por eso, a diferencia de `crearProductoDeTest`/`crearClienteDeTest` (que
 * siempre crean una fila nueva), este helper es idempotente: si el email ya
 * existe (test anterior que no llegó a limpiar), actualiza su
 * `passwordHash` en vez de fallar — así un test de login puede asumir
 * siempre una contraseña conocida sin importar el estado dejado por una
 * corrida previa interrumpida.
 *
 * `Usuario.email` no tiene un campo de texto libre donde meter el prefijo
 * `MARCA_TEST` de forma útil (es el email de login, no un campo mostrado en
 * ninguna UI) — se usa igual como prefijo del local-part
 * (`e2e-test-admin@...`) para que `limpiarTodoRastroDeTest` pueda barrerlo
 * por patrón igual que el resto de las filas de test.
 * @param {object} [overrides]
 * @param {string} [overrides.email]
 * @param {string} [overrides.password] contraseña en texto plano (mínimo 8
 *   caracteres, misma regla que `create-admin.js`) — se devuelve tal cual
 *   para que el test pueda loguearse con ella por UI.
 * @returns {Promise<{id: number, email: string, password: string}>}
 */
export async function crearUsuarioAdminDeTest(overrides = {}) {
  const email = overrides.email ?? "e2e-test-admin@yumi.test";
  const password = overrides.password ?? "E2E-Test-Pass-1234";

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const usuario = await prisma.usuario.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });

  return { id: usuario.id, email: usuario.email, password };
}

/**
 * Borra un usuario admin de test por id. Silencioso si ya no existe.
 * @param {number} usuarioId
 */
export async function borrarUsuarioAdminDeTest(usuarioId) {
  await prisma.usuario.delete({ where: { id: usuarioId } }).catch(() => {});
}

/**
 * Limpieza global por patrón: barre CUALQUIER fila marcada `E2E-TEST-` que
 * haya quedado huérfana (un test anterior que crasheó antes de su propio
 * cleanup puntual). Pensado para correr como global teardown, además del
 * cleanup puntual de cada test — es la red de seguridad, no el mecanismo
 * primario (borrar por id apenas termina cada test es más preciso y no
 * depende de que el patrón de nombre no cambie).
 */
export async function limpiarTodoRastroDeTest() {
  // Órdenes de clientes de test, antes que los clientes (mismo motivo que
  // borrarOrdenDeTest: NoAction en Cliente -> Orden).
  const clientesDeTest = await prisma.cliente.findMany({
    where: { nombre: { startsWith: MARCA_TEST } },
    select: { id: true },
  });
  const idsClientes = clientesDeTest.map((c) => c.id);

  if (idsClientes.length > 0) {
    await prisma.orden.deleteMany({ where: { clienteId: { in: idsClientes } } });
    await prisma.cliente.deleteMany({ where: { id: { in: idsClientes } } });
  }

  // Productos de test (cascade se lleva fotos/video/características).
  await prisma.product.deleteMany({ where: { sku: { startsWith: MARCA_TEST } } });

  // Usuarios admin de test (ver crearUsuarioAdminDeTest) — NO se borran acá
  // por defecto para no matar un usuario de test que otra corrida en
  // paralelo esté usando; en la práctica esta suite corre con `workers: 1`
  // (ver playwright.config.js), así que no hay corridas concurrentes reales,
  // pero igual se acota el patrón al dominio reservado `@yumi.test` en vez de
  // un `startsWith` sobre el prefijo genérico, más explícito sobre qué barre.
  await prisma.usuario.deleteMany({ where: { email: { endsWith: "@yumi.test" } } });
}

export { prisma };
