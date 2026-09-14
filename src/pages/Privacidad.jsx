import { Link } from "react-router-dom";
import MetaSeo from "../components/MetaSeo.jsx";
import { urlAbsoluta } from "../constants/seo.js";
import useConfigContacto from "../hooks/useConfigContacto.js";

/**
 * Política de privacidad (Ley 25.326). Pública, dentro del `Layout` público.
 *
 * El contenido NO es un modelo genérico: cada afirmación sale de lo que el
 * sistema hace hoy (schema de Prisma, cookies de `lib/cookiesCliente.js`,
 * `EventoTrafico`, `email.service.js`, CSP de `nginx.conf`). Si cambia qué
 * datos se guardan, con quién se comparten o cuánto duran, este texto se
 * actualiza EN EL MISMO cambio, junto con la fecha de abajo.
 *
 * El email de contacto sale de `GET /config/contacto` (el mismo que muestra
 * el pie), así un cambio en Configuración › Contacto no deja la política
 * apuntando a una dirección vieja.
 */
const ULTIMA_ACTUALIZACION = "14/09/2026";

const CLASE_H2 = "font-headline-sm text-headline-sm mb-3 mt-10 text-on-background";
const CLASE_H3 = "font-label-lg text-label-lg mb-2 mt-5 font-bold text-on-surface";
const CLASE_P = "font-body-md text-body-md mb-3 text-on-surface-variant";
const CLASE_LISTA = "font-body-md text-body-md mb-3 flex list-disc flex-col gap-2 pl-6 text-on-surface-variant";
const CLASE_LINK = "text-primary underline underline-offset-2 hover:text-primary-container";

/** El email configurado como link, o una derivación a los canales del sitio. */
function CanalDeContacto({ email }) {
  if (!email) {
    return <>los canales de contacto publicados en este sitio</>;
  }
  return (
    <a href={`mailto:${email}`} className={`${CLASE_LINK} break-all`}>
      {email}
    </a>
  );
}

