export function calendarManifest(token: string, origin: string) {
  const path = `/calendario/${encodeURIComponent(token)}`;
  return {
    id: `${origin}${path}`,
    name: 'Calendario Socialify',
    short_name: 'Calendario Socialify',
    description: 'Calendario de publicación y revisión de contenido de Socialify.',
    lang: 'es',
    start_url: `${origin}${path}`,
    scope: `${origin}/calendario/`,
    display: 'standalone',
    theme_color: '#0d0d0d',
    background_color: '#1a1a19',
    icons: [192, 512].map(size => ({
      src: `${origin}/calendar-icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any maskable',
    })),
  };
}