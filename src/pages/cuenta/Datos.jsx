import { useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import usePerfilCliente, { sincronizarPerfil } from "../../hooks/usePerfilCliente.js";
import { actualizarPerfil } from "../../api/cuenta.js";
import {
  claseBotonPrimario,
  claseCampoSinIcono,
  claseEtiqueta,
  clasePagina,
  claseTarjetaEscritorio,
} from "./clasesCuenta.js";

/**
 * Arma el cuerpo del PUT con los campos que REALMENTE cambiaron.
 *
 * No es una optimización: mandar `""` significa cosas distintas según el campo.
 * Para `nombre` y `telefono` es un 400 (son obligatorios); para `apodo` es
 * justamente cómo se borra. Un submit que arrastre un `""` de un campo que
 * nadie tocó devuelve un 400 que parece del apodo y no lo es.
 *
 * `undefined` no sirve para borrar: `JSON.stringify` lo descarta y el backend
 * lo lee como "no lo toques". Por eso el apodo vacío viaja como `""` explícito.
 */
function soloLoQueCambio(valores, perfil) {
  const cambios = {};
  if (valores.nombre !== (perfil.nombre ?? "")) cambios.nombre = valores.nombre;
  if (valores.telefono !== (perfil.telefono ?? "")) cambios.telefono = valores.telefono;
  if (valores.apodo !== (perfil.apodo ?? "")) cambios.apodo = valores.apodo;
  return cambios;
}

function Datos() {
  const { perfil } = usePerfilCliente();

  const [nombre, setNombre] = useState(perfil?.nombre ?? "");
  const [telefono, setTelefono] = useState(perfil?.telefono ?? "");
  const [apodo, setApodo] = useState(perfil?.apodo ?? "");
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setAviso(null);

    const cambios = soloLoQueCambio({ nombre, telefono, apodo }, perfil);
    if (Object.keys(cambios).length === 0) {
      setAviso("No hay cambios para guardar.");
      return;
    }

    setCargando(true);
    try {
      // El PUT DEVUELVE el perfil actualizado, así que el cache se sincroniza
      // con esa respuesta en vez de volver a pedirlo. Ni `refrescarPerfil()`
      // ni `invalidarPerfil()`: los dos dejan `resuelto:false`, y con eso la
      // primera rama de `RequireAuthCliente` devuelve el Spinner y DESMONTA
      // esta pantalla en el mismo repintado — el aviso de abajo no llegaba a
      // pintarse nunca. Ver el comentario de `sincronizarPerfil`.
      const perfilActualizado = await actualizarPerfil(cambios);
      sincronizarPerfil(perfilActualizado);
      setAviso("Datos actualizados.");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  if (!perfil) return null;

  return (
    <div className={clasePagina}>
      <BotonVolver fallback="/cuenta" destinoFijo etiqueta="Volver a mi cuenta" />

      <div className={claseTarjetaEscritorio}>
        <header className="flex flex-col gap-1.5 lg:text-center">
          <h1 className="font-display-lg text-headline-lg text-on-background">Mis datos</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Cómo te llamamos y cómo te contactamos por tus pedidos.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="datos-nombre" className={claseEtiqueta}>
              Nombre
            </label>
            <input
              id="datos-nombre"
              type="text"
              autoComplete="name"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={claseCampoSinIcono}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="datos-telefono" className={claseEtiqueta}>
              Teléfono
            </label>
            <input
              id="datos-telefono"
              type="tel"
              autoComplete="tel"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={claseCampoSinIcono}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="datos-apodo" className={claseEtiqueta}>
              Apodo
            </label>
            <input
              id="datos-apodo"
              type="text"
              value={apodo}
              onChange={(e) => setApodo(e.target.value)}
              className={claseCampoSinIcono}
            />
            <p className="font-label-md text-label-md text-on-surface-variant">
              Opcional. Si lo cargás, es el nombre que ves en tu cuenta. Dejalo vacío para borrarlo.
            </p>
          </div>

          {error ? (
            <p role="alert" className="font-body-md text-body-md text-error">
              {error}
            </p>
          ) : null}
          {aviso ? (
            <p role="status" className="font-body-md text-body-md text-on-surface">
              {aviso}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={cargando}
            className={claseBotonPrimario}
          >
            {cargando ? "Guardando..." : "Guardar datos"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Datos;
