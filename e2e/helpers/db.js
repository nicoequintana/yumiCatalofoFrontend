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
import { createHash, randomBytes } from "node:crypto";
import { expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
cargarEnv({ path: path.resolve(__dirname, "../../../backend/.env") });

const { prisma } = await import("../../../backend/src/lib/prisma.js");

// La definición de "día" del sistema, importada y no reescrita: `desde`/`hasta`
// de una `Campania` son la MEDIANOCHE ARGENTINA de su día, y un `new Date(...)`
// a mano acá sería una cuarta copia de esa regla — la clase de espejo que este
// repo lleva censada justamente porque se desincroniza sin que nada falle.
const { claveDiaArgentino, inicioDelDiaArgentino } = await import(
  "../../../backend/src/lib/horarioArgentino.js"
);

// Igual criterio que `horarioArgentino.js`: se resuelven DESPUÉS de cargar el
// `.env` del backend, porque `lib/tokensCuenta.js` y `lib/cuentasCliente.js`
// importan (transitivamente) `lib/env.js`, que lee `process.env` al cargarse.
const { hashDeCodigo } = await import("../../../backend/src/lib/tokensCuenta.js");
const {
  TIPOS_TOKEN,
  COOKIE_DISPOSITIVO,
  DURACION_DISPOSITIVO_MS,
} = await import("../../../backend/src/lib/cuentasCliente.js");

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
 * Crea un combo de test, ACTIVO y SIEMPRE vigente, con hero de placeholder
 * (activar exige hero). Los productos tienen que existir.
 * @param {{nombre?: string, porcentaje?: number, items: Array<{productId: number, cantidad: number}>}} opciones
 */
export async function crearComboDeTest({ nombre = `${MARCA_TEST}Combo E2E`, porcentaje = 15, items }) {
  return prisma.combo.create({
    data: {
      nombre,
      frase: "Combo sembrado por un test E2E de Playwright.",
      porcentaje,
      activo: true,
      vigencia: "SIEMPRE",
      heroUrl: "https://placehold.co/2400x1000/png?text=E2E+Combo",
      items: { create: items },
    },
  });
}

/** Borra un combo de test (cascade sobre `ComboItem` y `CampaniaCombo`). Silencioso si ya no existe. */
export async function borrarComboDeTest(comboId) {
  await prisma.combo.delete({ where: { id: comboId } }).catch(() => {});
}

/**
 * Siembra un `DispositivoConocido` para una cuenta YA EXISTENTE (la de prueba
 * `test@test.com`), para que el login por UI no pida el código de acceso.
 * Devuelve el claro para la cookie y el id para borrarlo al terminar.
 */
export async function sembrarDispositivoDeTest(cuentaClienteId) {
  const tokenDispositivo = randomBytes(32).toString("base64url");
  const dispositivo = await prisma.dispositivoConocido.create({
    data: {
      cuentaClienteId,
      tokenHash: createHash("sha256").update(tokenDispositivo).digest("hex"),
      expiraEn: new Date(Date.now() + DURACION_DISPOSITIVO_MS),
    },
  });
  return { tokenDispositivo, dispositivoId: dispositivo.id };
}

export async function borrarDispositivoDeTest(dispositivoId) {
  await prisma.dispositivoConocido.delete({ where: { id: dispositivoId } }).catch(() => {});
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
 * @param {Date} [opciones.createdAt] cuándo entró la orden. `Orden.createdAt` es
 *   un `@default(now())` común (no un `@updatedAt`), así que se puede fijar en el
 *   `create` — y hace falta para que el filtro de PERÍODO de la grilla del admin
 *   sea decidible: sin una orden vieja de verdad, "Hoy" y "Todo" devuelven lo
 *   mismo y el test pasaría sin probar nada. Sin este campo, `now()`.
 * @param {Array<{productId: number, nombreProducto: string, precioUnitario: string, cantidad: number}>} opciones.items
 * @returns {Promise<object>} la orden creada, con `cliente` e `items` incluidos
 */
export async function crearOrdenDeTest({ clienteId, estado, createdAt, items } = {}) {
  const clienteIdFinal = clienteId ?? (await crearClienteDeTest()).id;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("crearOrdenDeTest requiere al menos un item en `items`.");
  }

  return prisma.orden.create({
    data: {
      clienteId: clienteIdFinal,
      estado: estado ?? "PENDIENTE",
      ...(createdAt ? { createdAt } : {}),
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
 * Crea una CuentaCliente de test vía Prisma directo — nunca por
 * POST /api/cuenta/registro, que además exige verificación de email y no
 * puede devolver el claro de un token para que un test lo use. Costo 11,
 * el mismo COSTO_BCRYPT de `lib/passwords.js` (Parte 1) — no un costo más
 * barato "porque es test": el flujo que se está probando es exactamente el
 * de producción, y bajar el costo acá invalidaría cualquier medición de
 * timing que un test hiciera sobre el login.
 *
 * @param {object} [opciones]
 * @param {string} [opciones.email]
 * @param {string} [opciones.password] clave en texto plano — se devuelve tal
 *   cual para que el spec pueda loguearse con ella por UI.
 * @param {string} [opciones.nombre]
 * @param {string} [opciones.telefono]
 * @param {string} [opciones.dni]
 * @param {boolean} [opciones.verificada=true]
 * @param {boolean} [opciones.conDispositivo=true] si crea también un
 *   DispositivoConocido, para que el login NO pida el código de acceso — la
 *   mayoría de los specs de cuenta no están probando el código, y sin esto
 *   cada login de fixture pagaría un paso extra que no le interesa.
 * @returns {Promise<{cuenta: object, password: string, tokenDispositivo: string|null}>}
 */
export async function crearCuentaClienteDeTest(opciones = {}) {
  const email = opciones.email ?? `e2e-test-cuenta-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
  const password = opciones.password ?? "clave-e2e-larga-2026";
  const verificada = opciones.verificada ?? true;
  const conDispositivo = opciones.conDispositivo ?? true;

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const cuenta = await prisma.cuentaCliente.create({
    data: {
      email,
      passwordHash,
      origenRegistro: "LOCAL",
      emailVerificado: verificada,
      nombre: opciones.nombre ?? `${MARCA_TEST}Cliente cuenta`,
      telefono: opciones.telefono ?? "1122334455",
      dni: opciones.dni ?? crearDniDeTest(),
    },
  });

  let tokenDispositivo = null;
  if (conDispositivo) {
    tokenDispositivo = randomBytes(32).toString("base64url");
    await prisma.dispositivoConocido.create({
      data: {
        cuentaClienteId: cuenta.id,
        tokenHash: createHash("sha256").update(tokenDispositivo).digest("hex"),
        expiraEn: new Date(Date.now() + DURACION_DISPOSITIVO_MS),
      },
    });
  }

  return { cuenta, password, tokenDispositivo };
}

/**
 * Siembra un TokenCuenta de un solo uso para una cuenta ya existente, y
 * devuelve el CLARO — el único punto donde un test puede tener ese claro,
 * porque `TokenCuenta.tokenHash` guarda sha256 del claro (Parte 1) y no hay
 * forma de recuperarlo leyendo la base después. El test arma el claro,
 * calcula su propio hash, y siembra el hash: exactamente lo que hace
 * `lib/tokensCuenta.js` en producción, solo que acá el "mail" es este
 * helper en vez de `email.service.js`.
 *
 * @param {object} opciones
 * @param {number} opciones.cuentaClienteId
 * @param {"VERIFICACION"|"RESET"|"CAMBIO_EMAIL"} opciones.tipo
 * @param {number} [opciones.minutosDeVida=60]
 * @param {string} [opciones.emailNuevo] solo para tipo CAMBIO_EMAIL
 * @returns {Promise<string>} el token en claro, para poner en la URL del spec
 */
export async function sembrarTokenDeTest({ cuentaClienteId, tipo, minutosDeVida = 60, emailNuevo }) {
  const tokenClaro = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(tokenClaro).digest("hex");

  await prisma.tokenCuenta.create({
    data: {
      cuentaClienteId,
      tipo,
      tokenHash,
      emailNuevo: emailNuevo ?? null,
      expiraEn: new Date(Date.now() + minutosDeVida * 60 * 1000),
    },
  });

  return tokenClaro;
}

/**
 * Siembra un CODIGO_ACCESO con un claro CONOCIDO ("123456" por default) —
 * distinto de `sembrarTokenDeTest`, porque acá el "claro" no es aleatorio:
 * es lo que el usuario tipea, y el spec necesita saber ese valor de
 * antemano para escribirlo en el input. El hash sigue el mismo esquema que
 * `lib/tokensCuenta.js` (`hashDeCodigo`, sha256 de `cuentaId:codigo`) — se
 * importa esa función en vez de reimplementar el hash a mano, para que un
 * cambio futuro del esquema de hash no desincronice el seed del test contra
 * el código real.
 *
 * @param {object} opciones
 * @param {number} opciones.cuentaClienteId
 * @param {string} [opciones.codigo="123456"]
 * @returns {Promise<string>} el código, tal cual se pasó (o el default)
 */
export async function sembrarCodigoAccesoDeTest({ cuentaClienteId, codigo = "123456" }) {
  await prisma.tokenCuenta.create({
    data: {
      cuentaClienteId,
      tipo: TIPOS_TOKEN.CODIGO_ACCESO,
      tokenHash: hashDeCodigo(cuentaClienteId, codigo),
      intentos: 0,
      expiraEn: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return codigo;
}

/**
 * Borra una CuentaCliente de test por id. Las hojas (TokenCuenta,
 * DispositivoConocido, IdentidadGoogle, ClaveIdempotencia) cuelgan con
 * onDelete: Cascade (Parte 1) y se van solas. Las Orden asociadas NO —
 * `Orden.cuentaCliente` es NoAction (mismo criterio que Cliente -> Orden) —
 * así que si el spec creó una orden real con esta cuenta, hay que
 * desvincularla o borrarla ANTES de llamar a este helper, o el delete falla
 * por FK. Silencioso si ya no existe, como el resto de sus hermanas.
 * @param {number} cuentaClienteId
 */
export async function borrarCuentaClienteDeTest(cuentaClienteId) {
  await prisma.cuentaCliente.delete({ where: { id: cuentaClienteId } }).catch(() => {});
}

/**
 * Crea una campaña de test directo vía Prisma.
 *
 * `Campania` no tiene default para `tipo`, `estado`, `desde` ni `hasta` (ver
 * `backend/prisma/schema.prisma`), así que los cuatro se completan acá — un
 * `create` sin ellos falla en la base, no en el test.
 *
 * ⚠️ **Los defaults dejan la campaña APAGADA** (`BORRADOR`, y un período de un
 * solo día que es hoy). Una campaña de test HABILITADA y vigente compite por el
 * Doodle y por el modal contra las campañas reales de la base de dev, y el modal
 * es `fixed inset-0`: intercepta el primer click de cualquier spec público. Un
 * spec que necesite verla activa lo pide explícito en `overrides`, y entonces se
 * hace cargo de que su recorrido cuente con el cartel.
 *
 * `prioridad` sí tiene default en la base (0). Un spec que necesite GANARLE al
 * resto de las campañas vigentes tiene que mandar una alta: el Doodle y el modal
 * son recursos exclusivos y los decide la prioridad, no el orden de creación.
 *
 * @param {object} [overrides] campos a pisar sobre los defaults
 * @returns {Promise<object>} la campaña creada
 */
export async function crearCampaniaDeTest(overrides = {}) {
  const hoy = claveDiaArgentino(new Date());

  const { desde, hasta, ...resto } = overrides;

  return prisma.campania.create({
    data: {
      nombre: `${MARCA_TEST}Campaña E2E`,
      tipo: "ESTACIONAL",
      estado: "BORRADOR",
      ...resto,
      // Van después del spread para poder aceptar la clave `AAAA-MM-DD` que
      // maneja la API, en vez de obligar al spec a construir el instante.
      desde: inicioDelDiaArgentino(desde ?? hoy),
      hasta: inicioDelDiaArgentino(hasta ?? hoy),
    },
  });
}

/**
 * Borra una campaña de test por id. Silencioso si ya no existe, como sus
 * hermanas.
 *
 * No hace falta borrar antes sus asociaciones: `CampaniaProducto` y
 * `CampaniaPromocion` cuelgan de `Campania` con `onDelete: Cascade`, así que se
 * van solas. Los productos y las promociones en sí NO se tocan — la asociación
 * es lo único que la campaña posee.
 * @param {number} campaniaId
 */
export async function borrarCampaniaDeTest(campaniaId) {
  await prisma.campania.delete({ where: { id: campaniaId } }).catch(() => {});
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
  // --- Cuentas de cliente (Parte 5), en orden de dependencia ---
  const cuentasDeTest = await prisma.cuentaCliente.findMany({
    where: { nombre: { startsWith: MARCA_TEST } },
    select: { id: true },
  });
  const idsCuentas = cuentasDeTest.map((c) => c.id);

  if (idsCuentas.length > 0) {
    await prisma.claveIdempotencia.deleteMany({ where: { cuentaClienteId: { in: idsCuentas } } });
    await prisma.dispositivoConocido.deleteMany({ where: { cuentaClienteId: { in: idsCuentas } } });
    await prisma.tokenCuenta.deleteMany({ where: { cuentaClienteId: { in: idsCuentas } } });
    await prisma.identidadGoogle.deleteMany({ where: { cuentaClienteId: { in: idsCuentas } } });
    // Orden.cuentaClienteId es NoAction (igual que Cliente -> Orden): se
    // desvincula, NO se borra la orden — una orden real es historial
    // comercial, y el checkout autenticado de un spec no la vuelve
    // descartable solo porque la cuenta que la generó era de test.
    await prisma.orden.updateMany({
      where: { cuentaCliente: { nombre: { startsWith: MARCA_TEST } } },
      data: { cuentaClienteId: null },
    });
    await prisma.cuentaCliente.deleteMany({ where: { nombre: { startsWith: MARCA_TEST } } });
  }

  // Órdenes de clientes de test, antes que los clientes (mismo motivo que
  // borrarOrdenDeTest: NoAction en Cliente -> Orden).
  const clientesDeTest = await prisma.cliente.findMany({
    where: { nombre: { startsWith: MARCA_TEST } },
    select: { id: true },
  });
  const idsClientes = clientesDeTest.map((c) => c.id);

  if (idsClientes.length > 0) {
    await prisma.orden.deleteMany({ where: { clienteId: { in: idsClientes } } }).catch(() => {});
    await prisma.cliente.deleteMany({ where: { id: { in: idsClientes } } }).catch(() => {});
  }

  // Campañas de test, ANTES que los productos: una campaña con la vitrina
  // sembrada es lo que más molesta si sobrevive (activa, compite por el Doodle y
  // por el modal, y el modal intercepta el primer click de todo spec público).
  //
  // ⚠️ NO hace falta borrar `CampaniaProducto` ni `CampaniaPromocion` acá: las
  // dos cuelgan de `Campania` con `onDelete: Cascade` y se van con ella. Un
  // `deleteMany` extra sobre esas tablas sería ruido que aparenta ser necesario.
  await prisma.campania.deleteMany({ where: { nombre: { startsWith: MARCA_TEST } } });

  // Combos de test ANTES que los productos: `ComboItem.productId` es
  // `NoAction` y bloquearía el borrado del producto.
  await prisma.combo.deleteMany({ where: { nombre: { startsWith: MARCA_TEST } } });

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

/**
 * Login de UI para un test que ya sembró una CuentaCliente con dispositivo
 * conocido (`crearCuentaClienteDeTest` con `conDispositivo: true`, el
 * default). Setea la cookie `dispositivo_cliente` ANTES de navegar —así el
 * login por UI no dispara el paso de código de acceso, que es un flujo
 * aparte cubierto por `cuenta-codigo.spec.js` (Tarea F)— y completa el
 * formulario de `/cuenta/entrar` con los labels reales de la Parte 4
 * (`Email`, `Contraseña`, botón `Iniciar sesión`).
 *
 * ⚠️ Chromium acepta cookies `Secure` sobre `http://localhost` (no todos los
 * motores lo hacen — Firefox históricamente las rechazaba sin HTTPS real).
 * Este proyecto E2E corre `chromium`/`mobile`, los dos sobre el motor
 * Chromium (ver playwright.config.js), así que `secure: true` acá refleja
 * el atributo real de la cookie de producción sin que el test necesite un
 * servidor HTTPS local.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} opciones
 * @param {string} opciones.email
 * @param {string} opciones.password
 * @param {string} opciones.tokenDispositivo el claro devuelto por
 *   `crearCuentaClienteDeTest`
 */
export async function iniciarSesionCliente(page, { email, password, tokenDispositivo }) {
  await page.context().addCookies([
    {
      name: COOKIE_DISPOSITIVO,
      value: tokenDispositivo,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    },
  ]);

  await page.goto("/cuenta/entrar");
  await page.getByLabel("Email", { exact: true }).fill(email);
  // `{ exact: true }` no es cosmético: `CampoPassword.jsx` dibuja un botón de
  // ojito con `aria-label="Mostrar contraseña"`, que `getByLabel("Contraseña")`
  // sin `exact` matchea por substring además del input — Playwright tira
  // "strict mode violation" con las dos coincidencias. Verificado corriendo
  // este helper contra la página real.
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).not.toHaveURL(/\/cuenta\/entrar$/);
}

/**
 * Simula un navegador donde `localStorage` está bloqueado (modo privado
 * agresivo, política de organización, storage lleno) — Playwright NO
 * expone un permiso `storage` para esto (a diferencia de geolocalización o
 * cámara), así que se logra reemplazando el accessor global ANTES de que
 * cargue cualquier script de la página, vía `addInitScript` (corre en cada
 * documento nuevo del contexto, incluida cada navegación).
 *
 * Sirve al spec `cuenta-checkout.spec.js` (Tarea F) para afirmar el
 * contrato de la spec (§ "🚪 El carrito"): `escribirCarrito` detecta el
 * storage no disponible y avisa ANTES de mandar a login, en vez de fallar
 * en silencio con un carrito que nunca se pudo guardar.
 *
 * @param {import('@playwright/test').BrowserContext} context
 */
export async function bloquearStorage(context) {
  await context.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("bloqueado");
      },
    });
  });
}

export { prisma };
