import { Link } from "react-router-dom";

const DataDeletion = () => (
  <main className="min-h-screen bg-background text-foreground">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Eliminación de Datos del Usuario</h1>

      <section className="space-y-4 mb-8">
        <p className="text-muted-foreground leading-relaxed">
          En Socialify CR respetamos tu derecho a eliminar la información personal que almacenamos. Esta página explica cómo solicitar la eliminación de tu cuenta y de los datos asociados, incluyendo los obtenidos mediante Facebook Login.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">1. Qué datos eliminamos</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
          <li>Perfil de usuario (nombre, correo, avatar).</li>
          <li>Tokens de acceso y conexiones con Meta, Google, TikTok, LinkedIn y YouTube.</li>
          <li>Métricas, publicaciones, campañas, leads y ventas asociadas a tu cuenta.</li>
          <li>Registros de actividad y notificaciones.</li>
        </ul>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">2. Cómo solicitar la eliminación</h2>
        <p className="text-muted-foreground leading-relaxed">
          Envía un correo a <strong>soporte@socialifycr.com</strong> desde la dirección asociada a tu cuenta con el asunto <em>"Eliminación de datos"</em>. Incluye tu nombre completo y, si aplica, el nombre del cliente o portafolio del cual deseas remover la información.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Procesaremos la solicitud en un plazo máximo de <strong>30 días</strong> y te enviaremos una confirmación una vez completada.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">3. Eliminación desde Facebook</h2>
        <p className="text-muted-foreground leading-relaxed">
          Si conectaste tu cuenta mediante Facebook Login y quieres revocar el acceso:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
          <li>Entra a Facebook → Configuración → Aplicaciones y sitios web.</li>
          <li>Busca <strong>Socialify CR</strong> y presiona <strong>Eliminar</strong>.</li>
          <li>Esto revoca los permisos otorgados a la aplicación.</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed">
          Adicionalmente, envíanos el correo indicado en el paso 2 para eliminar los datos ya almacenados en nuestra plataforma.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">4. Retención</h2>
        <p className="text-muted-foreground leading-relaxed">
          Algunos registros contables o de facturación pueden conservarse por el tiempo requerido por la ley aplicable, incluso después de la eliminación de tu cuenta.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">5. Contacto</h2>
        <p className="text-muted-foreground leading-relaxed">
          Para preguntas sobre este proceso, escríbenos a <strong>soporte@socialifycr.com</strong>.
        </p>
      </section>

      <p className="text-sm text-muted-foreground mt-12">Última actualización: julio 2026</p>
      <div className="mt-6">
        <Link to="/" className="text-primary hover:underline text-sm">Volver al inicio</Link>
      </div>
    </div>
  </main>
);

export default DataDeletion;
