
UPDATE public.email_templates
SET html_content = $HTML$<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#FF6B35,#e55a2b);padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">SOCIALIFY</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Invitación a {{client_name}}</p>
</td></tr>
<!-- Body -->
<tr><td style="padding:40px;color:#333;line-height:1.6;">
<p style="font-size:16px;margin:0 0 20px;">{{greeting}}</p>
<p style="font-size:16px;margin:0 0 20px;">Has sido invitado a unirte a <strong>{{client_name}}</strong> como <strong>{{role}}</strong>.</p>
<div style="text-align:center;margin:32px 0;">
<a href="{{link}}" style="background:linear-gradient(135deg,#FF6B35,#e55a2b);color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:10px;font-weight:600;display:inline-block;font-size:15px;">Aceptar Invitación</a>
</div>
<p style="font-size:14px;color:#6b7280;margin:20px 0 0;">Este enlace expira en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.</p>
</td></tr>
<!-- Footer -->
<tr><td style="background-color:#212121;padding:20px 40px;text-align:center;">
<p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;">© 2025 Socialify · Dashboard de Marketing</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>$HTML$,
    updated_at = now()
WHERE slug = 'invitation';

UPDATE public.email_templates
SET html_content = $HTML$<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#FF6B35,#e55a2b);padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">SOCIALIFY</h1>
</td></tr>
<!-- Body -->
<tr><td style="padding:40px;text-align:center;">
<div style="width:80px;height:80px;border-radius:50%;background:#FFF7ED;display:inline-block;line-height:80px;text-align:center;font-size:36px;margin-bottom:20px;">📸</div>
<h2 style="color:#212121;font-size:22px;font-weight:700;margin:0 0 12px;">¡Agrega tu foto de perfil!</h2>
<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 8px;">Tu equipo te reconocerá más fácil con una foto de perfil.</p>
<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 28px;">Solo toma unos segundos — haz click en el botón para actualizar tu foto ahora.</p>
<a href="{{link}}" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#e55a2b);color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">Actualizar mi foto</a>
</td></tr>
<!-- Footer -->
<tr><td style="background-color:#212121;padding:20px 40px;text-align:center;">
<p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;">© 2025 Socialify · socialifycr.com</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>$HTML$,
    updated_at = now()
WHERE slug = 'avatar-reminder';
