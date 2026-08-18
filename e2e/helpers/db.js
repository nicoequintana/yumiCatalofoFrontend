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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
cargarEnv({ path: path.resolve(__dirname, "../../../backend/.env") });

const { prisma } = await import("../../../backend/src/lib/prisma.js");

export const MARCA_TEST = "E2E-TEST-";

/**
 * Genera un DNI sintético de 8 dígitos, válido para `esDniValido` (7-8
 * dígitos) pero reservado para tests: siempre arranca con "00" seguido de un
 * timestamp truncado, un prefijo que ningún DNI argentino real puede tener
 * (arrancan en rangos bajos pero no en "00"). No puede llevar el prefijo de
 * texto `E2E-TEST-` porque el campo es numérico puro.
 * @returns {string}
 */
export function crearDniDeTest() {
  const sufijo = String(Date.now()).slice(-6);
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
      precio: overrides.precio ?? "1000.00",
      sku,
      visibleEnCatalogo: overrides.visibleEnCatalogo ?? true,
      disponibilidad: overrides.disponibilidad ?? "DISPONIBLE",
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
}

export { prisma };
