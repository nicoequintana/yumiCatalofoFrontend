import { useEffect, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import Spinner from "../../components/Spinner.jsx";
import { getConfigContactoAdmin, putConfigContacto } from "../../api/config.js";
import { useToast } from "../../context/useToast.js";

/**
 * `/catalogo/admin/configuracion/contacto` — lo que ve el catálogo público en
 * el pie, en el botón de WhatsApp y en la "puerta" de las pantallas de
 * bloqueo. Edita `ConfiguracionContacto` (fila única) vía
 * `GET`/`PUT /config/contacto`.
 *
 * Carga la vista ADMIN (`crudo`, sin fallback a `.env`): el formulario edita
 * lo que hay REALMENTE guardado, no el valor resuelto que ve el catálogo
 * público (que puede venir del entorno mientras nadie guardó todavía).
 */

// Mismos NUEVE campos que `crudo` (`config.controller.js` → `construirCrudo`).
const CRUDO_VACIO = {
  whatsappNumero: null,
  whatsappHoraDesde: null,
  whatsappHoraHasta: null,
  whatsappDias: null,
  email: null,
  instagramUrl: null,
  facebookUrl: null,
  tiktokUrl: null,
  direccion: null,
};

// L M M J V S D — mismo orden que el mockup. El valor es el número de día que
// espera el backend (`whatsappDias`, CSV de 0-6): 0=domingo..6=sábado, igual
// que `Date.getDay()` (ver `backend/src/lib/horarioAtencion.js`). "Martes" y
// "Miércoles" comparten letra visible pero necesitan `aria-label` propio.
const DIAS = [
  { letra: "L", valor: 1, nombre: "Lunes" },
  { letra: "M", valor: 2, nombre: "Martes" },
  { letra: "M", valor: 3, nombre: "Miércoles" },
  { letra: "J", valor: 4, nombre: "Jueves" },
  { letra: "V", valor: 5, nombre: "Viernes" },
  { letra: "S", valor: 6, nombre: "Sábado" },
  { letra: "D", valor: 0, nombre: "Domingo" },
];

// Espejan las validaciones de `config.controller.js` — mismo criterio que
// `LARGO_MAX` en `AdminAnuncios.jsx`: la autoridad sigue siendo el backend,
// esto solo da el mensaje de inmediato sin esperar el viaje de ida y vuelta.
const REGEX_TELEFONO = /^\d{10,15}$/;
const REGEX_EMAIL = /^\S+@\S+\.\S+$/;
const LARGO_MAX_EMAIL = 255;
const LARGO_MAX_URL_SOCIAL = 300;
const LARGO_MAX_DIRECCION = 300;

function esUrlHttpsValida(valor) {
  try {
    return new URL(valor).protocol === "https:";
  } catch {
    return false;
  }
}

function diasDesdeCsv(csv) {
  if (typeof csv !== "string" || csv.trim() === "") return [];
  return csv
    .split(",")
    .map((d) => Number(d.trim()))
    .filter((d) => !Number.isNaN(d));
}

const claseInput =
  "font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none";
const claseLabel = "font-label-md text-label-md text-on-surface-variant";
const claseFieldset =
  "flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5";
const claseLegend = "font-label-lg text-label-lg px-1 text-on-surface";

function AdminContacto() {
  const { mostrarToast } = useToast();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintento, setReintento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [erroresCampos, setErroresCampos] = useState({});

  const [crudo, setCrudo] = useState(CRUDO_VACIO);
  const [whatsappNumero, setWhatsappNumero] = useState("");
  const [whatsappHoraDesde, setWhatsappHoraDesde] = useState("");
  const [whatsappHoraHasta, setWhatsappHoraHasta] = useState("");
  const [dias, setDias] = useState([]);
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);

    getConfigContactoAdmin()
      .then((data) => {
        if (!activo) return;
        const c = data?.crudo ?? CRUDO_VACIO;
        setCrudo(c);
        setWhatsappNumero(c.whatsappNumero ?? "");
        setWhatsappHoraDesde(c.whatsappHoraDesde != null ? String(c.whatsappHoraDesde) : "");
        setWhatsappHoraHasta(c.whatsappHoraHasta != null ? String(c.whatsappHoraHasta) : "");
        setDias(diasDesdeCsv(c.whatsappDias));
        setEmail(c.email ?? "");
        setDireccion(c.direccion ?? "");
        setInstagramUrl(c.instagramUrl ?? "");
        setFacebookUrl(c.facebookUrl ?? "");
        setTiktokUrl(c.tiktokUrl ?? "");
        setCargando(false);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err.message ?? "No se pudo cargar la configuración de contacto.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [reintento]);

  function alternarDia(valor) {
    setDias((actuales) =>
      actuales.includes(valor) ? actuales.filter((d) => d !== valor) : [...actuales, valor],
    );
  }

  function validar() {
    const errores = {};

    if (whatsappNumero.trim() !== "" && !REGEX_TELEFONO.test(whatsappNumero.trim())) {
      errores.whatsappNumero =
        "El número de WhatsApp debe tener solo dígitos, entre 10 y 15 (formato internacional sin \"+\").";
    }

    const desde = whatsappHoraDesde === "" ? null : Number(whatsappHoraDesde);
    const hasta = whatsappHoraHasta === "" ? null : Number(whatsappHoraHasta);
    if (desde !== null && (!Number.isInteger(desde) || desde < 0 || desde > 23)) {
      errores.whatsappHoraDesde = "Desde debe ser un número entero entre 0 y 23.";
    }
    if (hasta !== null && (!Number.isInteger(hasta) || hasta < 0 || hasta > 23)) {
      errores.whatsappHoraHasta = "Hasta debe ser un número entero entre 0 y 23.";
    }
    if (desde !== null && hasta !== null && !errores.whatsappHoraDesde && !errores.whatsappHoraHasta && desde >= hasta) {
      errores.whatsappHoraDesde = "Desde debe ser menor que hasta.";
    }

    if (email.trim() !== "") {
      if (!REGEX_EMAIL.test(email.trim())) {
        errores.email = "El email no tiene un formato válido.";
      } else if (email.trim().length > LARGO_MAX_EMAIL) {
        errores.email = `El email no puede superar los ${LARGO_MAX_EMAIL} caracteres.`;
      }
    }

    for (const [campo, valor, etiqueta] of [
      ["instagramUrl", instagramUrl, "Instagram"],
      ["facebookUrl", facebookUrl, "Facebook"],
      ["tiktokUrl", tiktokUrl, "TikTok"],
    ]) {
      const recortado = valor.trim();
      if (recortado === "") continue;
      if (!esUrlHttpsValida(recortado)) {
        errores[campo] = `${etiqueta} debe ser una URL https:// válida.`;
      } else if (recortado.length > LARGO_MAX_URL_SOCIAL) {
        errores[campo] = `${etiqueta} no puede superar los ${LARGO_MAX_URL_SOCIAL} caracteres.`;
      }
    }

    if (direccion.trim().length > LARGO_MAX_DIRECCION) {
      errores.direccion = `La dirección no puede superar los ${LARGO_MAX_DIRECCION} caracteres.`;
    }

    return errores;
  }

  async function handleGuardar(event) {
    event.preventDefault();

    const errores = validar();
    setErroresCampos(errores);
    if (Object.keys(errores).length > 0) return;

    setGuardando(true);
    try {
      const data = await putConfigContacto({
        whatsappNumero: whatsappNumero.trim(),
        whatsappHoraDesde: whatsappHoraDesde === "" ? "" : Number(whatsappHoraDesde),
        whatsappHoraHasta: whatsappHoraHasta === "" ? "" : Number(whatsappHoraHasta),
        whatsappDias: [...dias].sort((a, b) => a - b).join(","),
        email: email.trim(),
        direccion: direccion.trim(),
        instagramUrl: instagramUrl.trim(),
        facebookUrl: facebookUrl.trim(),
        tiktokUrl: tiktokUrl.trim(),
      });
      setCrudo(data?.crudo ?? CRUDO_VACIO);
      mostrarToast("Contacto actualizado.", { tipo: "exito" });
    } catch (err) {
      mostrarToast(err.message ?? "No se pudo guardar el contacto.", { tipo: "error" });
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <main className="w-full px-4 py-6 md:px-8 md:py-8">
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            Cargando configuración de contacto…
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="w-full px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6">
          <BotonVolver fallback="/catalogo/admin/productos" />
        </div>
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant" aria-hidden="true">
            cloud_off
          </span>
          <h2 className="font-headline-md text-headline-md text-primary">
            No pudimos cargar la configuración de contacto
          </h2>
          <p className="font-body-md text-body-md max-w-md text-on-surface-variant">{error}</p>
          <button
            type="button"
            onClick={() => setReintento((n) => n + 1)}
            className="font-label-lg text-label-lg inline-flex min-h-11 items-center rounded-lg bg-primary px-5 uppercase tracking-widest text-on-primary hover:bg-primary-container"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <BotonVolver fallback="/catalogo/admin/productos" />
      </div>

      <div className="mb-8">
        <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
          Configuración
        </span>
        <h1 className="font-headline-lg text-headline-lg text-primary">Contacto</h1>
        <p className="font-body-md text-body-md mt-2 max-w-2xl text-on-surface-variant">
          Lo que ven los clientes en el pie, en el botón de WhatsApp y en las páginas de ayuda.
        </p>
      </div>

      {crudo.whatsappNumero == null ? (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4"
        >
          <span className="material-symbols-outlined text-brand-teal" aria-hidden="true">
            info
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Hasta que guardes por primera vez, el número de WhatsApp sigue saliendo de la
            configuración del servidor.
          </p>
        </div>
      ) : null}

      {/* `noValidate`: los inputs `type="email"`/`type="number"` disparan su
          propia validación nativa del navegador ANTES de que este `onSubmit`
          corra — con un valor inválido, jsdom (y cualquier browser real)
          bloquea el evento `submit` en silencio y `validar()` nunca llega a
          ejecutarse. El mensaje propio (con el mismo texto que el backend)
          reemplaza al tooltip nativo, no lo complementa. */}
      <form onSubmit={handleGuardar} noValidate className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <fieldset className={claseFieldset}>
            <legend className={claseLegend}>WhatsApp</legend>

            <div className="flex flex-col gap-1">
              <label htmlFor="wa-numero" className={claseLabel}>
                Número (con código de país, sin +)
              </label>
              <input
                id="wa-numero"
                type="text"
                inputMode="numeric"
                value={whatsappNumero}
                onChange={(e) => setWhatsappNumero(e.target.value)}
                className={claseInput}
              />
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Solo dígitos. Ejemplo: 5491123456789
              </span>
              {erroresCampos.whatsappNumero ? (
                <p role="alert" className="font-body-md text-body-md text-error">
                  {erroresCampos.whatsappNumero}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="wa-desde" className={claseLabel}>
                  Desde
                </label>
                <input
                  id="wa-desde"
                  type="number"
                  min={0}
                  max={23}
                  value={whatsappHoraDesde}
                  onChange={(e) => setWhatsappHoraDesde(e.target.value)}
                  className={claseInput}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="wa-hasta" className={claseLabel}>
                  Hasta
                </label>
                <input
                  id="wa-hasta"
                  type="number"
                  min={0}
                  max={23}
                  value={whatsappHoraHasta}
                  onChange={(e) => setWhatsappHoraHasta(e.target.value)}
                  className={claseInput}
                />
              </div>
            </div>
            {erroresCampos.whatsappHoraDesde || erroresCampos.whatsappHoraHasta ? (
              <p role="alert" className="font-body-md text-body-md text-error">
                {erroresCampos.whatsappHoraDesde ?? erroresCampos.whatsappHoraHasta}
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <span className={claseLabel}>Días de atención</span>
              <div className="flex flex-wrap gap-2">
                {DIAS.map((dia) => {
                  const activo = dias.includes(dia.valor);
                  return (
                    <button
                      key={dia.nombre}
                      type="button"
                      aria-pressed={activo}
                      aria-label={dia.nombre}
                      onClick={() => alternarDia(dia.valor)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border font-label-sm text-label-sm transition-colors ${
                        activo
                          ? "border-brand-teal bg-brand-teal text-white"
                          : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      {dia.letra}
                    </button>
                  );
                })}
              </div>
            </div>
          </fieldset>

          <fieldset className={claseFieldset}>
            <legend className={claseLegend}>Mail y dirección</legend>

            <div className="flex flex-col gap-1">
              <label htmlFor="contacto-email" className={claseLabel}>
                Mail de contacto
              </label>
              <input
                id="contacto-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={LARGO_MAX_EMAIL}
                className={claseInput}
              />
              {erroresCampos.email ? (
                <p role="alert" className="font-body-md text-body-md text-error">
                  {erroresCampos.email}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="contacto-direccion" className={claseLabel}>
                Dirección o showroom (opcional)
              </label>
              <input
                id="contacto-direccion"
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                maxLength={LARGO_MAX_DIRECCION}
                className={claseInput}
              />
              {erroresCampos.direccion ? (
                <p role="alert" className="font-body-md text-body-md text-error">
                  {erroresCampos.direccion}
                </p>
              ) : null}
            </div>
          </fieldset>

          <fieldset className={`${claseFieldset} lg:col-span-2`}>
            <legend className={claseLegend}>Redes</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="contacto-instagram" className={claseLabel}>
                  Instagram
                </label>
                <input
                  id="contacto-instagram"
                  type="text"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  maxLength={LARGO_MAX_URL_SOCIAL}
                  placeholder="https://instagram.com/…"
                  className={claseInput}
                />
                {erroresCampos.instagramUrl ? (
                  <p role="alert" className="font-body-md text-body-md text-error">
                    {erroresCampos.instagramUrl}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="contacto-facebook" className={claseLabel}>
                  Facebook
                </label>
                <input
                  id="contacto-facebook"
                  type="text"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  maxLength={LARGO_MAX_URL_SOCIAL}
                  placeholder="https://facebook.com/…"
                  className={claseInput}
                />
                {erroresCampos.facebookUrl ? (
                  <p role="alert" className="font-body-md text-body-md text-error">
                    {erroresCampos.facebookUrl}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="contacto-tiktok" className={claseLabel}>
                  TikTok
                </label>
                <input
                  id="contacto-tiktok"
                  type="text"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  maxLength={LARGO_MAX_URL_SOCIAL}
                  placeholder="https://tiktok.com/@…"
                  className={claseInput}
                />
                {erroresCampos.tiktokUrl ? (
                  <p role="alert" className="font-body-md text-body-md text-error">
                    {erroresCampos.tiktokUrl}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Solo links que empiecen con https://. Las redes vacías no aparecen en el pie.
            </p>
          </fieldset>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="font-label-lg text-label-lg inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
          >
            {guardando ? (
              <span aria-hidden="true">
                <Spinner className="h-4 w-4 text-on-primary" decorativo />
              </span>
            ) : null}
            Guardar cambios
          </button>
        </div>
      </form>
    </main>
  );
}

export default AdminContacto;
