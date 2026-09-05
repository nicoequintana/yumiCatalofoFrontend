/**
 * Elegir el ícono de una categoría, de una lista acotada.
 *
 * **Lista acotada y no un campo de texto libre.** Material Symbols tiene miles
 * de nombres y ninguno se valida del lado del servidor: un nombre mal tipeado
 * se pinta como el propio texto adentro del círculo —"chairr" literal— sin
 * error y sin nada que lo delate hasta que alguien mira la home.
 *
 * Se puede volver a "sin ícono": el círculo cae a la inicial de la categoría.
 */
const ICONOS = [
  "chair",
  "skillet",
  "redeem",
  "devices",
  "lightbulb",
  "spa",
  "pets",
  "toys",
  "checkroom",
  "sports_esports",
  "backpack",
  "watch",
];

export default function SelectorIcono({ valor, onCambiar }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-label-md text-label-md text-on-surface-variant">
        Ícono de la categoría
      </legend>

      <div className="flex flex-wrap gap-2">
        <label
          className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border text-on-surface-variant ${
            valor ? "border-outline-variant" : "border-primary bg-primary-container"
          }`}
        >
          <input
            type="radio"
            name="icono-categoria"
            className="sr-only"
            checked={!valor}
            onChange={() => onCambiar(null)}
          />
          <span className="sr-only">Sin ícono</span>
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            block
          </span>
        </label>

        {ICONOS.map((icono) => (
          <label
            key={icono}
            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border ${
              valor === icono
                ? "border-primary bg-primary-container text-on-primary-container"
                : "border-outline-variant text-on-surface-variant"
            }`}
          >
            <input
              type="radio"
              name="icono-categoria"
              className="sr-only"
              checked={valor === icono}
              onChange={() => onCambiar(icono)}
            />
            <span className="sr-only">{icono}</span>
            <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
              {icono}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
