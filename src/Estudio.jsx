import React, { useEffect, useRef, useState } from "react";

// ─── Estúdio: gerador de carrossel + story, na identidade Preto & Branco ───────
// Sobe foto/logo (base64), escolhe o modelo, ARRASTA a imagem pra posicionar,
// baixa/salva nas Fotos do celular. Tudo no <canvas>, roda no próprio aparelho.

const PRETO = "#0A0A0A", PAPEL = "#F4F3F1", GRAF = "#6E6E73", BRANCO = "#FFFFFF";
const FMT = { carrossel: { w: 1080, h: 1350 }, quadrado: { w: 1080, h: 1080 }, story: { w: 1080, h: 1920 } };
let _uid = 0;
const novoSlide = (tpl) => ({
  id: ++_uid, tpl: tpl || "capa", tema: "preto", titulo: "", corpo: "", palavra: "",
  imgData: null, imgUso: "logo", logoPos: { x: 0.82, y: 0.14 }, logoScale: 0.2,
});

// ── helpers de canvas ──
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function paleta(t) {
  return t === "papel"
    ? { bg: PAPEL, ink: PRETO, mut: GRAF, barbg: PRETO, barink: PAPEL }
    : { bg: PRETO, ink: PAPEL, mut: "#9A9A9E", barbg: PAPEL, barink: PRETO };
}
function badge(c, x, y, s) {
  const g = c.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, "#2C2C30"); g.addColorStop(0.55, "#161618"); g.addColorStop(1, "#050506");
  c.fillStyle = g; rr(c, x, y, s, s, s * 0.24); c.fill();
  c.fillStyle = "#fff"; c.font = "800 " + s * 0.42 + "px 'Bricolage Grotesque'";
  c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("CS", x + s / 2, y + s / 2 + s * 0.03);
  c.textAlign = "left"; c.textBaseline = "alphabetic";
}
function bar(c, text, x, y, size, pal) {
  c.font = "700 " + size + "px 'Bricolage Grotesque'";
  const padX = size * 0.5, padY = size * 0.42, tw = c.measureText(text.toUpperCase()).width;
  c.fillStyle = pal.barbg; rr(c, x, y, tw + padX * 2, size + padY * 2, size * 0.28); c.fill();
  c.fillStyle = pal.barink; c.textBaseline = "middle"; c.fillText(text.toUpperCase(), x + padX, y + (size + padY * 2) / 2 + size * 0.04);
  c.textBaseline = "alphabetic"; return { w: tw + padX * 2, h: size + padY * 2 };
}
function wrap(c, text, maxW) {
  const out = [];
  (text || "").split("\n").forEach((par) => {
    const words = par.split(" "); let line = "";
    for (const w of words) { const t = line ? line + " " + w : w; if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
    out.push(line);
  });
  return out;
}
function fit(c, text, family, weight, maxW, maxLines, start, min) {
  let size = start;
  while (size > min) { c.font = weight + " " + size + "px '" + family + "'"; const ls = wrap(c, text, maxW); if (ls.length <= maxLines) return { size, lines: ls }; size -= 2; }
  c.font = weight + " " + min + "px '" + family + "'"; return { size: min, lines: wrap(c, text, maxW) };
}
function cover(c, img, x, y, w, h) { const r = Math.max(w / img.width, h / img.height), iw = img.width * r, ih = img.height * r; c.save(); rr(c, x, y, w, h, 0); c.clip(); c.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); c.restore(); }
function grain(c, W, H, a) { c.save(); for (let i = 0; i < Math.floor(W * H / 2600); i++) { c.globalAlpha = Math.random() * a; c.fillStyle = Math.random() < 0.5 ? "#fff" : "#000"; c.fillRect(Math.random() * W, Math.random() * H, 2, 2); } c.restore(); }

