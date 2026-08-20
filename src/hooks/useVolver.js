import { useLocation, useNavigate } from "react-router-dom";

/**
 * Vuelve al historial interno de la SPA con navigate(-1). Si no hay
 * historial interno (ej. se entró directo por un link compartido de
 * WhatsApp/redes a /producto/:id), location.key es "default" —
 * navigate(-1) ahí sacaría al usuario del sitio en vez de navegar. En ese
 * caso cae al fallback (por defecto "/", el catálogo).
 */
export function useVolver(fallback = "/") {
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    if (location.key === "default") {
      navigate(fallback);
    } else {
      navigate(-1);
    }
  };
}
