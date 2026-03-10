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
            <PriceBadge />
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
    const card = cardRef.current;
    if (!card) return;
    const noExport = card.querySelectorAll(".no-export");
    noExport.forEach((el) => (el.style.visibility = "hidden"));

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = () => {
      window.html2canvas(card, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: null }).then((c) => {
        noExport.forEach((el) => (el.style.visibility = ""));
        const a = document.createElement("a");
        a.download = `petshop2go-${tpl}-${fmt}.png`;
        a.href = c.toDataURL("image/png");
        a.click();
      });
    };
    if (!window.html2canvas) document.head.appendChild(script);
    else script.onload();
  };

  // ── Sidebar styles (Tailwind) ──
  const SB = "w-[300px] flex-shrink-0 bg-white border-r border-black/10 overflow-y-auto p-4 shadow-md";
  const SEC = "text-[0.58rem] font-extrabold tracking-[2.5px] uppercase text-orange-500 mt-4 mb-2 first:mt-0";
  const INP = "w-full bg-[#f5f4f0] border border-black/10 rounded-lg text-sm px-3 py-2 mb-2 outline-none focus:border-orange-400 font-[Montserrat]";
  const BTN_TPL = (on) => `border-2 rounded-lg p-2 cursor-pointer text-center transition-all text-xs font-extrabold ${on ? "border-orange-400 bg-orange-50" : "border-black/10 bg-[#f5f4f0] text-black/40"}`;
  const BTN_FMT = (on) => `border rounded-lg px-3 py-1 cursor-pointer text-xs font-extrabold transition-all ${on ? "border-teal-500 bg-teal-50 text-teal-600" : "border-black/10 bg-[#f5f4f0] text-black/40"}`;

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", display: "flex", height: "100%", background: "#e8e6df", overflow: "hidden" }}>

      {/* ── SIDEBAR ── */}
      <div className={SB} style={{ width: 300, flexShrink: 0, background: "#fff", borderRight: "1px solid rgba(0,0,0,0.08)", overflowY: "auto", padding: 16 }}>

        {/* Imagen */}
        <div className={SEC} style={{ color: "#FF6B1A", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>🖼 Imagen del Producto</div>
        <div style={{ background: "#f5f4f0", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {["upload", "url"].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: "6px", borderRadius: 7, cursor: "pointer", fontSize: "0.68rem", fontWeight: 800, border: `1.5px solid ${tab === t ? "#00A896" : "rgba(0,0,0,0.1)"}`, background: tab === t ? "rgba(0,168,150,0.08)" : "transparent", color: tab === t ? "#00A896" : "rgba(0,0,0,0.4)", fontFamily: "Montserrat" }}>
                {t === "upload" ? "⬆ Subir" : "🔗 URL"}
              </button>
            ))}
          </div>
          {tab === "upload" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleImgFile(e.dataTransfer.files[0]); }}
              style={{ border: `2px dashed ${dragging ? "#00A896" : "rgba(0,168,150,0.35)"}`, borderRadius: 8, padding: "16px 10px", textAlign: "center", cursor: "pointer", position: "relative", background: dragging ? "rgba(0,168,150,0.08)" : "rgba(0,168,150,0.03)" }}>
              <input type="file" accept="image/*" onChange={(e) => handleImgFile(e.target.files[0])} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
              <div style={{ fontSize: "1.4rem" }}>📂</div>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#00A896" }}>Arrastrá o seleccioná</div>
              <div style={{ fontSize: "0.6rem", color: "rgba(0,0,0,0.35)", marginTop: 2 }}>PNG transparente recomendado</div>
            </div>
          )}
          {tab === "url" && (
            <div>
              <input className={INP} value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} onBlur={applyUrl} onKeyDown={(e) => e.key === "Enter" && applyUrl()} placeholder="https://..." style={{ background: "#f5f4f0", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 7, padding: "8px 11px", fontSize: "0.8rem", width: "100%", marginBottom: 4, fontFamily: "Montserrat" }} />
              <div style={{ fontSize: "0.6rem", color: "rgba(0,168,150,0.7)" }}>💡 PNG transparente para mejor resultado</div>
            </div>
          )}
          {imgSrc && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: "6px 8px" }}>
              <img src={imgSrc} alt="" style={{ width: 42, height: 42, objectFit: "contain", borderRadius: 6, background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{previewName}</div>
                <div style={{ fontSize: "0.6rem", color: "rgba(0,0,0,0.4)" }}>Imagen cargada ✅</div>
              </div>
              <button onClick={() => { setImgSrc(null); setPreviewName(""); }} style={{ background: "none", border: "none", color: "rgba(200,60,60,0.5)", cursor: "pointer", fontSize: "1rem" }}>✕</button>
            </div>
          )}
        </div>

        {/* Escala + posición */}
        {[
          { label: "🔍 ESCALA", val: Math.round(imgScale * 100) + "%", min: 50, max: 200, value: Math.round(imgScale * 100), onChange: (v) => setImgScale(v / 100) },
          { label: "↔ X", val: imgX, min: -100, max: 100, value: imgX, onChange: setImgX },
          { label: "↕ Y", val: imgY, min: -100, max: 100, value: imgY, onChange: setImgY },
        ].map(({ label, val, min, max, value, onChange }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(0,0,0,0.45)", whiteSpace: "nowrap" }}>{label}</label>
            <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)}
              style={{ flex: 1, accentColor: "#FF6B1A" }} />
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#FF6B1A", minWidth: 32, textAlign: "right" }}>{val}</span>
          </div>
        ))}

        {/* Producto */}
        <div style={{ color: "#FF6B1A", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8, marginTop: 8 }}>📦 Producto</div>
        {[
          { label: "NOMBRE", value: name, onChange: setName, placeholder: "Nombre del producto" },
          { label: "VARIANTE / DESCRIPCIÓN (opcional)", value: sub, onChange: setSub, placeholder: "ej. Razas medianas · Pollo · 2kg" },
          { label: "PRECIO (₡)", value: price, onChange: setPrice, placeholder: "12,750" },
        ].map(({ label, value, onChange, placeholder }) => (
          <div key={label}>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "rgba(0,0,0,0.45)", marginBottom: 4 }}>{label}</label>
            <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
              style={{ width: "100%", background: "#f5f4f0", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 7, padding: "8px 11px", fontSize: "0.8rem", marginBottom: 9, fontFamily: "Montserrat", outline: "none" }} />
          </div>
        ))}

        {/* Puntos clave */}
        <div style={{ color: "#FF6B1A", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8, marginTop: 8 }}>✅ Puntos Clave</div>
        {points.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 7, alignItems: "center", position: "relative" }}>
            <input value={p.t} onChange={(e) => { const np = [...points]; np[i] = { ...np[i], t: e.target.value }; setPoints(np); }}
              placeholder={`Punto ${i + 1}${i === 2 ? " (opcional)" : ""}`}
              style={{ flex: 1, background: "#f5f4f0", border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: 7, padding: "8px 11px", fontSize: "0.8rem", fontFamily: "Montserrat", outline: "none" }} />
            <button onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setPicker({ open: picker.open && picker.index === i ? false : true, index: i, x: rect.left - 180, y: rect.bottom + 4 }); }}
              style={{ width: 36, height: 36, borderRadius: 7, background: "#f0ede6", border: "1.5px solid rgba(0,0,0,0.1)", fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {p.e}
            </button>
          </div>
        ))}

        {/* Emoji Picker */}
        {picker.open && (
          <div style={{ position: "fixed", zIndex: 9999, background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 10, width: 220, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", top: picker.y, left: Math.max(4, picker.x) }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
              {EMOJIS.map((e, i) => (
                <div key={i} onClick={() => { const np = [...points]; np[picker.index] = { ...np[picker.index], e }; setPoints(np); setPicker({ ...picker, open: false }); }}
                  style={{ width: 28, height: 28, borderRadius: 6, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: points[picker.index]?.e === e ? "rgba(255,107,26,0.22)" : "transparent" }}>
                  {e}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 1, background: "rgba(0,0,0,0.08)", margin: "14px 0" }} />

        {/* Fuente */}
        <div style={{ color: "#FF6B1A", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>🔤 Fuente del Título</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
          {FONTS.map((f) => (
            <div key={f.key} onClick={() => setFont(f.key)}
              style={{ border: `2px solid ${font === f.key ? "#FF6B1A" : "rgba(0,0,0,0.1)"}`, borderRadius: 8, padding: "8px 6px", cursor: "pointer", textAlign: "center", background: font === f.key ? "rgba(255,107,26,0.08)" : "#f5f4f0" }}>
              <div style={{ fontFamily: `'${f.key}', sans-serif`, fontWeight: 800, fontSize: "1rem", lineHeight: 1, marginBottom: 2 }}>{f.label}</div>
              <div style={{ fontSize: "0.58rem", color: "rgba(0,0,0,0.4)" }}>{f.sub}</div>
            </div>
          ))}
        </div>

        {/* Plantilla */}
        <div style={{ color: "#FF6B1A", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>🎨 Plantilla</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
          {TEMPLATES.map((t) => (
            <div key={t.key} onClick={() => setTpl(t.key)}
              style={{ border: `2px solid ${tpl === t.key ? "#FF6B1A" : "rgba(0,0,0,0.1)"}`, borderRadius: 8, padding: "8px 6px", cursor: "pointer", textAlign: "center", background: tpl === t.key ? "rgba(255,107,26,0.1)" : "#f5f4f0" }}>
              <div style={{ fontSize: "1.1rem", marginBottom: 2 }}>{t.icon}</div>
              <div style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.5px", color: "rgba(0,0,0,0.55)" }}>{t.name}</div>
            </div>
          ))}
        </div>

        {/* Formato */}
        <div style={{ color: "#FF6B1A", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>📐 Formato</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
          {FORMATS.map((f) => (
            <button key={f.key} onClick={() => setFmt(f.key)}
              style={{ border: `1.5px solid ${fmt === f.key ? "#00A896" : "rgba(0,0,0,0.1)"}`, borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontSize: "0.65rem", fontWeight: 800, background: fmt === f.key ? "rgba(0,168,150,0.1)" : "#f5f4f0", color: fmt === f.key ? "#00A896" : "rgba(0,0,0,0.45)", fontFamily: "Montserrat" }}>
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ height: 1, background: "rgba(0,0,0,0.08)", margin: "14px 0" }} />

        {/* Logo */}
        <div style={{ color: "#FF6B1A", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>🏷 Logo de la Tienda</div>
        <div style={{ background: "#f5f4f0", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ position: "relative", border: "2px dashed rgba(255,107,26,0.3)", borderRadius: 8, padding: 10, textAlign: "center", cursor: "pointer", background: "rgba(255,107,26,0.03)" }}>
            <input type="file" accept="image/*" onChange={(e) => handleLogoFile(e.target.files[0])} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#FF6B1A" }}>📁 Subir logo</div>
          </div>
          {logoSrc !== LOGO_DEFAULT && (
            <button onClick={() => setLogoSrc(LOGO_DEFAULT)} style={{ marginTop: 6, fontSize: "0.6rem", background: "none", border: "none", color: "rgba(200,60,60,0.5)", cursor: "pointer" }}>✕ Restaurar logo original</button>
          )}
        </div>
      </div>

      {/* ── PREVIEW ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: 24, gap: 16, overflowY: "auto", background: "#ddd9cf" }}>
        {/* Barra de formatos + descarga */}
        <div style={{ display: "flex", gap: 6, width: "100%", maxWidth: 560, alignItems: "center", flexWrap: "wrap" }}>
          {FORMATS.map((f) => (
            <button key={f.key} onClick={() => setFmt(f.key)}
              style={{ border: `1.5px solid ${fmt === f.key ? "#00A896" : "rgba(0,0,0,0.1)"}`, borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontSize: "0.65rem", fontWeight: 800, background: fmt === f.key ? "rgba(0,168,150,0.1)" : "#f5f4f0", color: fmt === f.key ? "#00A896" : "rgba(0,0,0,0.45)", fontFamily: "Montserrat" }}>
              {f.label}
            </button>
          ))}
          <button onClick={doDownload}
            style={{ marginLeft: "auto", background: "#00A896", border: "none", borderRadius: 7, color: "#fff", padding: "7px 16px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer", fontFamily: "Montserrat" }}>
            ⬇ Descargar PNG
          </button>
        </div>

        {/* Tarjeta */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, width: "100%" }}>
          {renderCard()}
        </div>
      </div>

      {/* Cerrar picker al click fuera */}
      {picker.open && <div onClick={() => setPicker({ ...picker, open: false })} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />}
    </div>
  );
}
