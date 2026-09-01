import { useEffect } from "react";

/**
 * Bloquea el scroll del body mientras `activo` es `true`, y restaura el valor
 * previo de `overflow` al desactivarse o al desmontar. Extraído del efecto
 * inline que ya usaba `Navbar.jsx` para su panel móvil (mismo comportamiento,
 * ahora reusable) — el drawer de `AdminSidebar.jsx` es el segundo consumidor:
 * con el body bloqueado, el gesto de scroll detrás del drawer movería
 * contenido que la persona no puede ver.
 *
 * @param {boolean} activo
 */
function useBloquearScroll(activo) {
  useEffect(() => {
    if (!activo) return undefined;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, [activo]);
}

export default useBloquearScroll;
