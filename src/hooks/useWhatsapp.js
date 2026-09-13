import useConfigContacto from "./useConfigContacto.js";

const MAX_FAVORITOS_EN_MENSAJE = 5;

function mensajeHome() {
  return "¡Hola! Vi el catálogo y quiero hacer una consulta.";
}

function mensajeProducto(nombre) {
  const url = window.location.href;
  return `¡Hola! Quiero consultar por este producto: ${nombre} (${url})`;
}

function mensajeFavoritos(nombres) {
  if (nombres.length === 0) {
    return "¡Hola! Quiero consultar por mis productos favoritos.";
  }

  const visibles = nombres.slice(0, MAX_FAVORITOS_EN_MENSAJE);
  const restantes = nombres.length - visibles.length;
  const lista = restantes > 0 ? `${visibles.join(", ")} y ${restantes} más` : visibles.join(", ");

  return `¡Hola! Quiero consultar por estos productos: ${lista}`;
}

/**
 * Builds the `wa.me` contact URL + business-hours info for the floating
 * WhatsApp button, depending on which page it's shown on.
 *
 * `contexto` shapes:
 *   { tipo: "home" }
 *   { tipo: "producto", producto: { nombre } }
 *   { tipo: "favoritos", productos: [{ nombre }, ...] }
 *
 * DEJÓ DE PEDIR SU PROPIA CONFIG (`GET /config/whatsapp`) EL 13/09/2026: ahora
 * consume `useConfigContacto`, el mismo cache module-level que alimenta el
 * pie del catálogo (`GET /config/contacto`, que ya incluye `whatsapp` con el
 * horario resuelto). Antes cada instancia de este hook —y había varias por
 * página, uno por FAB montado— disparaba su PROPIO fetch sin deduplicar; con
 * el pie sumando un consumidor más, eso hubiera sido una request de más por
 * carga. La forma que devuelve el hook (`{url, cargando, dentroDeHorario,
 * textoHorario}`) no cambió: `BotonWhatsapp`, `PuertaWhatsApp` y `MiCuenta`
 * siguen andando sin tocarlos.
 */
function useWhatsapp(contexto) {
  const { contacto, resuelto } = useConfigContacto();
  const config = contacto?.whatsapp;

  let mensaje = mensajeHome();
  if (contexto?.tipo === "producto" && contexto.producto) {
    mensaje = mensajeProducto(contexto.producto.nombre);
  } else if (contexto?.tipo === "favoritos") {
    mensaje = mensajeFavoritos((contexto.productos ?? []).map((p) => p.nombre));
  }

  const numero = config?.numero;
  const url = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}` : null;

  return {
    url,
    cargando: !resuelto,
    dentroDeHorario: config?.dentroDeHorario ?? null,
    textoHorario: config?.textoHorario ?? null,
  };
}

export default useWhatsapp;
