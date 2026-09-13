import { useEffect, useState } from "react";
import { getConfigContacto } from "../api/config.js";

/**
 * La configuración pública de contacto: WhatsApp (con horario ya resuelto),
 * mail, redes y dirección — lo que alimenta el pie del catálogo y, vía
 * `useWhatsapp`, el botón flotante y la "puerta" de WhatsApp de las pantallas
 * de bloqueo.
 *
 * PATRÓN MODULE-LEVEL, igual que `useContextoComercial`/`useCategoriasNavbar`:
 * un valor cacheado a nivel de módulo, un set de listeners y una única
 * promesa en vuelo — un solo fetch por carga de página aunque el Footer, el
 * FAB y `useWhatsapp` monten varias instancias a la vez.
 *
 * SIEMPRE público (sin token): a diferencia de `useContextoComercial`, acá no
 * hace falta keyear por identidad — `GET /config/contacto` sin
 * `Authorization` nunca trae `crudo`, así que el valor es el mismo para
 * cualquier visitante. La vista admin (con `crudo`) la pide aparte
 * `AdminContacto.jsx`, autenticada, sin pasar por este cache.
 *
 * Falla BLANDA (mismo criterio que la cinta de anuncios y el contexto
 * comercial): sin contacto configurado el pie simplemente no muestra la banda
 * de contacto, y `useWhatsapp` no arma el link. `error` distingue "todavía no
 * llegó" de "falló", para quien quiera mostrar algo distinto — hoy ningún
 * consumidor lo usa para bloquear la pantalla.
 */
const CONTACTO_VACIO = {
  whatsapp: { numero: null, dentroDeHorario: null, textoHorario: null },
  email: null,
  instagram: null,
  facebook: null,
  tiktok: null,
  direccion: null,
};

let contactoActual = CONTACTO_VACIO;
let resueltoActual = false;
let errorActual = null;
let promesaEnVuelo = null;
const listeners = new Set();

function estadoActual() {
  return { contacto: contactoActual, resuelto: resueltoActual, error: errorActual };
}

function notificar() {
  const estado = estadoActual();
  listeners.forEach((listener) => listener(estado));
}

function cargar() {
  if (promesaEnVuelo) return promesaEnVuelo;

  promesaEnVuelo = getConfigContacto()
    .then((data) => {
      contactoActual = data ?? CONTACTO_VACIO;
      resueltoActual = true;
      errorActual = null;
      notificar();
    })
    .catch(() => {
      // Falla blanda: el pie y el FAB de WhatsApp degradan a "no mostrar
      // nada", nunca tumban la página por esto.
      contactoActual = CONTACTO_VACIO;
      resueltoActual = true;
      errorActual = "No se pudo cargar la configuración de contacto.";
      notificar();
    });

  return promesaEnVuelo;
}

/** @returns {{contacto: object, resuelto: boolean, error: string|null}} */
export default function useConfigContacto() {
  const [estado, setEstado] = useState(estadoActual());

  useEffect(() => {
    listeners.add(setEstado);

    // Si el valor ya llegó mientras este componente no estaba montado, se
    // toma del cache: la notificación no vuelve a pasar.
    if (resueltoActual && !estado.resuelto) {
      setEstado(estadoActual());
    }

    cargar();

    return () => {
      listeners.delete(setEstado);
    };
    // Solo al montar, mismo criterio que `useContextoComercial`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return estado;
}

/** Vuelve el módulo a cero. Helper de tests, como `reiniciarContextoComercial`. */
export function reiniciarConfigContacto() {
  contactoActual = CONTACTO_VACIO;
  resueltoActual = false;
  errorActual = null;
  promesaEnVuelo = null;
  listeners.clear();
}
