import { useState, useRef, useEffect, useCallback } from "react";

// ── Fuentes (cargadas via <link> en index.html de Lovable) ──────────────────
// Agregar en el <head> de index.html:
// <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Bebas+Neue&family=Oswald:wght@700&family=Poppins:wght@700;900&family=Anton&family=Barlow+Condensed:wght@800&family=Raleway:wght@900&display=swap" rel="stylesheet">

const LOGO_DEFAULT =
  "https://petshop2gocr.com/wp-content/uploads/2024/10/cropped-cropped-Diseno-sin-titulo-5-3-1.png";

const EMOJIS = [
  "🐾","⭐","✅","🔥","💎","🌿","🏆","💪","🎯","🚀",
  "❤️","🛡️","🌟","✨","🐶","🐱","🎁","⚡","🦴","🐠",
  "🌈","🎀","🍖","🥩","🌱","💊","🩺","🏅","👑","🎉",
  "🐕","🐈","🐇","🐠","🦜","🌺","🍀","💙","🧡","💚",
];

const FONTS = [
  { key: "Bebas Neue", label: "BEBAS", sub: "Bebas Neue" },
  { key: "Oswald",     label: "OSWALD", sub: "Oswald" },
  { key: "Anton",      label: "ANTON",  sub: "Anton" },
  { key: "Barlow Condensed", label: "BARLOW", sub: "Barlow Cond." },
  { key: "Poppins",   label: "Poppins", sub: "Poppins" },
  { key: "Raleway",   label: "Raleway", sub: "Raleway" },
];

const TEMPLATES = [
  { key: "orange", icon: "🌅", name: "SUNRISE",    bg: "#fff8f0" },
  { key: "teal",   icon: "🌿", name: "AQUA FRESH", bg: "#f0faf8" },
  { key: "split",  icon: "🍊", name: "CITRUS POP", bg: "#fffbf0" },
  { key: "night",  icon: "🌸", name: "CORAL SKY",  bg: "#fff5f5" },
];

const FORMATS = [
  { key: "sq",  label: "⬛ 1:1"   },
  { key: "v45", label: "📸 4:5"   },
  { key: "st",  label: "📱 Story" },
  { key: "bn",  label: "🖼 Banner"},
];

