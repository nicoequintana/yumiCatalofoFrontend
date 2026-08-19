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

import { fetchAutenticado } from "./authClient.js";

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

/** Builds the shared `FormData` payload for create/update from the form's `data` shape. */
function construirFormData(data) {
  const fd = new FormData();

  if (data.nombre !== undefined) fd.append("nombre", data.nombre);
  if (data.descripcion !== undefined) fd.append("descripcion", data.descripcion ?? "");
  if (data.precio !== undefined) fd.append("precio", String(data.precio));
  if (data.etiqueta !== undefined && data.etiqueta !== null) fd.append("etiqueta", data.etiqueta);
  if (data.categoriaId !== undefined) {
    fd.append("categoriaId", data.categoriaId === null ? "" : data.categoriaId);
  }
  if (data.stock !== undefined) fd.append("stock", String(data.stock));

  if (data.fraseComercial !== undefined && data.fraseComercial !== null) {
    fd.append("fraseComercial", data.fraseComercial);
  }
  if (data.porQueLoVasAQuerer !== undefined && data.porQueLoVasAQuerer !== null) {
    fd.append("porQueLoVasAQuerer", data.porQueLoVasAQuerer);
  }
  if (data.tePasaEsto !== undefined && data.tePasaEsto !== null) {
    fd.append("tePasaEsto", data.tePasaEsto);
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
 * @returns {Promise<Array>} products from the backend. Pass admin:true to
 * include hidden products (used by admin screens). The remaining options
 * map 1:1 to the backend's public catalog filter query params (`categoria`,
 * `search`, `minPrecio`, `maxPrecio`) — omitted/empty values are left out of
 * the query string entirely.
 */
export async function getProducts({ admin = false, categoria, search, minPrecio, maxPrecio } = {}) {
  const params = new URLSearchParams();

  if (admin) params.set("admin", "1");
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
  return pedir(`${BASE}/products${query ? `?${query}` : ""}`);
}

/** @returns {Promise<Object|null>} a single product by id, or null if not found (404) */
export async function getProductById(id, { admin = false } = {}) {
  const query = admin ? "?admin=1" : "";
  const res = await fetch(`${BASE}/products/${id}${query}`);
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