function draw(c, W, H, sl, idx, total, handle, img) {
  let p = paleta(sl.tema), M = Math.round(W * 0.085), badgeS = Math.round(W * 0.088);
  c.clearRect(0, 0, W, H);
  const comLogo = img && sl.imgUso === "logo" && sl.tpl !== "foto";
  const comFundo = img && (sl.imgUso === "fundo" || sl.tpl === "foto");
  if (comFundo) {
    cover(c, img, 0, 0, W, H);
    const gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "rgba(10,10,10,.55)"); gr.addColorStop(0.42, "rgba(10,10,10,.15)");
    gr.addColorStop(0.72, "rgba(10,10,10,.45)"); gr.addColorStop(1, "rgba(10,10,10,.9)");
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    p = { bg: PRETO, ink: BRANCO, mut: "#D9D9DB", barbg: BRANCO, barink: PRETO };
  } else { c.fillStyle = p.bg; c.fillRect(0, 0, W, H); grain(c, W, H, 0.028); }

  const logoTL = comLogo && sl.logoPos.x < 0.35 && sl.logoPos.y < 0.3;
  const logoTR = comLogo && sl.logoPos.x > 0.6 && sl.logoPos.y < 0.3;
  if (sl.tpl !== "frase") {
    if (!logoTL) badge(c, M, M, badgeS);
    if (handle && !logoTR) { c.textAlign = "right"; c.font = "600 " + Math.round(W * 0.03) + "px 'Hanken Grotesk'"; c.fillStyle = p.mut; c.fillText(handle, W - M, M + badgeS * 0.66); c.textAlign = "left"; }
  }
  c.textAlign = "left"; c.textBaseline = "alphabetic";

  if (sl.tpl === "capa") {
    const footY = H - M - Math.round(W * 0.07);
    const t = (sl.titulo || "O seu gancho aqui").toUpperCase();
    const f = fit(c, t, "Anton", "400", W - M * 2, 6, Math.round(W * 0.11), Math.round(W * 0.05));
    const lh = f.size * 1.02, blockH = f.lines.length * lh;
    const barH = sl.palavra ? Math.round(W * 0.052) * 1.84 + Math.round(W * 0.03) : 0;
    let y = footY - barH - blockH;
    const teto = M + badgeS + Math.round(W * 0.05);
    if (y < teto) y = teto;
    c.fillStyle = p.ink; c.font = "400 " + f.size + "px 'Anton'";
    f.lines.forEach((l, i) => c.fillText(l, M, y + i * lh + f.size));
    if (sl.palavra) bar(c, sl.palavra, M, y + blockH + Math.round(W * 0.03), Math.round(W * 0.05), p);
    // rodapé: assinatura da marca — ou "arrasta pro lado" no carrossel
    c.textAlign = "left";
    if (total > 1 && idx < total - 1) {
      c.font = "700 " + Math.round(W * 0.032) + "px 'Bricolage Grotesque'"; c.fillStyle = p.mut;
      c.fillText("arrasta pro lado  →", M, H - M);
    } else {
      c.font = "700 " + Math.round(W * 0.03) + "px 'Bricolage Grotesque'"; c.fillStyle = p.ink;
      c.fillText("EVOLUÇÃO & NEGÓCIOS", M, H - M - Math.round(W * 0.032));
      c.font = "500 " + Math.round(W * 0.028) + "px 'Hanken Grotesk'"; c.fillStyle = p.mut;
      c.fillText("o que ninguém mostra sobre empreender", M, H - M);
    }
  } else if (sl.tpl === "conteudo") {
    c.textAlign = "right"; c.font = "800 " + Math.round(W * 0.032) + "px 'Bricolage Grotesque'"; c.fillStyle = p.mut;
    c.fillText(String(idx + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0"), W - M, M + badgeS * 0.66); c.textAlign = "left";
    const ty = Math.round(H * 0.3);
    const tf = fit(c, sl.titulo || "Título do slide", "Bricolage Grotesque", "800", W - M * 2, 3, Math.round(W * 0.086), Math.round(W * 0.05));
    c.fillStyle = p.ink; c.font = "800 " + tf.size + "px 'Bricolage Grotesque'";
    const tlh = tf.size; tf.lines.forEach((l, i) => c.fillText(l, M, ty + i * tlh));
    let by = ty + tf.lines.length * tlh + Math.round(W * 0.06);
    if (sl.palavra) { const bb = bar(c, sl.palavra, M, by, Math.round(W * 0.044), p); by += bb.h + Math.round(W * 0.05); }
    const bf = fit(c, sl.corpo || "Escreve o miolo do slide aqui. Uma ideia por slide, direto ao ponto.", "Hanken Grotesk", "500", W - M * 2, 12, Math.round(W * 0.05), Math.round(W * 0.036));
    c.fillStyle = p.mut; c.font = "500 " + bf.size + "px 'Hanken Grotesk'"; const blh = bf.size * 1.42;
    bf.lines.forEach((l, i) => c.fillText(l, M, by + i * blh + bf.size));
  } else if (sl.tpl === "foto") {
    const t2 = sl.titulo || "Sua frase na foto";
    const f2 = fit(c, t2, "Bricolage Grotesque", "800", W - M * 2, 4, Math.round(W * 0.09), Math.round(W * 0.05));
    const lh2 = f2.size, bh = f2.lines.length * lh2, y0 = H - M - bh - (sl.palavra ? Math.round(W * 0.12) : 0);
    if (sl.palavra) bar(c, sl.palavra, M, y0 - Math.round(W * 0.02), Math.round(W * 0.046), p);
    c.fillStyle = p.ink; c.font = "800 " + f2.size + "px 'Bricolage Grotesque'";
    f2.lines.forEach((l, i) => c.fillText(l, M, y0 + Math.round(W * 0.08) + i * lh2 + f2.size));
    if (!img) { c.fillStyle = p.mut; c.font = "600 " + Math.round(W * 0.036) + "px 'Hanken Grotesk'"; c.textAlign = "center"; c.fillText("↑ suba uma imagem no painel", W / 2, H * 0.5); c.textAlign = "left"; }
  } else if (sl.tpl === "frase") {
    // aspa grande no topo
    c.textAlign = "left"; c.fillStyle = p.ink; c.font = "800 " + Math.round(W * 0.22) + "px 'Bricolage Grotesque'";
    c.fillText("“", M - Math.round(W * 0.008), M + Math.round(W * 0.18));
    // frase: força a palavra-chave pra própria linha (vira barra invertida)
    let q = sl.titulo || "Sua frase de impacto aqui.";
    const kw = (sl.palavra || "").trim();
    if (kw) { const re = new RegExp("\\s*" + kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*", "i"); q = q.replace(re, "\n" + kw + "\n").replace(/\n\n+/g, "\n").replace(/^\n|\n$/g, ""); }
    const ff = fit(c, q, "Bricolage Grotesque", "800", W - M * 2, 6, Math.round(W * 0.1), Math.round(W * 0.052));
    const flh = ff.size * 1.12, block = ff.lines.length * flh;
    let fy = H * 0.44 - block / 2 + M;
    ff.lines.forEach((l, i) => {
      const yy = fy + i * flh;
      if (kw && l.trim().toLowerCase() === kw.toLowerCase()) {
        bar(c, l.trim(), M, yy, Math.round(ff.size * 0.86), p);
      } else {
        c.fillStyle = p.ink; c.font = "800 " + ff.size + "px 'Bricolage Grotesque'";
        c.fillText(l, M, yy + ff.size * 0.82);
      }
    });
    // assinatura lockup (badge CS + nome + @)
    const bs = Math.round(W * 0.1);
    badge(c, M, H - M - bs, bs);
    c.textAlign = "left"; c.fillStyle = p.ink; c.font = "700 " + Math.round(W * 0.04) + "px 'Bricolage Grotesque'";
    c.fillText("Cleiton Sampaio", M + bs + Math.round(W * 0.03), H - M - bs * 0.56);
    if (handle) { c.fillStyle = p.mut; c.font = "500 " + Math.round(W * 0.032) + "px 'Hanken Grotesk'"; c.fillText(handle, M + bs + Math.round(W * 0.03), H - M - bs * 0.12); }
  } else if (sl.tpl === "final") {
    const big = sl.titulo || "Bora construir.";
    const lf = fit(c, big, "Bricolage Grotesque", "800", W - M * 2, 4, Math.round(W * 0.13), Math.round(W * 0.06));
    c.fillStyle = p.ink; c.font = "800 " + lf.size + "px 'Bricolage Grotesque'"; const llh = lf.size * 0.98;
    const ly = H * 0.44 - (lf.lines.length * llh) / 2;
    lf.lines.forEach((l, i) => c.fillText(l, M, ly + i * llh + lf.size));
    bar(c, sl.palavra || "me segue", M, ly + lf.lines.length * llh + Math.round(W * 0.05), Math.round(W * 0.05), p);
    c.fillStyle = p.mut; c.font = "600 " + Math.round(W * 0.04) + "px 'Hanken Grotesk'";
    c.fillText((handle || "") + "  ·  Evolução & Negócios", M, H - M + Math.round(W * 0.006));
  }

  // logo/marca do usuário (arrastável), mantém transparência do PNG
  if (comLogo) {
    const w = Math.round(W * sl.logoScale), h = Math.round(w * img.height / img.width);
    c.drawImage(img, sl.logoPos.x * W - w / 2, sl.logoPos.y * H - h / 2, w, h);
  }
}

export default function Estudio({ handle, onHandle, frases }) {
  const [fmt, setFmt] = useState("carrossel");
  const [cur, setCur] = useState(0);
  const [slides, setSlides] = useState(() => [
    { ...novoSlide("capa"), titulo: "O que ninguém te conta sobre começar do zero", palavra: "em tempo real" },
    { ...novoSlide("conteudo"), tema: "papel", titulo: "Disciplina > motivação", corpo: "Motivação é o gás do primeiro dia. Disciplina é aparecer no dia 40, quando ninguém tá vendo e a vontade sumiu. É ela que constrói." },
    { ...novoSlide("final"), titulo: "Bora construir." },
  ]);
  const [fontsReady, setFontsReady] = useState(false);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const cvRef = useRef(null);
  const imgCache = useRef(new Map()); // dataURL -> HTMLImageElement
  const drag = useRef(false);
  const fi = useRef(0); // índice de frase

  const patch = (campo, val) => setSlides((ss) => ss.map((s, i) => (i === cur ? { ...s, [campo]: val } : s)));
  const sl = slides[cur];

  // carrega fontes usadas no canvas
  useEffect(() => {
    if (!document.fonts?.load) { setFontsReady(true); return; }
    Promise.all([
      document.fonts.load("800 120px 'Bricolage Grotesque'"),
      document.fonts.load("400 120px 'Anton'"),
      document.fonts.load("500 60px 'Hanken Grotesk'"),
    ]).then(() => setFontsReady(true)).catch(() => setFontsReady(true));
  }, []);

  // imagem carregada (ou dispara load + redraw)
  const imgDe = (dataURL) => {
    if (!dataURL) return null;
    const c = imgCache.current;
    if (c.has(dataURL)) return c.get(dataURL) || null;
    c.set(dataURL, null);
    const im = new Image();
    im.onload = () => { c.set(dataURL, im); setFontsReady((v) => v); redraw(); };
    im.src = dataURL;
    return null;
  };

  const redraw = () => {
    const cv = cvRef.current; if (!cv) return;
    const f = FMT[fmt]; cv.width = f.w; cv.height = f.h;
    draw(cv.getContext("2d"), f.w, f.h, slides[cur], cur, slides.length, handle, imgDe(slides[cur].imgData));
  };
  useEffect(redraw); // redesenha a cada render

  // ── arrastar o logo ──
  const posDoEvento = (e) => {
    const cv = cvRef.current, r = cv.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: Math.max(0, Math.min(1, (t.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (t.clientY - r.top) / r.height)) };
  };
  const podeArrastar = () => sl.imgData && sl.imgUso === "logo" && sl.tpl !== "foto";
  const onDown = (e) => { if (!podeArrastar()) return; drag.current = true; patch("logoPos", posDoEvento(e)); };
  const onMove = (e) => { if (!drag.current) return; e.preventDefault(); patch("logoPos", posDoEvento(e)); };
  const onUp = () => { drag.current = false; };

  const escolherImg = (file) => {
    if (!file) return; setErro(null);
    const fr = new FileReader();
    fr.onload = () => patch("imgData", fr.result);
    fr.onerror = () => setErro("Não consegui ler a imagem.");
    fr.readAsDataURL(file);
  };

  const addSlide = () => { setSlides((ss) => { const n = [...ss]; n.splice(cur + 1, 0, novoSlide("conteudo")); return n; }); setCur((c) => c + 1); };
  const dupSlide = () => { setSlides((ss) => { const n = [...ss]; n.splice(cur + 1, 0, { ...ss[cur], id: ++_uid }); return n; }); setCur((c) => c + 1); };
  const delSlide = () => { if (slides.length <= 1) return; setSlides((ss) => ss.filter((_, i) => i !== cur)); setCur((c) => Math.max(0, c - 1)); };
  const trocarFrase = () => { if (!frases?.length) return; fi.current = (fi.current + 1) % frases.length; patch("titulo", frases[fi.current]); };

  // ── salvar (celular: Web Share → Fotos/Instagram; desktop: download) ──
  const nome = (i) => "cleiton-" + fmt + "-" + String(i + 1).padStart(2, "0") + ".png";
  const toFile = (canvas, n) => new Promise((res) => canvas.toBlob((b) => res(new File([b], n, { type: "image/png" })), "image/png"));
  const baixar = (file) => new Promise((res) => { const u = URL.createObjectURL(file); const a = document.createElement("a"); a.href = u; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => { URL.revokeObjectURL(u); res(); }, 450); });
  const salvar = async (files, titulo) => {
    try { if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: titulo }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    for (const f of files) { await baixar(f); await new Promise((r) => setTimeout(r, 400)); }
  };
  const salvarUm = async () => { setSalvando(true); redraw(); await salvar([await toFile(cvRef.current, nome(cur))], "Post"); setSalvando(false); };
  const salvarTodos = async () => {
    setSalvando(true);
    const f = FMT[fmt], exp = document.createElement("canvas"); exp.width = f.w; exp.height = f.h; const ec = exp.getContext("2d");
    const files = [];
    for (let i = 0; i < slides.length; i++) { draw(ec, f.w, f.h, slides[i], i, slides.length, handle, imgDe(slides[i].imgData)); files.push(await toFile(exp, nome(i))); }
    await salvar(files, "Carrossel"); setSalvando(false);
  };

  const seg = (opts, val, on) => opts.map((o) => (
    <button key={o.v} className={"estseg-b" + (val === o.v ? " on" : "")} onClick={() => on(o.v)}>{o.t}</button>
  ));

  return (
    <section className="est">
      <style>{css}</style>
      <div className="esthead">
        <h2 className="esth">Criar post</h2>
        <p className="estsub">Sobe a foto ou o seu logo, escreve o texto, arrasta pra posicionar. Sai pronto na sua identidade — <b>salva direto no celular</b>.</p>
      </div>

      <div className="eststage">
        <div className="estcvwrap">
          <canvas
            ref={cvRef} className="estcv"
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
            style={{ cursor: podeArrastar() ? "grab" : "default", touchAction: podeArrastar() ? "none" : "auto" }}
          />
          {podeArrastar() && <span className="estdicaarrasta">arraste o logo pra posicionar</span>}
        </div>
        <div className="estslidebar">
          <button className="estnav" disabled={cur === 0} onClick={() => setCur((c) => c - 1)} aria-label="Anterior">‹</button>
          <div className="estthumbs">
            {slides.map((s, i) => <Thumb key={s.id} s={s} i={i} total={slides.length} handle={handle} fmt={fmt} on={i === cur} img={imgDe(s.imgData)} onClick={() => setCur(i)} />)}
          </div>
          <button className="estnav" disabled={cur === slides.length - 1} onClick={() => setCur((c) => c + 1)} aria-label="Próximo">›</button>
        </div>
        <div className="estacts">
          <button className="estbtn ghost" onClick={addSlide}>+ Slide</button>
          <button className="estbtn ghost" onClick={dupSlide}>Duplicar</button>
          <button className="estbtn ghost" onClick={delSlide} disabled={slides.length <= 1}>Apagar</button>
          <span className="estcount">{cur + 1} / {slides.length}</span>
        </div>
      </div>

      <div className="estpanel">
        <Field label="Formato">
          <div className="estseg">{seg([{ v: "carrossel", t: "Carrossel" }, { v: "quadrado", t: "Quadrado" }, { v: "story", t: "Story" }], fmt, setFmt)}</div>
        </Field>
        <Field label="Modelo do slide">
          <div className="estseg">{seg([{ v: "capa", t: "Capa" }, { v: "conteudo", t: "Conteúdo" }, { v: "foto", t: "Foto" }, { v: "frase", t: "Frase" }, { v: "final", t: "Final" }], sl.tpl, (v) => patch("tpl", v))}</div>
        </Field>
        <Field label="Fundo">
          <div className="estseg">{seg([{ v: "preto", t: "Preto" }, { v: "papel", t: "Papel" }], sl.tema, (v) => patch("tema", v))}</div>
        </Field>
        <Field label={sl.tpl === "conteudo" ? "Título" : "Título / gancho"}>
          <div className="estlinha">
            <textarea className="estarea" value={sl.titulo} onChange={(e) => patch("titulo", e.target.value)} placeholder="Escreve aqui…" rows={2} />
          </div>
          {frases?.length ? <button className="estlink" onClick={trocarFrase}>trocar por uma frase pronta ↻</button> : null}
        </Field>
        {sl.tpl === "conteudo" && (
          <Field label="Texto do slide"><textarea className="estarea" value={sl.corpo} onChange={(e) => patch("corpo", e.target.value)} placeholder="O miolo do slide…" rows={3} /></Field>
        )}
        <Field label="Palavra-chave (barra)"><input className="estinput" value={sl.palavra} onChange={(e) => patch("palavra", e.target.value)} maxLength={28} placeholder="Ex.: em tempo real" /></Field>

        <Field label="Imagem / logo">
          <label className="estupload">
            <span className="estup-ic">↑</span>
            <span><b>Subir PNG/JPG</b><small>Vira logo (arrastável) ou foto de fundo. Fica no seu aparelho.</small></span>
            <input type="file" accept="image/*" hidden onChange={(e) => { escolherImg(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {sl.imgData && (
            <>
              <div className="estimgrow">
                <img src={sl.imgData} alt="imagem escolhida" />
                <button className="estlink" onClick={() => patch("imgData", null)}>remover</button>
              </div>
              <div className="estseg">{seg([{ v: "logo", t: "Logo / marca" }, { v: "fundo", t: "Foto de fundo" }], sl.imgUso, (v) => patch("imgUso", v))}</div>
              {sl.imgUso === "logo" && (
                <div className="estseg" style={{ marginTop: 8 }}>{seg([{ v: 0.12, t: "P" }, { v: 0.2, t: "M" }, { v: 0.3, t: "G" }, { v: 0.44, t: "GG" }], sl.logoScale, (v) => patch("logoScale", v))}</div>
              )}
            </>
          )}
        </Field>

        <Field label="Seu @ (assinatura)"><input className="estinput" value={handle} onChange={(e) => onHandle(e.target.value)} maxLength={30} placeholder="@eucleitonsampaio" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></Field>

        {erro && <p className="esterro">{erro}</p>}
        <div className="estdl">
          <button className="estbtn solid" disabled={salvando} onClick={salvarUm}>{salvando ? "Preparando…" : "Salvar este slide"}</button>
          <button className="estbtn ghost wide" disabled={salvando} onClick={salvarTodos}>Salvar o carrossel todo</button>
          <p className="esthint">No celular abre a folha de compartilhar: toque em <b>Salvar imagem</b> pras Fotos, ou mande direto pro Instagram.</p>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return <div className="estfield"><span className="estlbl">{label}</span>{children}</div>;
}

function Thumb({ s, i, total, handle, fmt, on, img, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    const f = FMT[fmt], c = ref.current; if (!c) return;
    c.width = 240; c.height = Math.round(240 * f.h / f.w);
    draw(c.getContext("2d"), c.width, c.height, s, i, total, handle, img);
  });
  return <button className={"estthumb" + (on ? " on" : "")} onClick={onClick}><canvas ref={ref} /></button>;
}

const css = `
.est{padding:2px 0 8px;}
.esthead{margin-bottom:16px;}
.esth{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:23px;letter-spacing:-.02em;margin:0 0 6px;color:#0A0A0A;}
.estsub{font-size:14px;line-height:1.55;color:#6E6E73;margin:0;}
.estsub b{color:#0A0A0A;font-weight:600;}
.eststage{margin-bottom:18px;}
.estcvwrap{position:relative;background:#ECEAE6;border:1px solid #E4E2DE;border-radius:18px;padding:16px;display:grid;place-items:center;box-shadow:0 1px 2px rgba(10,10,10,.04),0 14px 30px -22px rgba(10,10,10,.3);}
.estcv{width:auto;max-width:100%;max-height:56vh;height:auto;border-radius:8px;box-shadow:0 16px 40px -20px rgba(10,10,10,.6);display:block;-webkit-user-select:none;user-select:none;}
.estdicaarrasta{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);background:rgba(10,10,10,.72);color:#F4F3F1;font-size:11.5px;font-weight:600;padding:5px 12px;border-radius:99px;pointer-events:none;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);}
.estslidebar{display:flex;align-items:center;gap:8px;margin-top:14px;}
.estnav{flex:none;width:40px;height:40px;border-radius:11px;border:1px solid #E4E2DE;background:#fff;color:#0A0A0A;font-size:1.3rem;line-height:1;cursor:pointer;transition:transform .18s,border-color .2s;}
.estnav:hover:not(:disabled){border-color:#0A0A0A;}.estnav:active{transform:scale(.9);}.estnav:disabled{opacity:.35;cursor:default;}
.estthumbs{display:flex;gap:8px;overflow-x:auto;flex:1;padding:2px;scrollbar-width:none;}
.estthumbs::-webkit-scrollbar{display:none;}
.estthumb{flex:none;width:48px;height:60px;border-radius:9px;border:2px solid #E4E2DE;background:#fff;cursor:pointer;overflow:hidden;padding:0;transition:border-color .2s,transform .18s;}
.estthumb.on{border-color:#0A0A0A;}.estthumb:active{transform:scale(.93);}
.estthumb canvas{width:100%;height:100%;object-fit:cover;display:block;}
.estacts{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center;}
.estcount{font-family:'Space Mono',monospace;font-weight:700;color:#6E6E73;font-size:13px;margin-left:auto;}
.estbtn{border:1px solid #E4E2DE;background:#fff;color:#0A0A0A;border-radius:11px;padding:11px 15px;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:transform .18s,border-color .2s,filter .15s;}
.estbtn:hover:not(:disabled){border-color:#0A0A0A;}.estbtn:active:not(:disabled){transform:scale(.97);}.estbtn:disabled{opacity:.5;cursor:default;}
.estbtn.ghost{background:transparent;}
.estbtn.solid{background:#0A0A0A;color:#F4F3F1;border-color:#0A0A0A;}
.estbtn.solid:hover:not(:disabled){filter:brightness(1.15);}
.estbtn.wide{width:100%;}
.estpanel{background:#fff;border:1px solid #E4E2DE;border-radius:18px;padding:18px;box-shadow:0 1px 2px rgba(10,10,10,.04),0 14px 30px -24px rgba(10,10,10,.22);display:grid;gap:16px;}
.estfield{display:grid;gap:8px;}
.estlbl{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#6E6E73;}
.estseg{display:flex;gap:6px;flex-wrap:wrap;}
.estseg-b{flex:1;min-width:60px;border:1px solid #E4E2DE;background:transparent;color:#6E6E73;border-radius:10px;padding:9px 8px;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all .16s;white-space:nowrap;}
.estseg-b.on{background:#0A0A0A;color:#F4F3F1;border-color:#0A0A0A;}
.estseg-b:active{transform:scale(.96);}
.estinput,.estarea{width:100%;border:1px solid #E4E2DE;border-radius:11px;background:#F4F3F1;color:#0A0A0A;font-family:'Hanken Grotesk',sans-serif;font-size:16px;padding:11px 13px;outline:none;transition:border-color .2s;}
.estinput:focus,.estarea:focus{border-color:#0A0A0A;}
.estarea{resize:vertical;min-height:52px;line-height:1.4;}
.estlink{background:none;border:none;color:#6E6E73;text-decoration:underline;text-underline-offset:2px;cursor:pointer;font-size:13px;font-family:'Hanken Grotesk',sans-serif;padding:2px 0;text-align:left;justify-self:start;}
.estlink:hover{color:#0A0A0A;}
.estupload{display:flex;align-items:center;gap:12px;border:1.5px dashed #D8D6D0;border-radius:12px;padding:14px;cursor:pointer;transition:border-color .2s;}
.estupload:hover{border-color:#0A0A0A;}
.estup-ic{width:34px;height:34px;flex:none;border-radius:9px;background:#ECEAE6;display:grid;place-items:center;font-size:1.1rem;color:#0A0A0A;}
.estupload b{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;display:block;}
.estupload small{color:#6E6E73;font-size:12px;line-height:1.35;display:block;}
.estimgrow{display:flex;align-items:center;gap:10px;margin-top:10px;}
.estimgrow img{width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid #E4E2DE;}
.estdl{display:grid;gap:10px;}
.esthint{color:#6E6E73;font-size:12px;line-height:1.45;margin:0;}
.esthint b{color:#0A0A0A;}
.esterro{background:#ECEAE6;border:1px solid #D8D6D0;border-radius:11px;padding:11px 13px;font-size:13px;color:#0A0A0A;font-weight:600;margin:0;}
@media(min-width:820px){
  .eststage,.estpanel{max-width:640px;margin-left:auto;margin-right:auto;}
}
`;