// ── CSS inline como string (inyectado una vez en <style>) ───────────────────
const CARD_CSS = `
:root{--orange:#FF6B1A;--orange-d:#e05510;--teal:#00A896;--teal-d:#007a6e;}
.gp-card{position:relative;overflow:hidden;border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,0.22);flex-shrink:0;}
.gp-card .g1,.gp-card .g2{position:absolute;border-radius:50%;pointer-events:none;}
.bg-orange{background:#fff8f0;}.bg-teal{background:#f0faf8;}.bg-split{background:#fffbf0;}.bg-night{background:#fff5f5;}
.bg-orange .g1{width:380px;height:380px;top:-120px;left:-100px;background:radial-gradient(circle,rgba(255,107,26,0.22) 0%,transparent 70%);}
.bg-orange .g2{width:260px;height:260px;bottom:-80px;right:-80px;background:radial-gradient(circle,rgba(255,190,60,0.2) 0%,transparent 70%);}
.bg-teal .g1{width:360px;height:360px;top:-100px;right:-100px;background:radial-gradient(circle,rgba(0,168,150,0.22) 0%,transparent 70%);}
.bg-teal .g2{width:240px;height:240px;bottom:-60px;left:-60px;background:radial-gradient(circle,rgba(0,200,180,0.15) 0%,transparent 70%);}
.bg-split .g1{width:420px;height:420px;top:-130px;left:-110px;background:radial-gradient(circle,rgba(255,107,26,0.18) 0%,transparent 65%);}
.bg-split .g2{width:320px;height:320px;bottom:-90px;right:-90px;background:radial-gradient(circle,rgba(0,168,150,0.18) 0%,transparent 65%);}
.bg-night .g1{width:360px;height:360px;top:-100px;right:-70px;background:radial-gradient(circle,rgba(255,80,80,0.18) 0%,transparent 70%);}
.bg-night .g2{width:300px;height:300px;bottom:-90px;left:-70px;background:radial-gradient(circle,rgba(255,140,60,0.15) 0%,transparent 70%);}
.gp-dots{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(0,0,0,0.055) 1px,transparent 1px);background-size:22px 22px;}
.gp-diag{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;}
.gp-diag::before{content:'';position:absolute;top:0;left:0;width:48%;height:100%;background:linear-gradient(160deg,rgba(255,107,26,0.07) 0%,transparent 100%);clip-path:polygon(0 0,100% 0,70% 100%,0 100%);}
.gp-ci{position:relative;z-index:2;width:100%;height:100%;display:flex;flex-direction:column;}
.gp-tb{display:flex;align-items:center;justify-content:flex-end;padding:13px 15px 0;}
.gp-logo{width:34px;height:34px;border-radius:8px;background:rgba(0,0,0,0.05);object-fit:contain;padding:3px;border:1px solid rgba(0,0,0,0.08);}
.gp-pn{letter-spacing:1.5px;line-height:0.92;padding:8px 15px 0;}
.bg-orange .gp-pn,.bg-split .gp-pn{color:#1a0d00;}.bg-teal .gp-pn{color:#001a17;}.bg-night .gp-pn{color:#1a0505;}
.gp-psub{padding:4px 15px 0;font-size:0.75rem;font-weight:600;letter-spacing:0.3px;line-height:1.3;}
.bg-orange .gp-psub,.bg-split .gp-psub{color:rgba(100,40,0,0.55);}.bg-teal .gp-psub{color:rgba(0,60,50,0.55);}.bg-night .gp-psub{color:rgba(100,20,20,0.5);}
.gp-pi{flex:1;display:flex;align-items:center;justify-content:center;position:relative;padding:4px 12px;min-height:0;}
.gp-pi img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 8px 20px rgba(0,0,0,0.18));position:relative;z-index:2;}
.gp-ring{position:absolute;border-radius:50%;pointer-events:none;}
.bg-orange .gp-ring,.bg-split .gp-ring{border:1px solid rgba(255,107,26,0.15);}
.bg-teal .gp-ring{border:1px solid rgba(0,168,150,0.15);}
.bg-night .gp-ring{border:1px solid rgba(255,80,80,0.12);}
.gp-noimgph{width:110px;height:110px;border:2px dashed rgba(0,0,0,0.15);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:rgba(0,0,0,0.25);font-size:0.65rem;}
.gp-bot{padding:6px 15px 10px;display:flex;gap:10px;align-items:flex-end;}
.gp-price{flex-shrink:0;border-radius:9px;padding:5px 11px;display:flex;flex-direction:column;align-items:center;background:#fff;box-shadow:0 3px 12px rgba(0,0,0,0.12);}
.gp-pfrom{font-size:0.5rem;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;}
.gp-pamt{letter-spacing:1px;line-height:1;font-weight:900;}
.bg-orange .gp-price .gp-pfrom,.bg-orange .gp-price .gp-pamt,.bg-split .gp-price .gp-pfrom,.bg-split .gp-price .gp-pamt{color:var(--orange);}
.bg-teal .gp-price .gp-pfrom,.bg-teal .gp-price .gp-pamt{color:#007a6e;}
.bg-night .gp-price .gp-pfrom,.bg-night .gp-price .gp-pamt{color:#cc3333;}
.gp-pts{flex:1;display:flex;flex-direction:column;gap:4px;}
.gp-pt{display:flex;align-items:flex-start;gap:5px;font-size:0.68rem;font-weight:700;line-height:1.3;text-align:left;}
.gp-pt .ic{font-size:0.75rem;flex-shrink:0;margin-top:1px;}
.bg-orange .gp-pt,.bg-split .gp-pt{color:rgba(50,20,0,0.8);}.bg-teal .gp-pt{color:rgba(0,40,35,0.8);}.bg-night .gp-pt{color:rgba(50,10,10,0.8);}

/* 1:1 */
.gp-sq{width:460px;height:460px;}
.gp-sq .gp-pn{font-size:2.6rem;flex-shrink:0;}
.gp-sq .gp-pi{flex:1;min-height:0;padding:8px 16px;}
.gp-sq .gp-pi img{width:100%;height:100%;}
.gp-sq .gp-ring:nth-child(1){width:190px;height:190px;top:50%;left:50%;transform:translate(-50%,-50%);}
.gp-sq .gp-ring:nth-child(2){width:270px;height:270px;top:50%;left:50%;transform:translate(-50%,-50%);}
.gp-sq .gp-bot{flex-shrink:0;padding:0 16px 14px;align-items:flex-start;}
.gp-sq .gp-pamt{font-size:1.6rem;}

/* 4:5 */
.gp-v45{width:400px;height:500px;}
.gp-v45 .gp-pn{font-size:2.4rem;flex-shrink:0;}
.gp-v45 .gp-pi{flex:1;min-height:0;padding:10px 16px;}
.gp-v45 .gp-pi img{width:100%;height:100%;}
.gp-v45 .gp-ring:nth-child(1){width:180px;height:180px;top:50%;left:50%;transform:translate(-50%,-50%);}
.gp-v45 .gp-ring:nth-child(2){width:260px;height:260px;top:50%;left:50%;transform:translate(-50%,-50%);}
.gp-v45 .gp-bot{flex-shrink:0;padding:0 16px 16px;align-items:flex-start;}
.gp-v45 .gp-pamt{font-size:1.5rem;}

/* Story */
.gp-st{width:300px;height:533px;position:relative;}
.gp-st .gp-ci{padding-top:52px;}
.gp-profile-bar{position:absolute;top:0;left:0;right:0;height:52px;display:flex;align-items:center;gap:8px;padding:0 12px;background:linear-gradient(to bottom,rgba(0,0,0,0.18),transparent);pointer-events:none;z-index:10;}
.gp-avatar{width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.7);background:rgba(255,255,255,0.25);}
.gp-spname{font-size:0.58rem;font-weight:700;color:rgba(255,255,255,0.85);}
.gp-sptime{font-size:0.52rem;color:rgba(255,255,255,0.55);margin-left:4px;}
.gp-st .gp-pn{font-size:2.1rem;flex-shrink:0;text-align:center;}
.gp-st .gp-psub{text-align:center;}
.gp-st-chips{flex-shrink:0;display:flex;gap:5px;justify-content:center;padding:6px 10px 0;}
.gp-st-chip{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 4px;border-radius:8px;background:rgba(255,255,255,0.82);box-shadow:0 2px 8px rgba(0,0,0,0.1);text-align:center;min-width:0;}
.gp-st-chip span:first-child{font-size:0.9rem;line-height:1;}
.gp-st-chip span:last-child{font-size:0.52rem;font-weight:700;line-height:1.2;word-break:break-word;}
.bg-orange .gp-st-chip span:last-child,.bg-split .gp-st-chip span:last-child{color:rgba(50,20,0,0.85);}
.bg-teal .gp-st-chip span:last-child{color:rgba(0,40,35,0.85);}
.bg-night .gp-st-chip span:last-child{color:rgba(50,10,10,0.85);}
.gp-pi-zone{flex:1;position:relative;min-height:0;margin:8px 0;}
.gp-pi-zone .gp-pi{position:absolute;inset:0;padding:0;}
.gp-pi-zone .gp-pi img{max-width:55%;max-height:55%;}
.gp-st-bottom{flex-shrink:0;padding:6px 16px 0;display:flex;flex-direction:column;align-items:center;gap:6px;}
.gp-st .gp-price{width:80%;flex-direction:row;justify-content:center;gap:8px;padding:8px 14px;border-radius:12px;}
.gp-st .gp-pfrom{font-size:0.55rem;}
.gp-st .gp-pamt{font-size:2rem;letter-spacing:0;}
.gp-msgbar{width:100%;height:44px;flex-shrink:0;margin-top:4px;}

/* Banner */
.gp-bn{width:540px;height:270px;}
.gp-bn .gp-ci{flex-direction:row;align-items:stretch;}
.gp-bn-left{width:240px;flex-shrink:0;display:flex;flex-direction:column;position:relative;overflow:hidden;}
.gp-bn-left::after{content:'';position:absolute;top:0;right:0;width:32px;height:100%;background:linear-gradient(to right,transparent,var(--bg-clr,#fff8f0));pointer-events:none;z-index:3;}
.gp-bn .gp-pi{flex:1;padding:12px 8px 12px 14px;}
.gp-bn .gp-ring{display:none;}
.gp-bn-right{flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:14px 16px 14px 4px;min-width:0;}
.gp-bn-tb{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
.gp-bn .gp-pn{font-size:1.7rem;line-height:0.9;padding:0;flex-shrink:0;}
.gp-bn .gp-psub{padding:3px 0 0;}
.gp-bn .gp-bot{padding:0;margin-top:auto;flex-direction:row;align-items:flex-end;gap:8px;}
.gp-bn .gp-pamt{font-size:1.25rem;}
.gp-bn .gp-pts{gap:3px;flex:1;}
.gp-bn .gp-pt{font-size:0.6rem;}
`;

