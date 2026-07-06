import { Link } from "react-router-dom";

const Terms = () => (
  <main className="min-h-screen bg-background text-foreground">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Términos y Condiciones de Uso</h1>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">1. Aceptación de los términos</h2>
        <p className="text-muted-foreground leading-relaxed">
          Al acceder y utilizar esta plataforma, aceptas cumplir con estos términos y condiciones, así como con todas las leyes y regulaciones aplicables. Si no estás de acuerdo, por favor no utilices los servicios.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">2. Uso de la plataforma</h2>
        <p className="text-muted-foreground leading-relaxed">
          Te otorgamos una licencia limitada, no exclusiva e intransferible para usar la plataforma conforme a su finalidad comercial. Queda prohibido:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
          <li>Acceder de forma no autorizada a sistemas o datos de terceros.</li>
          <li>Distribuir virus, malware o código malicioso.</li>
          <li>Usar la plataforma para actividades ilegales, fraudulentas o no autorizadas.</li>
          <li>Intentar interferir con la infraestructura o seguridad del servicio.</li>
        </ul>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">3. Cuentas y acceso</h2>
        <p className="text-muted-foreground leading-relaxed">
          Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades realizadas bajo tu cuenta. Notifícanos inmediatamente cualquier uso no autorizado.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">4. Propiedad intelectual</h2>
        <p className="text-muted-foreground leading-relaxed">
          Todo el contenido, software, marcas, diseños y tecnología de la plataforma son propiedad de Socialify o de sus licenciantes. No se otorgan derechos de propiedad intelectual salvo la licencia de uso descrita.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">5. Limitación de responsabilidad</h2>
        <p className="text-muted-foreground leading-relaxed">
          La plataforma se proporciona "tal cual" y "según disponibilidad". No garantizamos que el servicio sea ininterrumpido, libre de errores o seguro en todo momento. En la medida permitida por la ley, no seremos responsables por daños indirectos, incidentales o consecuentes.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">6. Modificaciones</h2>
        <p className="text-muted-foreground leading-relaxed">
          Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor al publicarse. El uso continuado de la plataforma después de las modificaciones implica tu aceptación.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">7. Terminación</h2>
        <p className="text-muted-foreground leading-relaxed">
          Podemos suspender o cancelar tu acceso a la plataforma en caso de incumplimiento de estos términos. Tú también puedes dejar de usar el servicio en cualquier momento.
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">8. Ley aplicable</h2>
        <p className="text-muted-foreground leading-relaxed">
          Estos términos se rigen por las leyes de Costa Rica. Cualquier disputa será resuelta ante los tribunales competentes de San José, Costa Rica.
        </p>
      </section>

      <p className="text-sm text-muted-foreground mt-12">Última actualización: julio 2026</p>
      <div className="mt-6">
        <Link to="/" className="text-primary hover:underline text-sm">Volver al inicio</Link>
      </div>
    </div>
  </main>
);

export default Terms;
