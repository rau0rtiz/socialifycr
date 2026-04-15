UPDATE email_templates SET html_content = '<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#FF6B35,#e55a2b);padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">SOCIALIFY</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Tu Roadmap de Marketing Digital</p>
</td></tr>
<!-- Body -->
<tr><td style="padding:40px;">
<h2 style="margin:0 0 8px;color:#212121;font-size:22px;font-weight:700;">¡Hola {{name}}! 👋</h2>
<p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">Completaste nuestro diagnóstico y estos son tus resultados personalizados.</p>

<!-- Level Card -->
<table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #FF6B35;border-radius:12px;overflow:hidden;margin-bottom:24px;">
<tr><td style="background-color:#FFF7ED;padding:24px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="48" valign="top"><div style="width:48px;height:48px;border-radius:12px;background-color:#FF6B35;color:#fff;font-size:20px;font-weight:700;text-align:center;line-height:48px;">{{level_number}}</div></td>
<td style="padding-left:16px;">
<h3 style="margin:0 0 4px;color:#212121;font-size:18px;font-weight:700;">Nivel {{level_number}}: {{level_name}}</h3>
<p style="margin:0;color:#666;font-size:14px;line-height:1.5;">{{level_desc}}</p>
</td>
</tr>
</table>
</td></tr>
</table>

<p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">Basándonos en tu nivel, hemos preparado recomendaciones estratégicas específicas para que puedas escalar tu negocio con marketing digital.</p>

{{session_cta}}

</td></tr>
<!-- Footer -->
<tr><td style="background-color:#212121;padding:24px 40px;text-align:center;">
<p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;">© 2025 Socialify · Todos los derechos reservados</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>' WHERE slug = 'funnel-result';