export default function GeneradorPauta() {
  const [tpl, setTpl] = useState("orange");
  const [fmt, setFmt] = useState("sq");
  const [font, setFont] = useState("Bebas Neue");
  const [imgSrc, setImgSrc] = useState(null);
  const [imgScale, setImgScale] = useState(1);
  const [imgX, setImgX] = useState(0);
  const [imgY, setImgY] = useState(0);
  const [logoSrc, setLogoSrc] = useState(LOGO_DEFAULT);
  const [tab, setTab] = useState("upload");
  const [imgUrl, setImgUrl] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [name, setName] = useState("Puppy Cachorro");
  const [sub, setSub] = useState("");
  const [price, setPrice] = useState("12,750");
  const [points, setPoints] = useState([
    { t: "Fórmula premium para cachorros", e: "🐾" },
    { t: "Con DHA para desarrollo cerebral", e: "⭐" },
    { t: "Razas medianas, bolsa 2kg", e: "✅" },
  ]);
  const [picker, setPicker] = useState({ open: false, index: null, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const cardRef = useRef(null);

  // Inyectar CSS una vez
  useEffect(() => {
    if (!document.getElementById("gp-style")) {
      const style = document.createElement("style");
      style.id = "gp-style";
      style.textContent = CARD_CSS;
      document.head.appendChild(style);
    }
  }, []);

  // ── Helpers ──
  const readFile = (file, cb) => {
    const r = new FileReader();
    r.onload = (e) => cb(e.target.result, file.name);
    r.readAsDataURL(file);
  };

  const handleImgFile = (file) => {
    if (!file?.type.startsWith("image/")) return;
    readFile(file, (src, fname) => { setImgSrc(src); setPreviewName(fname); });
  };

  const handleLogoFile = (file) => {
    if (!file?.type.startsWith("image/")) return;
    readFile(file, (src) => setLogoSrc(src));
  };

  const applyUrl = () => {
    if (!imgUrl.trim()) return;
    setImgSrc(imgUrl.trim());
    setPreviewName(imgUrl.split("/").pop().split("?")[0] || "imagen");
  };

  const pAmt = price.includes("₡") ? price : "₡" + price;

  const fontStyle = {
    fontFamily: `'${font}', sans-serif`,
    fontWeight: ["Poppins", "Raleway"].includes(font) ? 900 : 800,
    letterSpacing: font === "Bebas Neue" ? "2px" : "1px",
  };

  const imgTransform = `translate(${imgX}px,${imgY}px) scale(${imgScale})`;

  const bgClass = { orange: "bg-orange", teal: "bg-teal", split: "bg-split", night: "bg-night" }[tpl];
  const fmtClass = { sq: "gp-sq", v45: "gp-v45", st: "gp-st", bn: "gp-bn" }[fmt];
  const bgColor = TEMPLATES.find((t) => t.key === tpl)?.bg || "#fff8f0";

  const activePts = points.filter((p) => p.t.trim());

  // ── Render de la tarjeta ──
  const CardImg = () =>
    imgSrc ? (
      <img src={imgSrc} alt={name} style={{ transform: imgTransform, transformOrigin: "center" }} />
    ) : (
      <div className="gp-noimgph"><span style={{ fontSize: "2rem" }}>📦</span><span>Sin imagen</span></div>
    );

  const PriceBadge = ({ big }: { big?: boolean }) => (
    <div className="gp-price" style={big ? { width: "80%", flexDirection: "row", justifyContent: "center", gap: 8, padding: "8px 14px", borderRadius: 12 } : {}}>
      <span className="gp-pfrom">DESDE</span>
      <span className="gp-pamt" style={{ ...fontStyle, fontSize: big ? "2rem" : undefined }}>{pAmt}</span>
    </div>
  );

  const LogoCorner = () => (
    <img className="gp-logo" src={logoSrc} alt="logo" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
  );

  const renderCard = () => {
    if (fmt === "st") {
      return (
        <div ref={cardRef} className={`gp-card ${bgClass} gp-st`}>
          <div className="g1" /><div className="g2" /><div className="gp-dots" />
          {tpl === "split" && <div className="gp-diag" />}
          {/* Preview: barra de perfil */}
          <div className="gp-profile-bar no-export">
            <div className="gp-avatar" />
            <span className="gp-spname">petshop2gocr</span>
            <span className="gp-sptime">· hace 2h</span>
          </div>
          <div className="gp-ci">
            <div className="gp-pn" style={fontStyle}>{name}</div>
            {sub && <div className="gp-psub">{sub}</div>}
            <div className="gp-st-chips">
              {activePts.slice(0, 3).map((p, i) => (
                <div key={i} className="gp-st-chip">
                  <span>{p.e}</span><span>{p.t}</span>
                </div>
              ))}
            </div>
            <div className="gp-pi-zone">
              <div className="gp-pi">
                <div className="gp-ring" /><div className="gp-ring" />
                <CardImg />
              </div>
            </div>
            <div className="gp-st-bottom">
              <PriceBadge big />
              {/* Preview: espacio barra de mensaje */}
              <div className="gp-msgbar no-export" />
            </div>
          </div>
        </div>
      );
    }

    if (fmt === "bn") {
      return (
        <div ref={cardRef} className={`gp-card ${bgClass} gp-bn`} style={{ "--bg-clr": bgColor } as React.CSSProperties}>
          <div className="g1" /><div className="g2" /><div className="gp-dots" />
          {tpl === "split" && <div className="gp-diag" />}
          <div className="gp-ci">
            <div className="gp-bn-left">
              <div className="gp-pi"><CardImg /></div>
            </div>
            <div className="gp-bn-right">
              <div className="gp-bn-tb"><LogoCorner /></div>
              <div className="gp-pn" style={fontStyle}>{name}</div>
              {sub && <div className="gp-psub">{sub}</div>}
              <div className="gp-bot">
                <PriceBadge big={false} />
                <div className="gp-pts">
                  {activePts.map((p, i) => (
                    <div key={i} className="gp-pt"><span className="ic">{p.e}</span><span>{p.t}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 1:1 y 4:5
    return (
      <div ref={cardRef} className={`gp-card ${bgClass} ${fmtClass}`}>
        <div className="g1" /><div className="g2" /><div className="gp-dots" />
        {tpl === "split" && <div className="gp-diag" />}
        <div className="gp-ci">
          <div className="gp-tb"><LogoCorner /></div>
          <div className="gp-pn" style={fontStyle}>{name}</div>
          {sub && <div className="gp-psub">{sub}</div>}
          <div className="gp-pi">
            <div className="gp-ring" /><div className="gp-ring" />
            <CardImg />
          </div>
          <div className="gp-bot">
            <PriceBadge big={false} />
            <div className="gp-pts">
              {activePts.map((p, i) => (
                <div key={i} className="gp-pt"><span className="ic">{p.e}</span><span>{p.t}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Descarga PNG ──
  const doDownload = () => {
    const card = cardRef.current as HTMLElement | null;
    if (!card) return;

    // Temporarily remove preview scaling from the wrapper to ensure pixel-perfect capture
    const scaleWrapper = card.parentElement;
    const origTransform = scaleWrapper?.style.transform || '';
    if (scaleWrapper) scaleWrapper.style.transform = 'none';

    const noExport = card.querySelectorAll(".no-export");
    noExport.forEach((el) => ((el as HTMLElement).style.visibility = "hidden"));

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    const run = () => {
      (window as any).html2canvas(card, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        windowWidth: card.scrollWidth,
        windowHeight: card.scrollHeight,
      }).then((c: HTMLCanvasElement) => {
        noExport.forEach((el) => ((el as HTMLElement).style.visibility = ""));
        if (scaleWrapper) scaleWrapper.style.transform = origTransform;
        const a = document.createElement("a");
        a.download = `petshop2go-${tpl}-${fmt}.png`;
        a.href = c.toDataURL("image/png");
        a.click();
      }).catch(() => {
        noExport.forEach((el) => ((el as HTMLElement).style.visibility = ""));
        if (scaleWrapper) scaleWrapper.style.transform = origTransform;
      });
    };
    if (!(window as any).html2canvas) { script.onload = run; document.head.appendChild(script); }
    else run();
  };

  // ── Sidebar + Preview use design system tokens ──

  return (
    <div className="flex flex-col lg:flex-row min-h-[500px] max-h-[80vh] overflow-hidden rounded-xl border border-border bg-card shadow-sm">

      {/* ── SIDEBAR ── */}
      <div className="w-full lg:w-[300px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card overflow-y-auto p-4 max-h-[40vh] lg:max-h-none" style={{ fontFamily: "'Montserrat', sans-serif" }}>

        {/* Imagen */}
        <div className="text-[0.58rem] font-extrabold tracking-[2.5px] uppercase text-primary mb-2">🖼 Imagen del Producto</div>
        <div className="bg-muted/50 border border-border rounded-[10px] p-3 mb-3">
          <div className="flex gap-1.5 mb-2.5">
            {(["upload", "url"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-[0.68rem] font-extrabold border-[1.5px] transition-all ${
                  tab === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-transparent text-muted-foreground"
                }`}
                style={{ fontFamily: "Montserrat" }}>
                {t === "upload" ? "⬆ Subir" : "🔗 URL"}
              </button>
            ))}
          </div>
          {tab === "upload" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleImgFile(e.dataTransfer.files[0]); }}
              className={`border-2 border-dashed rounded-lg py-4 px-2.5 text-center cursor-pointer relative transition-colors ${
                dragging ? "border-primary bg-primary/10" : "border-primary/30 bg-primary/5"
              }`}>
              <input type="file" accept="image/*" onChange={(e) => handleImgFile(e.target.files?.[0])} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              <div className="text-2xl">📂</div>
              <div className="text-[0.68rem] font-bold text-primary">Arrastrá o seleccioná</div>
              <div className="text-[0.6rem] text-muted-foreground mt-0.5">PNG transparente recomendado</div>
            </div>
          )}
          {tab === "url" && (
            <div>
              <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} onBlur={applyUrl} onKeyDown={(e) => e.key === "Enter" && applyUrl()} placeholder="https://..."
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary mb-1" style={{ fontFamily: "Montserrat" }} />
              <div className="text-[0.6rem] text-primary/70">💡 PNG transparente para mejor resultado</div>
            </div>
          )}
          {imgSrc && (
            <div className="mt-2 flex items-center gap-2 bg-muted/60 rounded-lg p-1.5">
              <img src={imgSrc} alt="" className="w-[42px] h-[42px] object-contain rounded-md bg-background border border-border" />
              <div className="flex-1 min-w-0">
                <div className="text-[0.68rem] font-bold text-foreground truncate">{previewName}</div>
                <div className="text-[0.6rem] text-muted-foreground">Imagen cargada ✅</div>
              </div>
              <button onClick={() => { setImgSrc(null); setPreviewName(""); }} className="bg-transparent border-none text-destructive/50 cursor-pointer text-base hover:text-destructive">✕</button>
            </div>
          )}
        </div>

        {/* Escala + posición */}
        {[
          { label: "🔍 ESCALA", val: Math.round(imgScale * 100) + "%", min: 50, max: 200, value: Math.round(imgScale * 100), onChange: (v: number) => setImgScale(v / 100) },
          { label: "↔ X", val: imgX, min: -100, max: 100, value: imgX, onChange: setImgX },
          { label: "↕ Y", val: imgY, min: -100, max: 100, value: imgY, onChange: setImgY },
        ].map(({ label, val, min, max, value, onChange }) => (
          <div key={label} className="flex items-center gap-2 mb-2.5">
            <label className="text-[0.68rem] font-bold text-muted-foreground whitespace-nowrap">{label}</label>
            <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)}
              className="flex-1 accent-primary" />
            <span className="text-[0.68rem] font-extrabold text-primary min-w-[32px] text-right">{val}</span>
          </div>
        ))}

        {/* Producto */}
        <div className="text-[0.58rem] font-extrabold tracking-[2.5px] uppercase text-primary mb-2 mt-2">📦 Producto</div>
        {[
          { label: "NOMBRE", value: name, onChange: setName, placeholder: "Nombre del producto" },
          { label: "VARIANTE / DESCRIPCIÓN (opcional)", value: sub, onChange: setSub, placeholder: "ej. Razas medianas · Pollo · 2kg" },
          { label: "PRECIO (₡)", value: price, onChange: setPrice, placeholder: "12,750" },
        ].map(({ label, value, onChange, placeholder }) => (
          <div key={label}>
            <label className="block text-[0.68rem] font-bold text-muted-foreground mb-1">{label}</label>
            <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-primary" style={{ fontFamily: "Montserrat" }} />
          </div>
        ))}

        {/* Puntos clave */}
        <div className="text-[0.58rem] font-extrabold tracking-[2.5px] uppercase text-primary mb-2 mt-2">✅ Puntos Clave</div>
        {points.map((p, i) => (
          <div key={i} className="flex gap-1.5 mb-[7px] items-center relative">
            <input value={p.t} onChange={(e) => { const np = [...points]; np[i] = { ...np[i], t: e.target.value }; setPoints(np); }}
              placeholder={`Punto ${i + 1}${i === 2 ? " (opcional)" : ""}`}
              className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" style={{ fontFamily: "Montserrat" }} />
            <button onClick={(e) => { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setPicker({ open: picker.open && picker.index === i ? false : true, index: i, x: rect.left - 180, y: rect.bottom + 4 }); }}
              className="w-9 h-9 rounded-lg bg-muted border border-border text-base cursor-pointer flex items-center justify-center hover:bg-accent transition-colors">
              {p.e}
            </button>
          </div>
        ))}

        {/* Emoji Picker */}
        {picker.open && (
          <div className="fixed z-[9999] bg-popover border border-border rounded-xl p-2.5 w-[220px] shadow-lg" style={{ top: picker.y, left: Math.max(4, picker.x) }}>
            <div className="grid grid-cols-7 gap-[3px]">
              {EMOJIS.map((e, i) => (
                <div key={i} onClick={() => { const np = [...points]; np[picker.index!] = { ...np[picker.index!], e }; setPoints(np); setPicker({ ...picker, open: false }); }}
                  className={`w-7 h-7 rounded-md text-base flex items-center justify-center cursor-pointer transition-colors hover:bg-accent ${
                    points[picker.index!]?.e === e ? "bg-primary/20" : ""
                  }`}>
                  {e}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-border my-3.5" />

        {/* Fuente */}
        <div className="text-[0.58rem] font-extrabold tracking-[2.5px] uppercase text-primary mb-2">🔤 Fuente del Título</div>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {FONTS.map((f) => (
            <div key={f.key} onClick={() => setFont(f.key)}
              className={`border-2 rounded-lg py-2 px-1.5 cursor-pointer text-center transition-all ${
                font === f.key
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted text-muted-foreground"
              }`}>
              <div style={{ fontFamily: `'${f.key}', sans-serif`, fontWeight: 800, fontSize: "1rem", lineHeight: 1, marginBottom: 2 }}>{f.label}</div>
              <div className="text-[0.58rem] text-muted-foreground">{f.sub}</div>
            </div>
          ))}
        </div>

        {/* Plantilla */}
        <div className="text-[0.58rem] font-extrabold tracking-[2.5px] uppercase text-primary mb-2">🎨 Plantilla</div>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {TEMPLATES.map((t) => (
            <div key={t.key} onClick={() => setTpl(t.key)}
              className={`border-2 rounded-lg py-2 px-1.5 cursor-pointer text-center transition-all ${
                tpl === t.key
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted"
              }`}>
              <div className="text-lg mb-0.5">{t.icon}</div>
              <div className="text-[0.6rem] font-extrabold tracking-[0.5px] text-muted-foreground">{t.name}</div>
            </div>
          ))}
        </div>

        {/* Formato */}
        <div className="text-[0.58rem] font-extrabold tracking-[2.5px] uppercase text-primary mb-2">📐 Formato</div>
        <div className="flex gap-[5px] flex-wrap mb-2">
          {FORMATS.map((f) => (
            <button key={f.key} onClick={() => setFmt(f.key)}
              className={`border-[1.5px] rounded-lg px-2.5 py-1 cursor-pointer text-[0.65rem] font-extrabold transition-all ${
                fmt === f.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground"
              }`}
              style={{ fontFamily: "Montserrat" }}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="h-px bg-border my-3.5" />

        {/* Logo */}
        <div className="text-[0.58rem] font-extrabold tracking-[2.5px] uppercase text-primary mb-2">🏷 Logo de la Tienda</div>
        <div className="bg-muted/50 border border-border rounded-[10px] p-3 mb-2.5">
          <div className="relative border-2 border-dashed border-primary/30 rounded-lg p-2.5 text-center cursor-pointer bg-primary/5">
            <input type="file" accept="image/*" onChange={(e) => handleLogoFile(e.target.files?.[0])} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            <div className="text-[0.65rem] font-bold text-primary">📁 Subir logo</div>
          </div>
          {logoSrc !== LOGO_DEFAULT && (
            <button onClick={() => setLogoSrc(LOGO_DEFAULT)} className="mt-1.5 text-[0.6rem] bg-transparent border-none text-destructive/50 cursor-pointer hover:text-destructive">✕ Restaurar logo original</button>
          )}
        </div>
      </div>

      {/* ── PREVIEW ── */}
      <div className="flex-1 flex flex-col items-center p-4 lg:p-6 gap-4 overflow-y-auto overflow-x-auto bg-muted/40 min-h-[300px]">
        {/* Barra de formatos + descarga */}
        <div className="flex gap-1.5 w-full max-w-[560px] items-center flex-wrap">
          {FORMATS.map((f) => (
            <button key={f.key} onClick={() => setFmt(f.key)}
              className={`border-[1.5px] rounded-lg px-2.5 py-1 cursor-pointer text-[0.65rem] font-extrabold transition-all ${
                fmt === f.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground"
              }`}
              style={{ fontFamily: "Montserrat" }}>
              {f.label}
            </button>
          ))}
          <button onClick={doDownload}
            className="ml-auto bg-primary text-primary-foreground border-none rounded-lg px-4 py-[7px] text-[0.72rem] font-extrabold cursor-pointer hover:opacity-90 transition-opacity"
            style={{ fontFamily: "Montserrat" }}>
            ⬇ Descargar PNG
          </button>
        </div>

        {/* Tarjeta — scale down on smaller viewports */}
        <div className="flex items-center justify-center flex-1 w-full" style={{ transform: 'scale(var(--gp-scale, 1))', transformOrigin: 'top center' }}>
          <style>{`@media (max-width: 768px) { :root { --gp-scale: 0.6; } } @media (min-width: 769px) and (max-width: 1100px) { :root { --gp-scale: 0.8; } }`}</style>
          {renderCard()}
        </div>
      </div>

      {/* Cerrar picker al click fuera */}
      {picker.open && <div onClick={() => setPicker({ ...picker, open: false })} className="fixed inset-0 z-[9998]" />}
    </div>
  );
}
