import { Component } from "react";

/**
 * Límite de error (error boundary) de la aplicación.
 *
 * Sin uno, cualquier excepción lanzada durante el render desmonta el árbol
 * entero de React y deja una pantalla en blanco: ni mensaje, ni forma de
 * recuperarse, ni pista de qué pasó. Hay disparadores reales — por ejemplo
 * una respuesta de la API con una forma inesperada llegando a
 * `FichaProducto`, o un chunk de `React.lazy` que no baja.
 *
 * Tiene que ser un componente de clase: React no expone un equivalente en
 * hooks para `getDerivedStateFromError` / `componentDidCatch`. Es la única
 * clase del proyecto, y es a propósito.
 *
 * Reporte: el frontend no tiene un canal propio de reporte de errores (el
 * modelo `ErrorLog` lo escribe el manejador global de Express, solo para
 * errores del backend), así que el detalle va a la consola del navegador. No
 * se inventa acá un endpoint nuevo.
 *
 * @param {object} props
 * @param {import("react").ReactNode} props.children contenido protegido.
 * @param {import("react").ReactNode} [props.fallback] qué mostrar cuando el
 *   contenido falló. Si se omite, se usa la pantalla completa pensada para el
 *   catálogo público.
 * @param {unknown} [props.claveDeReinicio] cuando cambia, el límite vuelve a
 *   intentar renderizar sus hijos. El admin le pasa la ruta actual: así, si
 *   una pantalla rompe, navegar a otra desde la sidebar recupera el panel sin
 *   recargar. Sin esto el fallback quedaría pegado para siempre, porque un
 *   límite de error no se resetea solo al cambiar de ruta.
 */
class LimiteDeError extends Component {
  constructor(props) {
    super(props);
    this.state = { hayError: false, claveDeReinicio: props.claveDeReinicio };
  }

  static getDerivedStateFromError() {
    return { hayError: true };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.claveDeReinicio !== state.claveDeReinicio) {
      return { hayError: false, claveDeReinicio: props.claveDeReinicio };
    }
    return null;
  }

  componentDidCatch(error, info) {
    // `componentStack` es lo único que dice en qué componente se rompió: el
    // stack del `Error` solo apunta al bundle compilado.
    console.error("Error no controlado en el árbol de React:", error, info?.componentStack);
  }

  render() {
    if (!this.state.hayError) {
      return this.props.children;
    }

    return this.props.fallback ?? <PantallaDeError />;
  }
}

/**
 * Fallback por defecto: pantalla completa para el catálogo público. Le habla
 * a un cliente real — dice qué pasó, que sus datos locales siguen ahí y le da
 * una acción concreta. Nunca muestra el stack del error.
 *
 * Recarga con `window.location.reload()` a propósito, no con un reintento en
 * memoria: si el estado de la app quedó corrupto, volver a montar el mismo
 * árbol roto suele fallar otra vez.
 */
function PantallaDeError() {
  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-margin-mobile py-16 text-center"
    >
      <span className="material-symbols-outlined text-[48px] text-primary" aria-hidden="true">
        sentiment_dissatisfied
      </span>
      <h1 className="font-headline-lg text-headline-lg text-on-background">
        Algo se rompió de nuestro lado
      </h1>
      <p className="font-body-md text-body-md max-w-md text-on-surface-variant">
        No pudimos mostrar esta pantalla. Probá recargar la página: tu carrito y tus favoritos
        siguen guardados en este navegador.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="font-label-md text-label-md mt-2 inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container"
      >
        Recargar la página
      </button>
    </div>
  );
}

export default LimiteDeError;
