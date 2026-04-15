
-- Create email_templates table
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subject text NOT NULL DEFAULT '',
  html_content text NOT NULL DEFAULT '',
  description text,
  category text NOT NULL DEFAULT 'custom',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

-- Authenticated users can view templates
CREATE POLICY "Authenticated can view templates" ON public.email_templates
  FOR SELECT TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Seed system templates

-- 1. Invitation template
INSERT INTO public.email_templates (name, slug, subject, html_content, description, category, variables) VALUES (
  'Invitación a Cliente',
  'invitation',
  'Invitación a {{client_name}} - Socialify',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Invitación a {{client_name}}</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      {{greeting}}
    </p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Has sido invitado a unirte a <strong>{{client_name}}</strong> como <strong>{{role}}</strong>.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{link}}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
        Aceptar Invitación
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      Este enlace expira en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      Socialify - Dashboard de Marketing
    </p>
  </div>
</body>
</html>',
  'Correo enviado cuando se invita a un usuario a un cliente',
  'system',
  '[{"key": "client_name", "label": "Nombre del cliente"}, {"key": "greeting", "label": "Saludo personalizado"}, {"key": "role", "label": "Rol asignado"}, {"key": "link", "label": "Enlace de invitación"}]'
);

-- 2. Avatar reminder template
INSERT INTO public.email_templates (name, slug, subject, html_content, description, category, variables) VALUES (
  'Recordatorio de Foto',
  'avatar-reminder',
  'Actualiza tu foto de perfil en Socialify',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h2 style="color: #6366f1; margin: 0; font-size: 28px;">Socialify</h2>
  </div>
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="width: 80px; height: 80px; border-radius: 50%; background: #f0f0ff; display: inline-flex; align-items: center; justify-content: center;">
      <span style="font-size: 36px;">📸</span>
    </div>
  </div>
  <h1 style="color: #1a1a2e; font-size: 22px; text-align: center; margin-bottom: 16px;">
    ¡Agrega tu foto de perfil!
  </h1>
  <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 8px;">
    Tu equipo te reconocerá más fácil con una foto de perfil.
  </p>
  <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
    Solo toma unos segundos — haz click en el botón para actualizar tu foto ahora.
  </p>
  <div style="text-align: center; margin-bottom: 40px;">
    <a href="{{link}}" style="display: inline-block; background: #6366f1; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
      Actualizar mi foto
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
  <p style="color: #999; font-size: 12px; text-align: center;">
    Socialify · socialifycr.com
  </p>
</div>',
  'Correo enviado a usuarios sin foto de perfil',
  'system',
  '[{"key": "link", "label": "Enlace para actualizar foto"}]'
);

-- 3. Generic notification template
INSERT INTO public.email_templates (name, slug, subject, html_content, description, category, variables) VALUES (
  'Notificación General',
  'notification',
  '{{subject}}',
  '{{html}}',
  'Plantilla genérica para notificaciones directas — el contenido HTML se pasa completo',
  'system',
  '[{"key": "subject", "label": "Asunto del correo"}, {"key": "html", "label": "Contenido HTML completo"}]'
);
