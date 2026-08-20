/**
 * Real REST client for the `/api/products` backend (Express + Prisma +
 * SQL Server + Google Drive). Every export here preserves the exact
 * signature the mock localStorage implementation used, so page components
 * (`Catalogo.jsx`, `ProductoDetalle.jsx`, `AdminProductos.jsx`,
 * `AdminProductoForm.jsx`) required zero call-site changes for this swap
 * (design.md "Frontend products.js Rewrite").
 *
 * `resetStore` is intentionally NOT ported — reseeding is CLI-only
 * (`npx prisma db seed`), per design D7 / spec's "Restaurar datos de
 * ejemplo removed (FINAL)". A real, unauthenticated backend must not expose
 * a destructive reseed action to any UI visitor.
 */

import { fetchAutenticado, getToken } from "./authClient.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/**
 * Shared fetch helper. Parses the JSON body and throws a plain `Error` with
 * the backend's Spanish message on non-2xx responses, so existing
 * `catch (err) => setError(err.message)` call sites keep working unchanged.
 */
async function pedir(url, options) {
  const res = await fetch(url, options);

  // 204/empty-body responses (none currently exist, but keep this safe).
  const texto = await res.text();
  const body = texto ? JSON.parse(texto) : null;

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/** Igual que `pedir`, pero usa el wrapper autenticado (agrega el JWT y maneja 401). */
async function pedirAutenticado(url, options) {
  const res = await fetchAutenticado(url, options);

  const texto = await res.text();
  const body = texto ? JSON.parse(texto) : null;

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/**
 * Opciones de fetch para las dos lecturas de producto (`getProducts` /
 * `getProductById`) cuando la pantalla pide modo admin: adjunta el JWT para que
 * el backend habilite la vista privilegiada (productos ocultos y agotados).
 *
 * El backend deriva ese modo del token verificado y NO de `?admin=1` — antes
 * alcanzaba con el parámetro, que viaja en este mismo bundle público, así que
 * cualquiera podía leer los productos que el admin había ocultado.
 *
 * A propósito NO usa `fetchAutenticado`: ese wrapper limpia el token y redirige
 * a `/catalogo/admin/login` ante un 401, y estos dos endpoints son PÚBLICOS —
 * los llaman también `Coleccion.jsx`, `ProductoDetalle.jsx` y el bento de la
 * home. Un 401 nunca llega desde acá (el backend degrada a anónimo en vez de
 * cortar), pero atar una lectura pública a un redirect al login del admin sería
 * un bug de navegación esperando a pasar.
 *
 * Devuelve `undefined` —no un objeto vacío— cuando no hay nada que mandar, para
 * que la llamada pública quede idéntica a la de antes.
 *
 * La lectura del token va en try/catch porque `localStorage` puede lanzar
 * (navegación privada, almacenamiento bloqueado por política del sitio): un
 * catálogo que no puede leer el storage tiene que seguir cargando como anónimo,
 * no romperse.
 */
function opcionesDeAdmin(admin) {
  if (!admin) return undefined;

  let token = null;
  try {
    token = getToken();
  } catch {
    token = null;
  }

  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

/** Builds the shared `FormData` payload for create/update from the form's `data` shape. */
export function construirFormData(data) {
  const fd = new FormData();

  if (data.nombre !== undefined) fd.append("nombre", data.nombre);
  if (data.descripcion !== undefined) fd.append("descripcion", data.descripcion ?? "");
  if (data.precio !== undefined) fd.append("precio", String(data.precio));
  if (data.etiqueta !== undefined && data.etiqueta !== null) fd.append("etiqueta", data.etiqueta);
  if (data.categoriaId !== undefined) {
    fd.append("categoriaId", data.categoriaId === null ? "" : data.categoriaId);
  }
  if (data.stock !== undefined) fd.append("stock", String(data.stock));

  // Estos tres campos deben poder vaciarse explícitamente desde el form de
  // edición — se manda "" en vez de omitir el campo cuando es null, y el
  // backend ya trata "" como clear -> null (mismo `?.trim() || null` que
  // usa al crear el producto).
  if (data.fraseComercial !== undefined) {
    fd.append("fraseComercial", data.fraseComercial ?? "");
  }
  if (data.porQueLoVasAQuerer !== undefined) {
    fd.append("porQueLoVasAQuerer", data.porQueLoVasAQuerer ?? "");
  }
  if (data.tePasaEsto !== undefined) {
    fd.append("tePasaEsto", data.tePasaEsto ?? "");
  }
  if (data.beneficios !== undefined) fd.append("beneficios", JSON.stringify(data.beneficios));
  if (data.usos !== undefined) fd.append("usos", JSON.stringify(data.usos));
  if (data.idealPara !== undefined) fd.append("idealPara", JSON.stringify(data.idealPara));
  if (data.incluye !== undefined) fd.append("incluye", JSON.stringify(data.incluye));
  if (data.especificaciones !== undefined) {
    fd.append("especificaciones", JSON.stringify(data.especificaciones));
  }

  if (data.caracteristicas !== undefined) {
    fd.append("caracteristicas", JSON.stringify(data.caracteristicas.map((c) => ({ texto: c.texto }))));
  }

  if (data.fotosExistentes !== undefined) {
    fd.append("fotosExistentes", JSON.stringify(data.fotosExistentes));
  }

  // Secuencia final completa (existentes + nuevas intercaladas). Sin esto el
  // backend deja las fotos nuevas al final y no puede persistir un reordenado,
  // así que no habría forma de subir una foto nueva como portada.
  if (data.ordenFotos !== undefined) {
    fd.append("ordenFotos", JSON.stringify(data.ordenFotos));
  }

  for (const file of data.fotosNuevas ?? []) {
    fd.append("fotos", file);
  }

  if (data.videoNuevo) {
    fd.append("video", data.videoNuevo);
  } else if (data.eliminarVideo) {
    fd.append("eliminarVideo", "true");
  }

  return fd;
}

/**
 * Tope de ids por request, en espejo con `MAX_IDS_LISTADO` de
 * `backend/src/controllers/products.controller.js`. El backend responde 400 si
 * se lo pasa (a propósito: truncar en silencio borraría líneas de un carrito),
 * así que `getProductsByIds` parte la lista en tandas de este tamaño.
 *
 * Es una sincronización manual entre repos de frontend y backend, igual que la
 * lista de bots de `botDetector.js` ↔ `nginx.conf`: si allá sube el tope, acá
 * hay que subirlo también.
 */
export const MAX_IDS_POR_CONSULTA = 100;

/**
 * @returns {Promise<{data: Array, page: number, pageSize: number, total: number}>}
 * una PÁGINA de productos, no el catálogo entero. El sobre es el mismo que
 * usa `GET /ordenes`; quien solo quiera las filas tiene que leer `.data`.
 *
 * `admin: true` pide la vista del panel (incluye ocultos y agotados) y adjunta
 * el JWT del admin. Sin sesión válida el backend responde 200 igual, pero con
 * el listado público: la vista privilegiada la otorga el token, no el
 * parámetro `?admin=1`. The remaining options map 1:1 to the backend's public
 * catalog filter query params (`categoria`, `search`, `minPrecio`, `maxPrecio`) — omitted/empty
 * values are left out of the query string entirely.
 *
 * `destacado: true` trae solo los productos destacados (el bento), y
 * `orden: "vistas"` ordena por más visto (la pantalla de métricas).
 *
 * `ids` (array de números) restringe la respuesta a esos productos concretos
 * y saltea la paginación: se compone con el resto de los filtros y con las
 * guardas públicas de visibilidad/stock del backend, así que "no vino en la
 * respuesta" sigue significando lo mismo que en el listado completo. Para
 * listas largas usar `getProductsByIds`, que respeta el tope del backend.
 */
export async function getProducts({
  admin = false,
  categoria,
  search,
  minPrecio,
  maxPrecio,
  ids,
  destacado,
  orden,
  page,
  pageSize,
} = {}) {
  const params = new URLSearchParams();

  if (admin) params.set("admin", "1");
  if (Array.isArray(ids)) params.set("ids", ids.join(","));
  if (destacado) params.set("destacado", "1");
  if (orden !== undefined && orden !== null && orden !== "") params.set("orden", orden);
  if (page !== undefined && page !== null && page !== "") params.set("page", String(page));
  if (pageSize !== undefined && pageSize !== null && pageSize !== "") {
    params.set("pageSize", String(pageSize));
  }
  if (categoria !== undefined && categoria !== null && categoria !== "") {
    params.set("categoria", categoria);
  }
  if (search !== undefined && search !== null && search !== "") {
    params.set("search", search);
  }
  if (minPrecio !== undefined && minPrecio !== null && minPrecio !== "") {
    params.set("minPrecio", minPrecio);
  }
  if (maxPrecio !== undefined && maxPrecio !== null && maxPrecio !== "") {
    params.set("maxPrecio", maxPrecio);
  }

  const query = params.toString();
  return pedir(`${BASE}/products${query ? `?${query}` : ""}`, opcionesDeAdmin(admin));
}

/**
 * Trae exactamente los productos de `ids`, en tandas de `MAX_IDS_POR_CONSULTA`.
 *
 * Existe para carrito, checkout y favoritos: los tres tienen una lista de ids
 * en `localStorage` y antes se bajaban el catálogo completo para cruzarlo del
 * lado del cliente — en el checkout eso significaba descargar todo el catálogo
 * para cotizar tres líneas.
 *
 * Con la lista vacía no hace ninguna request: no hay nada que pedir, y mandar
 * `?ids=` igual sería un viaje perdido.
 *
 * @param {number[]} ids
 * @returns {Promise<Array>} los productos encontrados (los ids inexistentes,
 *   ocultos o agotados simplemente no aparecen, igual que en el listado)
 */
export async function getProductsByIds(ids, { admin = false } = {}) {
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const tandas = [];
  for (let inicio = 0; inicio < ids.length; inicio += MAX_IDS_POR_CONSULTA) {
    tandas.push(ids.slice(inicio, inicio + MAX_IDS_POR_CONSULTA));
  }

  const respuestas = await Promise.all(tandas.map((tanda) => getProducts({ admin, ids: tanda })));
  return respuestas.flatMap((respuesta) => respuesta.data);
}

/**
 * @returns {Promise<Object|null>} a single product by id, or null if not found (404)
 *
 * `admin: true` adjunta el JWT y es lo único que permite abrir la ficha de un
 * producto oculto (`visibleEnCatalogo: false`): sin sesión válida el backend
 * responde 404, igual que a cualquier visitante.
 */
export async function getProductById(id, { admin = false } = {}) {
  const query = admin ? "?admin=1" : "";
  const res = await fetch(`${BASE}/products/${id}${query}`, opcionesDeAdmin(admin));
  if (res.status === 404) return null;

  const texto = await res.text();
  const body = texto ? JSON.parse(texto) : null;
  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }
  return body;
}

/** @returns {Promise<Object>} the newly created product */
export async function createProduct(data) {
  return pedirAutenticado(`${BASE}/products`, {
    method: "POST",
    body: construirFormData(data),
  });
}

/** @returns {Promise<Object>} the updated product */
export async function updateProduct(id, data) {
  return pedirAutenticado(`${BASE}/products/${id}`, {
    method: "PUT",
    body: construirFormData(data),
  });
}

/** @returns {Promise<{ok: true}>} */
export async function deleteProduct(id) {
  return pedirAutenticado(`${BASE}/products/${id}`, { method: "DELETE" });
}

/** @returns {Promise<Object>} the updated product, with its new visibleEnCatalogo value */
export async function updateVisibilidad(id, visibleEnCatalogo) {
  return pedirAutenticado(`${BASE}/products/${id}/visibilidad`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visibleEnCatalogo }),
  });
}

