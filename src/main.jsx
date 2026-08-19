import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
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
        <App />
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
