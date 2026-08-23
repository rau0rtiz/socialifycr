import { forwardRef } from 'react';

export interface StoryPiece {
  name: string;
  typeLabel: string;
  icon: string;
}

export interface StoryReceiptData {
  title: string;
  clientName: string;
  clientLogo?: string | null;
  dateLabel: string;
  pieces: StoryPiece[];
  folio: string;
}

const MAX_PIECES = 12;

const THEMES = {
  light: {
    bg: '#f5f0e6',
    card: '#fffdf8',
    ink: '#1a1a1a',
    muted: '#8b7355',
    soft: '#5a5248',
    line: '#d4c5a9',
    accent: '#e85d3a',
  },
  dark: {
    bg: '#141312',
    card: '#1e1c1a',
    ink: '#f5f0e6',
    muted: '#a89b85',
    soft: '#cfc6b6',
    line: '#3a352f',
    accent: '#e85d3a',
  },
} as const;

export type StoryTheme = keyof typeof THEMES;

/** Fixed 1080x1920 story card. Rendered offscreen for image export. */
export const StoryReceiptCard = forwardRef<HTMLDivElement, { data: StoryReceiptData; theme?: StoryTheme }>(
  ({ data, theme = 'light' }, ref) => {
    const t = THEMES[theme];
    const shown = data.pieces.slice(0, MAX_PIECES);
    const rest = data.pieces.length - shown.length;

    const dots = (
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {Array.from({ length: 26 }).map((_, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 999, background: t.line }} />
        ))}
      </div>
    );

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          background: t.bg,
          fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
          padding: '80px 70px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: 1,
            background: t.card,
            borderRadius: 48,
            border: `2px solid ${t.line}`,
            padding: '64px 56px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 34 }}>
            {data.clientLogo ? (
              <img
                src={data.clientLogo}
                crossOrigin="anonymous"
                alt=""
                style={{ width: 84, height: 84, borderRadius: 999, objectFit: 'cover', border: `2px solid ${t.line}` }}
              />
            ) : (
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 999,
                  background: t.accent,
                  color: '#fff',
                  fontSize: 36,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {(data.clientName || 'S').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 20, letterSpacing: 8, textTransform: 'uppercase', color: t.accent, fontWeight: 700 }}>
                Recibo de producción
              </div>
              <div style={{ fontSize: 28, color: t.soft, marginTop: 8 }}>{data.clientName}</div>
            </div>
          </div>

          <div style={{ fontSize: 74, lineHeight: 1.05, color: t.ink, fontWeight: 700, letterSpacing: -1 }}>
            {data.title}
          </div>
          <div style={{ fontSize: 30, color: t.muted, marginTop: 18 }}>{data.dateLabel}</div>

          <div style={{ margin: '40px 0 34px' }}>{dots}</div>

          <div style={{ fontSize: 19, letterSpacing: 7, textTransform: 'uppercase', color: t.muted, marginBottom: 26 }}>
            Piezas grabadas
          </div>

          {/* Pieces */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 22, overflow: 'hidden' }}>
            {shown.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: t.accent,
                    width: 54,
                    flexShrink: 0,
                    paddingTop: 4,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 34,
                      lineHeight: 1.2,
                      color: t.ink,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: 24, color: t.muted, marginTop: 4 }}>
                    {p.icon} {p.typeLabel}
                  </div>
                </div>
              </div>
            ))}
            {rest > 0 && (
              <div style={{ fontSize: 28, color: t.muted, paddingLeft: 74 }}>+ {rest} piezas más</div>
            )}
          </div>

          {/* Total */}
          <div style={{ marginTop: 34 }}>
            {dots}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginTop: 36,
              }}
            >
              <div>
                <div style={{ fontSize: 19, letterSpacing: 7, textTransform: 'uppercase', color: t.muted }}>
                  Total piezas
                </div>
                <div style={{ fontSize: 132, lineHeight: 1, color: t.accent, fontWeight: 700, marginTop: 6 }}>
                  {data.pieces.length}
                </div>
              </div>
              <div style={{ textAlign: 'right', paddingBottom: 14 }}>
                <div style={{ fontSize: 19, letterSpacing: 6, textTransform: 'uppercase', color: t.muted }}>Folio</div>
                <div style={{ fontSize: 32, color: t.ink, fontWeight: 600, marginTop: 6 }}>#{data.folio}</div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 40,
              paddingTop: 28,
              borderTop: `2px solid ${t.line}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: 22, letterSpacing: 6, textTransform: 'uppercase', color: t.muted }}>
              Producido por Socialify
            </div>
            <div style={{ fontSize: 22, color: t.accent, letterSpacing: 3 }}>socialifycr.com</div>
          </div>
        </div>
      </div>
    );
  }
);

StoryReceiptCard.displayName = 'StoryReceiptCard';
