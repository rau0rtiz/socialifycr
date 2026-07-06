import { Link } from "react-router-dom";

const Privacy = () => (
  <main className="min-h-screen bg-background text-foreground">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Política de Privacidad</h1>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">1. Información que recopilamos</h2>
        <p className="text-muted-foreground leading-relaxed">
          Recopilamos información que nos proporcionas directamente al crear una cuenta, completar formularios o utilizar nuestros servicios. Esto incluye nombre, correo electrónico, número de teléfono y datos comerciales de tu negocio.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          También recopilamos datos de uso automáticamente, como dirección IP, tipo de navegador, páginas visitadas y estadísticas de interacción con las herramientas de la plataforma.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">2. Cómo usamos tu información</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
          <li>Proporcionar, operar y mantener la plataforma.</li>
          <li>Mejorar, personalizar y ampliar funcionalidades.</li>
          <li>Comunicarnos contigo sobre actualizaciones, soporte o promociones.</li>
          <li>Prevenir fraude y garantizar la seguridad de la plataforma.</li>
        </ul>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">3. Compartición de datos</h2>
        <p className="text-muted-foreground leading-relaxed">
          No vendemos ni alquilamos tu información personal. Solo compartimos datos con proveedores de servicios que nos ayudan a operar la plataforma (hosting, análisis, procesamiento de pagos), siempre bajo obligaciones de confidencialidad y seguridad.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">4. Seguridad</h2>
        <p className="text-muted-foreground leading-relaxed">
          Implementamos medidas técnicas y organizativas para proteger tu información contra acceso no autorizado, alteración, divulgación o destrucción.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">5. Tus derechos</h2>
        <p className="text-muted-foreground leading-relaxed">
          Tienes derecho a acceder, rectificar, cancelar u oponerte al tratamiento de tus datos personales. Para ejercer estos derechos, contáctanos a través de los canales oficiales de la plataforma.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">6. Cambios a esta política</h2>
        <p className="text-muted-foreground leading-relaxed">
          Podemos actualizar esta política ocasionalmente. Te notificaremos cambios significativos a través de la plataforma o por correo electrónico.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">7. Contacto</h2>
        <p className="text-muted-foreground leading-relaxed">
          Si tienes preguntas sobre esta política, escríbenos a través de los canales de soporte de la plataforma.
        </p>
      </section>

      <p className="text-sm text-muted-foreground mt-12">Última actualización: julio 2026</p>
      <div className="mt-6">
        <Link to="/" className="text-primary hover:underline text-sm">Volver al inicio</Link>
      </div>
    </div>
  </main>
);

export default Privacy;
