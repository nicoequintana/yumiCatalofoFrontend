import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import ModalCampania from "./ModalCampania.jsx";
import { registrarEventoComercial } from "../api/campanias.js";
import useContextoComercial from "../hooks/useContextoComercial.js";
import useModalCampania from "../hooks/useModalCampania.js";

/**
 * Decide si el cartel estacional aparece, y lo monta.
 *
 * Vive separado de `ModalCampania` para que ese componente sea puramente
 * visual: recibe un modal y lo pinta. Acá está toda la decisión —hay campaña,
 * no estamos en el panel, no se vio hoy—, que es lo que se puede equivocar.
 *
 * SE MONTA EN `Layout`, o sea en todas las páginas públicas y una sola vez.
 * Ponerlo en la home dejaría afuera a quien entra directo a una ficha desde una
 * búsqueda, que es por donde llega buena parte del tráfico.
 *
 * Ese montaje único es también lo que acota el tope de "una vez por día" de
 * `useModalCampania`: como este componente no se desmonta al navegar dentro de
 * la SPA, cerrar el cartel no lo hace reaparecer navegando el sitio — hace
 * falta una carga completa nueva Y que cambie el día (o la campaña).
 *
 * NO se muestra en el panel: `/catalogo/admin/*` usa este mismo `Layout` para
 * el login, y a alguien que va a laburar no se le interrumpe con la vidriera.
 * Mismo guard que `BarraAnuncios`.
 */
export default function CampaniaModalMontado() {
  const { pathname } = useLocation();
  const { modal, claveDia } = useContextoComercial();

  const esAdmin = pathname.startsWith("/catalogo/admin");
  const { visible, cerrar } = useModalCampania(esAdmin ? null : modal, claveDia);

  // La impresión va acá y no en `ModalCampania` porque este componente decide
  // el MONTAJE y el otro se re-renderiza. El ref evita contar dos veces si
  // React vuelve a correr el efecto sin que el cartel se haya cerrado.
  const impreso = useRef(false);
  useEffect(() => {
    if (!visible || !modal || impreso.current) return;
    impreso.current = true;
    registrarEventoComercial({
      tipo: "IMPRESION_COMERCIAL",
      origen: "MODAL",
      campaniaId: modal.campaniaId,
    });
  }, [visible, modal]);

  if (!visible || !modal) return null;

  return <ModalCampania modal={modal} onCerrar={cerrar} />;
}
