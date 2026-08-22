import { useEffect, useState } from "react";
import { getWhatsappConfig } from "../api/config.js";

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
 * Fetches `GET /api/config/whatsapp` once on mount (public, no auth). All
 * dynamic text (product name, current URL, favorite names) is run through
 * `encodeURIComponent` before being embedded in the `wa.me` URL — required,
 * since product names are free text entered by admins and could otherwise
 * break the URL or inject unexpected query params.
 */
function useWhatsapp(contexto) {
  const [config, setConfig] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    getWhatsappConfig()
      .then((data) => {
        if (!activo) return;
        setConfig(data);
      })
      .catch(() => {
        // Soft feature — if config fails to load, the FAB simply doesn't
        // render a usable link (numero stays null) instead of crashing.
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, []);

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
    cargando,
    dentroDeHorario: config?.dentroDeHorario ?? null,
    textoHorario: config?.textoHorario ?? null,
  };
}

export default useWhatsapp;