function Privacidad() {
  const { contacto } = useConfigContacto();
  const email = contacto?.email ?? null;

  return (
    <>
      <MetaSeo
        titulo="Política de privacidad — YIMA"
        descripcion="Qué datos personales trata YIMA, para qué los usa, con quién los comparte y cómo ejercer tus derechos según la Ley 25.326."
        canonical={urlAbsoluta("/privacidad")}
      />
      <div className="mx-auto w-full max-w-container-max px-margin-mobile py-10 md:px-margin-desktop md:py-16">
        <article className="mx-auto max-w-[72ch]">
          <h1 className="font-headline-lg text-headline-lg mb-2 text-on-background">Política de privacidad</h1>
          <p className="font-body-sm text-body-sm mb-8 text-on-surface-variant">
            Última actualización: {ULTIMA_ACTUALIZACION}
          </p>

          <p className={CLASE_P}>
            En YIMA (yima-productos.com) cuidamos los datos personales de quienes visitan el sitio y compran en él.
            Esta política explica qué datos tratamos, para qué los usamos, con quién los compartimos y cómo podés
            ejercer tus derechos, de acuerdo con la Ley 25.326 de Protección de los Datos Personales.
          </p>
          <p className={CLASE_P}>
            El responsable de los datos es YIMA. Para cualquier consulta sobre esta política o sobre tus datos,
            podés escribirnos a <CanalDeContacto email={email} />.
          </p>

          <h2 className={CLASE_H2}>Qué datos recopilamos</h2>

          <h3 className={CLASE_H3}>Tu cuenta</h3>
          <ul className={CLASE_LISTA}>
            <li>Email y contraseña. La contraseña nunca se guarda en forma legible: solo almacenamos un hash.</li>
            <li>Nombre, teléfono y DNI, necesarios para confirmar un pedido.</li>
            <li>Apodo, si decidís cargarlo. Es opcional y lo podés borrar cuando quieras.</li>
          </ul>

          <h3 className={CLASE_H3}>Ingreso con Google</h3>
          <p className={CLASE_P}>
            Si elegís ingresar con tu cuenta de Google (solo cuentas de Gmail), Google nos envía tu dirección de email
            verificada, tu nombre y un identificador de tu cuenta de Google. No recibimos tu contraseña de Google ni
            accedemos a tus contactos, archivos u otros servicios.
          </p>

          <h3 className={CLASE_H3}>Tus pedidos</h3>
          <p className={CLASE_P}>
            Guardamos los productos, las cantidades, los precios y las notas que escribas al confirmar, junto con los
            datos de contacto de tu cuenta (nombre, teléfono, DNI y email). El sitio no pide una dirección de envío: la
            entrega se coordina con vos a través de los datos de contacto. Si agregás una dirección u otra información
            en las notas, la tratamos con el mismo cuidado.
          </p>

          <h3 className={CLASE_H3}>Seguridad del acceso</h3>
          <p className={CLASE_P}>
            Registramos los intentos fallidos de ingreso para bloquear temporalmente una cuenta ante intentos
            reiterados. Los códigos y enlaces de un solo uso que enviamos por email se guardan cifrados (hash) y
            vencen solos. Tu dirección IP se usa de forma transitoria para limitar la cantidad de intentos de ingreso
            y registro, sin guardarse asociada a tu cuenta.
          </p>

          <h3 className={CLASE_H3}>Uso del sitio</h3>
          <p className={CLASE_P}>
            Para entender qué productos interesan, registramos eventos anónimos: vistas de productos, productos
            agregados al carrito o a favoritos, productos compartidos, clics en WhatsApp, pedidos creados y
            visualizaciones o clics en campañas. De cada evento guardamos el tipo, el producto, la fecha, el sitio desde
            el que llegaste y el tipo de navegador. Estos registros no se asocian a tu cuenta, tu nombre ni tu email, y
            no incluyen tu dirección IP.
          </p>

          <h3 className={CLASE_H3}>Registros técnicos</h3>
          <p className={CLASE_P}>
            Cuando ocurre un error en el servidor guardamos un registro técnico (mensaje de error, dirección de la
            página y fecha) para poder corregirlo. Ese registro no se asocia a tu cuenta.
          </p>

          <h2 className={CLASE_H2}>Para qué usamos tus datos</h2>
          <ul className={CLASE_LISTA}>
            <li>Crear y administrar tu cuenta, y permitirte ingresar de forma segura.</li>
            <li>Procesar tus pedidos y coordinar la entrega.</li>
            <li>
              Enviarte emails vinculados a tu cuenta y a tus pedidos: verificación de email, códigos de acceso,
              recuperación de contraseña, cambio de email, confirmación de pedido y cambios en su estado.
            </li>
            <li>Responder las consultas que nos hagas por WhatsApp o por email.</li>
            <li>Prevenir accesos indebidos y usos abusivos del sitio.</li>
            <li>Elaborar estadísticas anónimas de uso para mejorar el catálogo.</li>
          </ul>
          <p className={CLASE_P}>
            No vendemos tus datos, no los usamos para publicidad y no te enviamos comunicaciones promocionales.
          </p>

          <h2 className={CLASE_H2}>Con quién compartimos datos</h2>
          <p className={CLASE_P}>
            Para operar el sitio trabajamos con los siguientes prestadores. Cada uno recibe solo lo necesario para
            cumplir su función:
          </p>
          <ul className={CLASE_LISTA}>
            <li>
              <strong className="text-on-surface">Google (ingreso con Google).</strong> Solo si elegís esa opción.
              Google procesa ese ingreso según su propia política de privacidad.
            </li>
            <li>
              <strong className="text-on-surface">Google (Gmail).</strong> Los emails del sitio se envían a través de
              Gmail, por lo que tu email, tu nombre y el detalle de tus pedidos pasan por sus servidores.
            </li>
            <li>
              <strong className="text-on-surface">Google Fonts.</strong> El sitio carga tipografías e íconos desde
              servidores de Google, que reciben datos técnicos de la conexión, como la dirección IP.
            </li>
            <li>
              <strong className="text-on-surface">Cloudinary.</strong> Aloja las imágenes de los productos. No recibe
              datos de clientes.
            </li>
            <li>
              <strong className="text-on-surface">WhatsApp.</strong> Solo cuando tocás un botón de WhatsApp: se abre
              la aplicación con un mensaje sugerido que puede mencionar los productos que estabas mirando. Lo que envíes por
              WhatsApp se rige por la política de privacidad de ese servicio.
            </li>
            <li>
              <strong className="text-on-surface">Alojamiento.</strong> El sitio y su base de datos funcionan en un
              servidor privado virtual contratado por YIMA. Como cualquier servidor web, puede registrar datos
              técnicos de conexión, como la dirección IP.
            </li>
          </ul>
          <p className={CLASE_P}>
            Algunos de estos prestadores pueden procesar datos fuera de la Argentina. Fuera de estos casos, solo
            compartimos datos cuando una autoridad competente lo exija conforme a la ley. El sitio no usa pasarelas de
            pago, redes publicitarias ni píxeles de seguimiento; los enlaces a nuestras redes sociales son enlaces
            comunes y no cargan contenido de esas redes.
          </p>

          <h2 className={CLASE_H2}>Almacenamiento en tu navegador</h2>
          <ul className={CLASE_LISTA}>
            <li>
              <strong className="text-on-surface">Cookie de sesión</strong> (7 días): mantiene tu sesión iniciada. No
              es accesible desde el código de la página y solo viaja por conexiones seguras.
            </li>
            <li>
              <strong className="text-on-surface">Cookie de dispositivo conocido</strong> (90 días): recuerda que ya
              confirmaste tu email desde ese navegador, para no pedirte un código adicional cada vez.
            </li>
            <li>
              <strong className="text-on-surface">Almacenamiento local</strong>: tu carrito, tus favoritos y si ya
              viste el aviso de una campaña. Queda en tu navegador y podés borrarlo desde su configuración.
            </li>
            <li>
              <strong className="text-on-surface">Almacenamiento de sesión</strong>: un borrador de las notas del
              pedido mientras completás la compra. Se borra al cerrar la pestaña.
            </li>
          </ul>
          <p className={CLASE_P}>
            No usamos cookies publicitarias ni de terceros para seguimiento. Si usás el botón de ingreso con Google,
            Google puede usar sus propias cookies según su política.
          </p>

          <h2 className={CLASE_H2}>Cuánto tiempo conservamos tus datos</h2>
          <ul className={CLASE_LISTA}>
            <li>Los datos de tu cuenta, mientras la cuenta exista.</li>
            <li>Las cuentas registradas que no confirman su email se eliminan a las 24 horas.</li>
            <li>
              Los códigos y enlaces enviados por email vencen solos: los códigos de acceso a los 10 minutos, los
              enlaces para restablecer la contraseña a la hora y los de verificación o cambio de email a las 24 horas.
            </li>
            <li>
              Los pedidos se conservan como historial comercial. Podés pedir su supresión, salvo en lo que debamos
              conservar por una obligación legal.
            </li>
            <li>Los eventos de uso son anónimos y se conservan con fines estadísticos.</li>
          </ul>

          <h2 className={CLASE_H2}>Cómo protegemos tus datos</h2>
          <ul className={CLASE_LISTA}>
            <li>Las contraseñas se guardan con un algoritmo de hash; nadie en YIMA puede leerlas.</li>
            <li>Todo el sitio funciona sobre conexiones cifradas (HTTPS).</li>
            <li>La sesión viaja en una cookie protegida, no accesible desde el código de la página.</li>
            <li>Limitamos los intentos de ingreso y bloqueamos temporalmente las cuentas ante intentos reiterados.</li>
            <li>
              Solo el personal autorizado de YIMA accede a los datos, con usuario y contraseña propios, y las
              modificaciones hechas desde el panel de administración quedan registradas en una traza de auditoría.
            </li>
          </ul>

          <h2 className={CLASE_H2}>Tus derechos</h2>
          <p className={CLASE_P}>
            Como titular de tus datos tenés derecho a acceder a ellos, rectificarlos, actualizarlos y pedir su
            supresión, en los términos de la Ley 25.326.
          </p>
          <ul className={CLASE_LISTA}>
            <li>
              Podés corregir tu nombre, apodo, teléfono y DNI desde{" "}
              <Link to="/cuenta/datos" className={CLASE_LINK}>
                Mi cuenta
              </Link>
              , y cambiar tu email o tu contraseña desde la misma sección.
            </li>
            <li>
              Para pedir acceso a tus datos, la eliminación de tu cuenta o cualquier otra gestión, escribinos a{" "}
              <CanalDeContacto email={email} />. Podemos pedirte que acredites tu identidad.
            </li>
          </ul>
          <p className={CLASE_P}>
            Respondemos los pedidos de acceso dentro de los 10 días corridos, y los de rectificación, actualización o
            supresión dentro de los 5 días hábiles desde que los recibimos.
          </p>
          <p className={CLASE_P}>
            El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
            gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto
            conforme lo establecido en el artículo 14, inciso 3 de la Ley 25.326.
          </p>
          <p className={CLASE_P}>
            La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley 25.326, tiene
            la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus
            derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.
          </p>

          <h2 className={CLASE_H2}>Menores de edad</h2>
          <p className={CLASE_P}>
            El sitio no está dirigido a menores de 18 años y no recopilamos a sabiendas datos de menores. Si creés que
            un menor nos proporcionó datos personales, escribinos a <CanalDeContacto email={email} /> para eliminarlos.
          </p>

          <h2 className={CLASE_H2}>Cambios en esta política</h2>
          <p className={CLASE_P}>
            Podemos actualizar esta política cuando cambie la forma en que tratamos los datos. La versión vigente es
            siempre la publicada en esta página, con su fecha de última actualización.
          </p>
        </article>
      </div>
    </>
  );
}

export default Privacidad;
