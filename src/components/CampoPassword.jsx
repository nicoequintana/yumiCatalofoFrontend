import { useId, useState } from "react";

/**
 * Campo de contraseña con el ojito para verla.
 *
 * Resuelve dos cosas que van juntas a propósito, porque son las dos que hay que
 * acertar en TODO campo de contraseña:
 *
 * 1. **Mostrar/ocultar.** Sin esto, una contraseña larga tipeada a ciegas se
 *    corrige borrando todo y empezando de nuevo.
 * 2. **Declararle al navegador qué clase de campo es** (`autoComplete`). Sin
 *    eso, el navegador adivina — y adivina "login": el alta de usuarios de
 *    `AdminUsuarios` venía rellenándose sola con la credencial del admin que
 *    estaba en sesión, porque un `type="email"` seguido de un `type="password"`
 *    sin declarar nada es exactamente la forma de un formulario de ingreso.
 *
 * `autoComplete` es **obligatorio y sin valor por defecto**, y eso es
 * deliberado: un default cualquiera reintroduciría el bug en el próximo campo
 * que alguien agregue sin pensarlo. Hay que elegir en cada uso —
 * `current-password` donde se ingresa una que ya existe (el login),
 * `new-password` donde se define una nueva (alta y edición de usuarios).
 *
 * El estado de "visible" es local a cada instancia: dos campos en la misma
 * pantalla (el alta y la edición de una fila) tienen que abrirse por separado.
 *
 * @param {string} value
 * @param {(valor: string) => void} onChange recibe el valor, no el evento
 * @param {string} etiqueta nombre accesible del campo; también nombra al ojito
 * @param {string} autoComplete `current-password` | `new-password` — obligatorio
 * @param {boolean} [required]
 * @param {string} [placeholder]
 * @param {string} [className] REEMPLAZA la apariencia del `<input>` (borde,
 *   fondo, padding). Las clases estructurales se agregan igual — ver abajo.
 * @param {string} [etiquetaClassName] reemplaza el estilo del `<label>` visible
 * @param {string} [contenedorClassName] clases del envoltorio
 * @param {boolean} [etiquetaVisible] renderiza un `<label>` arriba en vez de `sr-only`
 */

/**
 * Lo que el componente necesita para funcionar, pase lo que pase.
 *
 * Va SEPARADO de la apariencia porque `className` la reemplaza en vez de
 * concatenarse: dos clases de Tailwind en conflicto (`py-2` y `py-3`) no se
 * resuelven por el orden en el atributo sino por el orden en el CSS generado,
 * así que concatenar deja al azar cuál gana. `pr-12` en particular no es
 * negociable — es el hueco donde vive el ojito, y sin él se superpone al texto.
 */
const CLASES_ESTRUCTURA = "w-full pr-12";

/** Apariencia por defecto: la del resto del panel admin. */
const CLASES_APARIENCIA =
  "font-body-md text-body-md rounded-lg border border-outline-variant bg-surface py-3 pl-4 text-on-surface focus:border-primary focus:outline-none";

function CampoPassword({
  value,
  onChange,
  etiqueta,
  autoComplete,
  required = false,
  placeholder,
  className,
  etiquetaClassName,
  contenedorClassName = "",
  etiquetaVisible = false,
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  const accion = `${visible ? "Ocultar" : "Mostrar"} ${etiqueta.toLowerCase()}`;

  return (
    <div className={`relative ${contenedorClassName}`}>
      <label
        htmlFor={id}
        className={
          etiquetaVisible
            ? (etiquetaClassName ??
              "font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface")
            : "sr-only"
        }
      >
        {etiqueta}
      </label>

      <div className="relative">
        <input
          id={id}
          // El `type` es lo único que cambia al revelar. No se reemplaza el
          // input por otro: React lo remontaría y se perdería el foco y la
          // posición del cursor a mitad de tipeo.
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${CLASES_ESTRUCTURA} ${className ?? CLASES_APARIENCIA}`}
        />

        <button
          // `type="button"` explícito: un `<button>` sin type adentro de un
          // `<form>` es submit por default, así que tocar el ojito para revisar
          // lo tipeado enviaría el formulario. En el login eso gasta un intento
          // contra un rate limit de 8 cada 15 minutos.
          type="button"
          onClick={() => setVisible((actual) => !actual)}
          aria-label={accion}
          title={accion}
          // Fuera del tabulado: es una ayuda visual, y quien navega con teclado
          // no necesita cruzarla para llegar al botón de enviar.
          tabIndex={-1}
          className="absolute right-0 top-0 flex h-full w-12 items-center justify-center rounded-r-lg text-on-surface-variant hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            {visible ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
    </div>
  );
}

export default CampoPassword;