/**
 * @param {number} id
 * @param {{destacado?: boolean, orden?: number}} cambios at least one of the two
 * @returns {Promise<Object>} the updated product, with its new destacado/orden values
 */
export async function updateMerchandising(id, cambios) {
  return pedirAutenticado(`${BASE}/products/${id}/merchandising`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cambios),
  });
}

/** @returns {Promise<Object>} the product with the photo removed and `orden` re-normalized */
export async function deletePhoto(productId, fotoId) {
  return pedirAutenticado(`${BASE}/products/${productId}/fotos/${fotoId}`, { method: "DELETE" });
}

/** Fire-and-forget: increments the product's share counter. Never throws. */
export async function registrarCompartido(id) {
  try {
    await fetch(`${BASE}/products/${id}/compartir`, { method: "POST" });
  } catch {
    // Soft analytics counter — a failed request here must never disrupt
    // the actual share action the user just completed.
  }
}

/** Fire-and-forget: increments the product's favoritos counter. Never throws. */
export async function registrarFavorito(id) {
  try {
    await fetch(`${BASE}/products/${id}/favorito`, { method: "POST" });
  } catch {
    // Soft analytics counter — a failed request here must never disrupt
    // the local favorite toggle the user just completed.
  }
}

/** Fire-and-forget: logs a traffic event (e.g. CLICK_WHATSAPP). Never throws. */
export async function registrarEvento(tipo, productId) {
  try {
    await fetch(`${BASE}/eventos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productId !== undefined ? { tipo, productId } : { tipo }),
    });
  } catch {
    // Soft analytics counter — a failed request here must never disrupt
    // the actual action (opening WhatsApp) the user just triggered.
  }
}
