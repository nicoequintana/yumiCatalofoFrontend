import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import CintaAmbiente from "./components/CintaAmbiente.jsx";
import LimiteDeError from "./components/LimiteDeError.jsx";
import { aplicarTemaGuardado } from "./hooks/useTemaAdmin.js";
import { ToastProvider } from "./context/ToastContext.jsx";

// Paint the admin's saved dark theme before React mounts, otherwise the
// panel flashes the light palette for one frame on every reload. Gated on the
// admin path so the public catalog is never affected: dark mode is an
// admin-only, per-browser preference (see hooks/useTemaAdmin.js).
if (window.location.pathname.startsWith("/catalogo/admin")) {
  aplicarTemaGuardado();
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        {/* Va acá y no dentro de `Layout`/`AdminLayout` por dos razones: cubre
            el catálogo y el panel de una sola vez sin tocar ninguno de los dos,
            y queda FUERA del límite de error — si una pantalla revienta, el
            aviso de que esto es testing tiene que seguir en pantalla. En
            producción no renderiza nada; ver `CintaAmbiente.jsx`. */}
        <CintaAmbiente />
        {/* Última línea de defensa: sin esto, cualquier excepción durante el
            render deja al visitante frente a una página en blanco. */}
        <LimiteDeError>
          <App />
        </LimiteDeError>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
