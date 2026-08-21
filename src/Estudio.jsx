import React, { useEffect, useRef, useState } from "react";
import { api } from "./api.js";

// ─── Estúdio: gerador de carrossel + story, na identidade Preto & Branco ───────
// Sobe foto/logo (base64), escolhe o modelo, ARRASTA a imagem pra posicionar,
// baixa/salva nas Fotos do celular. Tudo no <canvas>, roda no próprio aparelho.

const PRETO = "#0A0A0A", PAPEL = "#F4F3F1", GRAF = "#6E6E73", BRANCO = "#FFFFFF";
const FMT = { carrossel: { w: 1080, h: 1350 }, quadrado: { w: 1080, h: 1080 }, story: { w: 1080, h: 1920 } };
// Área segura do Instagram por formato (frações 0..1 da caixa) — pesquisa 2026.
// É só um guia na edição (linhas tracejadas): NÃO entra na foto salva.
//  • carrossel 4:5 aparece inteiro no feed; a grade do perfil virou 3:4, corta só ~34px/lado na miniatura.
//  • story 9:16 tem topo/base cobertos pela UI (e coluna de ícones à direita se virar Reels).
//  • quadrado 1:1 perde as laterais na grade 3:4 do perfil.
const AREASEGURA = {
  carrossel: { top: 0.03, bottom: 0.03, left: 0.04, right: 0.04, nota: "as laterais somem na miniatura do seu perfil" },
  quadrado: { top: 0.075, bottom: 0.075, left: 0.13, right: 0.13, nota: "no grid do perfil o quadrado perde as laterais" },
  story: { top: 0.13, bottom: 0.22, left: 0.06, right: 0.11, nota: "topo e base sob os botões; à direita, ícones do Reels" },
};
let _uid = 0;
const novoSlide = (tpl) => ({
  id: ++_uid, tpl: tpl || "capa", tema: "preto", titulo: "", subtitulo: "", corpo: "", palavra: "", gancho: "", lista: "texto",
  escala: 1, destaque: false,
  inter: "enquete", opcaoA: "", opcaoB: "", pergunta: "", // stories de interação (enquete / caixinha)
  textPos: { x: 0, y: 0 }, imgData: null, imgUso: "logo", logoPos: { x: 0.82, y: 0.14 }, logoScale: 0.2,
});
// esqueleto de carrossel profissional (8 slides) — a "receita" da marca
const modeloCarrossel = () => [
  { ...novoSlide("capa"), tema: "preto", titulo: "Você posta todo dia e não cresce", subtitulo: "o problema não é frequência — é o que ninguém te contou", palavra: "sem enrolação" },
  { ...novoSlide("conteudo"), tema: "papel", titulo: "Ninguém salva o que você posta", corpo: "Salvar é o sinal que o algoritmo mais pesa em 2026. E o seu tá zerado.", gancho: "e o motivo não é o que você pensa…" },
  { ...novoSlide("conteudo"), tema: "preto", titulo: "Conteúdo não é frequência, é fricção", corpo: "Cada slide tem que DEVER algo pro próximo. Sem isso, o dedo vai embora no slide 2.", gancho: "te mostro o esqueleto agora →" },
  { ...novoSlide("conteudo"), tema: "papel", titulo: "1. A capa faz UMA promessa", corpo: "5 a 8 palavras. Se não para o scroll como thumbnail, reescreve.", gancho: "mas isso só funciona com o próximo →" },
  { ...novoSlide("conteudo"), tema: "preto", titulo: "2. Uma ideia por slide", corpo: "Empilhar 3 ideias vira dor de cabeça, não valor. Uma respirada por tela.", gancho: "" },
  { ...novoSlide("conteudo"), tema: "papel", titulo: "3. Termine incompleto de propósito", corpo: "Frase cortada = tensão que só o swipe resolve. É o que te leva até o fim.", gancho: "" },
  { ...novoSlide("frase"), tema: "preto", titulo: "Capa promete. Meio entrega. Fim converte.", palavra: "converte" },
  { ...novoSlide("final"), tema: "preto", titulo: "Salva pra montar o seu essa semana.", palavra: "comenta MODELO", corpo: "Comenta MODELO que eu te mando o passo a passo no direct. E me segue pra não perder o próximo." },
];
const slidesPadrao = () => [
  { ...novoSlide("capa"), titulo: "O que ninguém te conta sobre começar do zero", palavra: "em tempo real", subtitulo: "a parte que os gurus escondem" },
  { ...novoSlide("conteudo"), tema: "papel", titulo: "Disciplina > motivação", corpo: "Motivação é o gás do primeiro dia. Disciplina é aparecer no dia 40, quando ninguém tá vendo e a vontade sumiu. É ela que constrói.", gancho: "e tem um jeito de não depender dela →" },
  { ...novoSlide("final"), titulo: "Salva e bora construir." },
];
// pacote de 15 stories de interação (enquete / caixinha) — pronto pra trocar a foto e ajustar
const iEnq = (tema, corpo, titulo, a, b) => ({ ...novoSlide("interacao"), tema, inter: "enquete", corpo, titulo, opcaoA: a, opcaoB: b });
const iCax = (tema, corpo, titulo, pergunta) => ({ ...novoSlide("interacao"), tema, inter: "caixinha", corpo, titulo, pergunta });
const pacoteInteracao = () => [
  iEnq("preto", "Hoje eu apaguei uma coisa que já estava quase pronta.\n\nNão porque estava ruim.\n\nSó percebi que eu tava tentando salvar uma ideia que já não fazia mais sentido.", "", "INSISTO ATÉ O FIM", "RECOMEÇO SEM DÓ"),
  iEnq("papel", "Uma disputa importante:", "O que irrita mais?", "REUNIÃO QUE ERA MSG", "MSG QUE ERA REUNIÃO"),
  iCax("preto", "Todo mundo tem uma coisa que os outros sempre pedem ajuda.\n\nA minha normalmente envolve descobrir por que alguma coisa não tá funcionando 😂\n\nE a sua?", "", "Todo mundo me chama quando…"),
  iEnq("preto", "Demorei pra separar duas coisas:\n\nestar ocupado\ne\nestar produzindo.\n\nTem dia que você não para e, mesmo assim, não sai do lugar.", "", "ACONTECE DIRETO", "RARO COMIGO"),
  iCax("preto", "Quero descobrir coisa boa hoje:\n\nqual aplicativo você usa TODO DIA e quase ninguém fala?", "", "Me indica um 👇"),
  iEnq("preto", "Tenho uma coisa quase pronta faz tempo.\n\nO problema?\n\nDepois que fica boa, começo a inventar motivo pra deixar “melhor”.\n\nMais alguém sofre disso? 😂", "", "SIM", "EU ENTREGO LOGO"),
  iEnq("papel", "Se você tivesse que escolher UM:\n\n(pra mim, nem sempre é a mesma coisa.)", "", "MUITO TÉCNICO", "SABE RESOLVER"),
  iEnq("preto", "Antes de comprar algo, eu tento responder uma pergunta.\n\nConfesso que ela já matou algumas compras 😂", "Isso resolve um problema ou só parece legal?", "EU PRECISAVA DISSO", "EU QUERIA ISSO"),
  iEnq("papel", "Tem uma frase que me dá vontade de fazer outra pergunta:", "“Sempre foi feito assim.”\nTá… mas por quê?", "TAMBÉM QUESTIONO", "DEIXA COMO ESTÁ"),
  iCax("preto", "Pergunta aleatória, mas quero boas recomendações:\n\nqual a melhor coisa que você comprou por menos de R$100?\n\nPode ser qualquer coisa.", "", "Foi isso aqui…"),
  iCax("preto", "Se eu pudesse chamar alguém agora e falar:\n\n“me explica isso sem enrolação…”\n\nEu já teria uma lista 😂\n\nE você?", "", "O que você quer aprender?"),
  iEnq("preto", "Tem uma parte dos projetos que quase nunca aparece aqui:\n\nas coisas dando errado.\n\nE, sendo sincero, às vezes é a parte mais interessante.", "", "MOSTRA OS ERROS", "MOSTRA O RESULTADO"),
  iEnq("preto", "Uma dúvida pra eu não postar coisa que ninguém quer ver:\n\no que você prefere acompanhar aqui?", "", "O QUE ESTOU CRIANDO", "COMO EU RESOLVO"),
  iCax("papel", "Vamos fazer diferente.\n\nMe manda um problema real que você tá tentando resolver hoje.\n\nTrabalho, negócio, tecnologia… tanto faz.\n\nNão prometo solução mágica.", "Mas posso dizer por onde eu começaria.", "Manda o problema 👇"),
  iEnq("preto", "Tive uma ideia.\n\n1x por semana eu pego um problema que alguém mandar aqui e mostro meu raciocínio pra resolver.\n\nSem “5 passos pro sucesso”. Problema real → raciocínio real.", "Faria sentido?", "FAZ ISSO", "QUERO PARTICIPAR"),
];
// rascunho no aparelho: não perde o trabalho ao trocar de aba/fechar
const STORE = "cs-estudio-v1";
function carregarRascunho() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE));
    if (d?.slides?.length) { _uid = Math.max(_uid, ...d.slides.map((s) => s.id || 0)); return d; }
  } catch { /* sem rascunho */ }
  return null;
}

// ── helpers de canvas ──
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function paleta(t) {
  return t === "papel"
    ? { bg: PAPEL, ink: PRETO, mut: GRAF, barbg: PRETO, barink: PAPEL }
    : { bg: PRETO, ink: PAPEL, mut: "#9A9A9E", barbg: PAPEL, barink: PRETO };
}
// símbolo da marca: chevron duplo apontando pra cima ("vamos pra cima")
function chevron(c, x, y, s, color) {
  const k = s / 512, P = (px, py) => [x + px * k, y + py * k];
  c.save(); c.strokeStyle = color; c.lineWidth = 56 * k; c.lineCap = "round"; c.lineJoin = "round";
  [[[146, 268], [256, 158], [366, 268]], [[146, 356], [256, 246], [366, 356]]].forEach((pts) => {
    c.beginPath(); pts.forEach((pt, i) => { const q = P(pt[0], pt[1]); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke();
  });
  c.restore();
}
function badge(c, x, y, s) {
  const g = c.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, "#2C2C30"); g.addColorStop(1, "#050506");
  c.fillStyle = g; rr(c, x, y, s, s, s * 0.226); c.fill();
  chevron(c, x, y, s, "#FFFFFF");
}
// enquete estilo Instagram: barra arredondada partida em duas opções (auto-fit, até 2 linhas)
function desenharEnquete(c, x, y, w, a, b, p) {
  const half = w / 2 - 44;
  const acha = (txt) => {
    let s = 42; c.font = "700 " + s + "px 'Bricolage Grotesque'";
    while (s > 20) { if (wrap(c, (txt || "").toUpperCase(), half).length <= 2) break; s -= 2; c.font = "700 " + s + "px 'Bricolage Grotesque'"; }
    return s;
  };
  const s = Math.min(acha(a), acha(b));
  c.font = "700 " + s + "px 'Bricolage Grotesque'";
  const lA = wrap(c, (a || "").toUpperCase(), half), lB = wrap(c, (b || "").toUpperCase(), half);
  const lh = s * 1.08, nl = Math.max(lA.length, lB.length), h = Math.max(148, nl * lh + 64), mid = x + w / 2;
  c.fillStyle = p.barbg; rr(c, x, y, w, h, 30); c.fill();
  c.save(); c.globalAlpha = 0.16; c.strokeStyle = p.barink; c.lineWidth = 2;
  c.beginPath(); c.moveTo(mid, y + 20); c.lineTo(mid, y + h - 20); c.stroke(); c.restore();
  c.fillStyle = p.barink; c.font = "700 " + s + "px 'Bricolage Grotesque'"; c.textAlign = "center"; c.textBaseline = "middle";
  const put = (ls, cx) => { const sy = y + h / 2 - (ls.length - 1) * lh / 2; ls.forEach((l, i) => c.fillText(l, cx, sy + i * lh)); };
  put(lA, x + w / 4); put(lB, x + 3 * w / 4);
  c.textAlign = "left"; c.textBaseline = "alphabetic";
  return h;
}
// caixinha de perguntas estilo Instagram: card com o prompt + campo "Responder…"
function desenharCaixinha(c, x, y, w, prompt, p) {
  const padX = 42, padY = 34, inner = w - padX * 2;
  let s = 46; c.font = "700 " + s + "px 'Bricolage Grotesque'";
  let lines = wrap(c, prompt, inner);
  while (s > 26 && lines.length > 3) { s -= 2; c.font = "700 " + s + "px 'Bricolage Grotesque'"; lines = wrap(c, prompt, inner); }
  const lh = s * 1.16, promptH = lines.length * lh, respH = 62;
  const h = padY + promptH + 24 + respH + padY;
  c.fillStyle = p.barbg; rr(c, x, y, w, h, 28); c.fill();
  c.fillStyle = p.barink; c.font = "700 " + s + "px 'Bricolage Grotesque'"; c.textAlign = "left"; c.textBaseline = "alphabetic";
  lines.forEach((l, i) => c.fillText(l, x + padX, y + padY + i * lh + s * 0.82));
  const ry = y + padY + promptH + 24;
  c.save(); c.globalAlpha = 0.45; c.strokeStyle = p.barink; c.lineWidth = 2; rr(c, x + padX, ry, inner, respH, respH / 2); c.stroke(); c.restore();
  c.save(); c.globalAlpha = 0.55; c.fillStyle = p.barink; c.font = "500 30px 'Hanken Grotesk'"; c.textBaseline = "middle";
  c.fillText("Responder…", x + padX + 26, ry + respH / 2 + 2); c.restore(); c.textBaseline = "alphabetic";
  return h;
}
// barra invertida com auto-fit: nunca deixa o texto estourar a largura (maxW)
function bar(c, text, x, y, size, pal, maxW) {
  const t = text.toUpperCase();
  let s = size;
  c.font = "700 " + s + "px 'Bricolage Grotesque'";
  if (maxW) { while (c.measureText(t).width + s > maxW && s > 18) { s -= 2; c.font = "700 " + s + "px 'Bricolage Grotesque'"; } }
  const padX = s * 0.5, padY = s * 0.42, tw = c.measureText(t).width;
  c.fillStyle = pal.barbg; rr(c, x, y, tw + padX * 2, s + padY * 2, s * 0.28); c.fill();
  c.fillStyle = pal.barink; c.textBaseline = "middle"; c.fillText(t, x + padX, y + (s + padY * 2) / 2 + s * 0.04);
  c.textBaseline = "alphabetic"; return { w: tw + padX * 2, h: s + padY * 2 };
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
let _ovf = false; // sinaliza que algum texto não coube nem no tamanho mínimo
let _escala = 1; // multiplicador de tamanho de texto do slide atual
function fit(c, text, family, weight, maxW, maxLines, start, min) {
  start = Math.round(start * _escala); min = Math.round(min * _escala);
  let size = start;
  while (size > min) { c.font = weight + " " + size + "px '" + family + "'"; const ls = wrap(c, text, maxW); if (ls.length <= maxLines) return { size, lines: ls }; size -= 2; }
  c.font = weight + " " + min + "px '" + family + "'"; const ls = wrap(c, text, maxW); if (ls.length > maxLines) _ovf = true; return { size: min, lines: ls };
}
function cover(c, img, x, y, w, h) { const r = Math.max(w / img.width, h / img.height), iw = img.width * r, ih = img.height * r; c.save(); rr(c, x, y, w, h, 0); c.clip(); c.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); c.restore(); }
function grain(c, W, H, a) { c.save(); for (let i = 0; i < Math.floor(W * H / 2600); i++) { c.globalAlpha = Math.random() * a; c.fillStyle = Math.random() < 0.5 ? "#fff" : "#000"; c.fillRect(Math.random() * W, Math.random() * H, 2, 2); } c.restore(); }

// marca do topo: chevron duplo no canto superior direito (cor do tema) + contador
function topo(c, W, p, size, idx, total, mostrarContador, R, T) {
  const x = W - R - size, y = T;
  chevron(c, x, y, size, p.ink);
  if (mostrarContador && total > 1) {
    c.textAlign = "right"; c.textBaseline = "alphabetic";
    c.font = "600 28px 'Hanken Grotesk'"; c.fillStyle = p.mut;
    c.fillText(String(idx + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0"), x - 20, y + size * 0.66);
    c.textAlign = "left";
  }
}
function rodapeHandle(c, W, H, p, handle, L, B) {
  if (!handle) return;
  c.textAlign = "left"; c.textBaseline = "alphabetic";
  c.font = "600 28px 'Hanken Grotesk'"; c.fillStyle = p.mut;
  c.fillText(handle, L, Math.min(Math.round(H * 0.926), H - B - 6));
}
// itens de lista: 1 linha = 1 item. tipo 'bullet' (•) ou 'num' (01, 02…)
function itensDe(texto) {
  return (texto || "").split("\n").map((s) => s.replace(/^\s*[-•*]\s*/, "").replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
}
function drawLista(c, itens, x, y, maxW, tipo, p, hMax) {
  // auto-fit: acha o maior tamanho em que a lista inteira cabe na altura disponível
  let size = 44;
  const alturaEm = (sz) => {
    const markW = tipo === "num" ? sz * 1.7 : sz * 1.15;
    let h = 0; const lh = sz * 1.32, gap = sz * 0.8;
    c.font = "500 " + sz + "px 'Hanken Grotesk'";
    itens.forEach((it) => { h += wrap(c, it, maxW - markW).length * lh + gap; });
    return h;
  };
  while (size > 30 && alturaEm(size) > hMax) size -= 2;
  if (alturaEm(size) > hMax) _ovf = true;
  const markW = tipo === "num" ? size * 1.7 : size * 1.15, lh = size * 1.32, gap = size * 0.8;
  let cy = y;
  itens.forEach((it, i) => {
    c.textBaseline = "alphabetic";
    if (tipo === "num") {
      c.fillStyle = p.ink; c.font = "800 " + size + "px 'Bricolage Grotesque'";
      c.fillText(String(i + 1).padStart(2, "0"), x, cy + size);
    } else {
      c.fillStyle = p.ink; c.beginPath(); c.arc(x + size * 0.32, cy + size * 0.58, size * 0.15, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = p.ink; c.font = "500 " + size + "px 'Hanken Grotesk'";
    const lines = wrap(c, it, maxW - markW);
    lines.forEach((l, j) => c.fillText(l, x + markW, cy + j * lh + size));
    cy += lines.length * lh + gap;
  });
  return cy - y;
}

const M = 96; // margem lateral base (canvas sempre 1080 de largura)
// insets da área segura por formato (deriva do W×H) — nunca menores que M, então
// o carrossel 4:5 fica idêntico e só quadrado/story empurram o conteúdo pra dentro.
function safeDe(W, H) {
  const s = H >= W * 1.7 ? AREASEGURA.story : H <= W * 1.05 ? AREASEGURA.quadrado : AREASEGURA.carrossel;
  return {
    L: Math.max(M, Math.round(s.left * W)), R: Math.max(M, Math.round(s.right * W)),
    T: Math.max(M, Math.round(s.top * H)), B: Math.max(M, Math.round(s.bottom * H)),
  };
}

function draw(c, W, H, sl, idx, total, handle, img) {
  let p = paleta(sl.tema);
  c.clearRect(0, 0, W, H);
  _ovf = false; _escala = sl.escala || 1;
  const comLogo = img && sl.imgUso === "logo" && sl.tpl !== "foto";
  const comFundo = img && (sl.imgUso === "fundo" || sl.tpl === "foto");
  if (comFundo) {
    cover(c, img, 0, 0, W, H);
    const gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "rgba(10,10,10,.6)"); gr.addColorStop(0.42, "rgba(10,10,10,.18)");
    gr.addColorStop(0.7, "rgba(10,10,10,.5)"); gr.addColorStop(1, "rgba(10,10,10,.92)");
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    p = { bg: PRETO, ink: BRANCO, mut: "#D9D9DB", barbg: BRANCO, barink: PRETO };
  } else { c.fillStyle = p.bg; c.fillRect(0, 0, W, H); grain(c, W, H, 0.028); }
  c.textAlign = "left"; c.textBaseline = "alphabetic";
  const { L, R, T, B } = safeDe(W, H);
  const maxW = W - L - R;

  // marca do topo (chevron + contador) — FIXA, dentro da área segura. Na frase, a aspa faz esse papel.
  if (sl.tpl !== "frase") topo(c, W, p, sl.tpl === "capa" ? 56 : 48, idx, total, sl.tpl === "conteudo" || sl.tpl === "foto", R, T);

  // corpo do slide — ARRASTÁVEL (offset textPos); o chevron e o handle ficam fixos
  const OX = Math.round((sl.textPos?.x || 0) * W), OY = Math.round((sl.textPos?.y || 0) * H);
  c.save(); c.translate(OX, OY);

  if (sl.tpl === "capa") {
    if (sl.palavra) bar(c, sl.palavra, L, Math.max(Math.round(H * 0.14), T), 40, p, maxW);
    const t = (sl.titulo || "O SEU GANCHO AQUI").toUpperCase();
    const f = fit(c, t, "Anton", "400", maxW, 4, 104, 68);
    const hy = Math.round(H * 0.33), lh = f.size * 1.04;
    c.fillStyle = p.ink; c.font = "400 " + f.size + "px 'Anton'";
    f.lines.forEach((l, i) => c.fillText(l, L, hy + i * lh + f.size));
    if (sl.subtitulo) {
      const sf = fit(c, sl.subtitulo, "Hanken Grotesk", "500", maxW, 3, 40, 32);
      c.fillStyle = p.mut; c.font = "500 " + sf.size + "px 'Hanken Grotesk'";
      const sy = hy + f.lines.length * lh + 40;
      sf.lines.forEach((l, i) => c.fillText(l, L, sy + i * sf.size * 1.35 + sf.size));
    }
  } else if (sl.tpl === "conteudo") {
    const ty = Math.round(H * 0.235); // baseline fixa do título em todo slide de conteúdo
    const tf = fit(c, sl.titulo || "Título do slide", "Bricolage Grotesque", "800", maxW, 3, 64, 52);
    const tlh = tf.size * 1.08;
    let by;
    if (sl.destaque) {
      // título com destaque: cada linha numa barra invertida
      let yy = ty - tf.size;
      tf.lines.forEach((l) => { const bb = bar(c, l, L, yy, Math.round(tf.size * 0.84), p, maxW); yy += bb.h + 10; });
      by = yy + 24;
    } else {
      c.fillStyle = p.ink; c.font = "800 " + tf.size + "px 'Bricolage Grotesque'";
      tf.lines.forEach((l, i) => c.fillText(l, L, ty + i * tlh));
      by = ty + tf.lines.length * tlh + 44;
    }
    if (sl.palavra) { const bb = bar(c, sl.palavra, L, by, 40, p, maxW); by += bb.h + 40; }
    if (sl.lista !== "texto" && itensDe(sl.corpo).length) {
      const hMax = Math.min(Math.round(H * (sl.gancho ? 0.82 : 0.9)), H - B) - by;
      drawLista(c, itensDe(sl.corpo), L, by, maxW, sl.lista, p, hMax);
    } else {
      const bf = fit(c, sl.corpo || "Escreve o miolo do slide aqui. Uma ideia só por slide, direto ao ponto.", "Hanken Grotesk", "450", maxW, 9, 40, 32);
      c.fillStyle = p.ink; c.font = "450 " + bf.size + "px 'Hanken Grotesk'"; const blh = bf.size * 1.45;
      bf.lines.forEach((l, i) => c.fillText(l, L, by + i * blh + bf.size));
    }
    if (sl.gancho) {
      const gf = fit(c, sl.gancho, "Hanken Grotesk", "500", maxW, 3, 40, 32);
      c.fillStyle = p.mut; c.font = "italic 500 " + gf.size + "px 'Hanken Grotesk'";
      const blocoG = (gf.lines.length - 1) * gf.size * 1.35 + gf.size * 1.2;
      const gy = Math.min(Math.round(H * 0.86), H - B - Math.round(blocoG) - 8);
      gf.lines.forEach((l, i) => c.fillText(l, L, gy + i * gf.size * 1.35 + gf.size));
    }
  } else if (sl.tpl === "foto") {
    const t2 = sl.titulo || "Sua frase na foto";
    const f2 = fit(c, t2, "Bricolage Grotesque", "800", maxW, 4, 72, 52);
    const lh2 = f2.size * 1.04, y0 = Math.round(H * 0.7) - (sl.palavra ? 90 : 0);
    if (sl.palavra) bar(c, sl.palavra, L, y0 - 24, 40, p, maxW);
    c.fillStyle = p.ink; c.font = "800 " + f2.size + "px 'Bricolage Grotesque'";
    f2.lines.forEach((l, i) => c.fillText(l, L, y0 + 80 + i * lh2 + f2.size));
    if (!img) { c.fillStyle = p.mut; c.font = "600 40px 'Hanken Grotesk'"; c.textAlign = "center"; c.fillText("↑ suba uma imagem no painel", W / 2 - OX, H * 0.5 - OY); c.textAlign = "left"; }
  } else if (sl.tpl === "frase") {
    c.fillStyle = p.ink; c.font = "800 240px 'Bricolage Grotesque'"; c.fillText("“", L - 8, T + 200);
    let q = sl.titulo || "Sua frase de impacto aqui.";
    const kw = (sl.palavra || "").trim();
    // pontuação logo após a palavra-chave vai JUNTO dela na barra (sem ponto solto)
    if (kw) { const re = new RegExp("\\s*" + kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([.!?…,;:]*)\\s*", "i"); q = q.replace(re, "\n" + kw + "$1\n").replace(/\n\n+/g, "\n").replace(/^\n|\n$/g, ""); }
    const semPont = (s) => s.replace(/[.!?…,;:]+$/, "").trim().toLowerCase();
    const ff = fit(c, q, "Bricolage Grotesque", "800", maxW, 6, 108, 56);
    const flh = ff.size * 1.12, block = ff.lines.length * flh, fy = Math.round(H * 0.44) - block / 2 + M;
    ff.lines.forEach((l, i) => {
      const yy = fy + i * flh;
      if (kw && semPont(l) === kw.toLowerCase()) bar(c, l.trim(), L, yy, Math.round(ff.size * 0.86), p, maxW);
      else { c.fillStyle = p.ink; c.font = "800 " + ff.size + "px 'Bricolage Grotesque'"; c.fillText(l, L, yy + ff.size * 0.82); }
    });
    const bs = 108;
    badge(c, L, H - B - bs, bs);
    c.fillStyle = p.ink; c.font = "700 44px 'Bricolage Grotesque'";
    c.fillText("Cleiton Sampaio", L + bs + 32, H - B - bs * 0.56);
    if (handle) { c.fillStyle = p.mut; c.font = "500 34px 'Hanken Grotesk'"; c.fillText(handle, L + bs + 32, H - B - bs * 0.14); }
  } else if (sl.tpl === "final") {
    const big = sl.titulo || "Salva pra não esquecer.";
    const lf = fit(c, big, "Bricolage Grotesque", "700", maxW, 3, 56, 44);
    c.fillStyle = p.ink; c.font = "700 " + lf.size + "px 'Bricolage Grotesque'"; const llh = lf.size * 1.1;
    const ly = Math.round(H * 0.2);
    lf.lines.forEach((l, i) => c.fillText(l, L, ly + i * llh + lf.size));
    // BOTÃO CTA — pílula sólida, reservada SÓ pra este slide
    const verbo = (sl.palavra || "comenta QUERO").toUpperCase();
    let vb = 56; c.font = "400 " + vb + "px 'Anton'";
    while (c.measureText(verbo).width + 88 > maxW && vb > 34) { vb -= 2; c.font = "400 " + vb + "px 'Anton'"; }
    const padX = 44, padY = 30, tw = c.measureText(verbo).width;
    const btnY = ly + lf.lines.length * llh + 60, btnH = vb + padY * 2, btnW = tw + padX * 2;
    c.fillStyle = p.barbg; rr(c, L, btnY, btnW, btnH, 18); c.fill();
    c.fillStyle = p.barink; c.font = "400 " + vb + "px 'Anton'"; c.textBaseline = "middle";
    c.fillText(verbo, L + padX, btnY + btnH / 2 + vb * 0.05); c.textBaseline = "alphabetic";
    const instr = sl.corpo || "Comenta a palavra que eu te mando o modelo no direct. E salva pra aplicar essa semana.";
    const inf = fit(c, instr, "Hanken Grotesk", "450", maxW, 5, 40, 32);
    c.fillStyle = p.ink; c.font = "450 " + inf.size + "px 'Hanken Grotesk'"; const ilh = inf.size * 1.45;
    const iy = btnY + btnH + 56;
    inf.lines.forEach((l, i) => c.fillText(l, L, iy + i * ilh + inf.size));
  } else if (sl.tpl === "mito") {
    // MITO (em cima, riscado, cinza) × VERDADE (embaixo, forte)
    c.fillStyle = p.mut; c.font = "700 30px 'Bricolage Grotesque'"; c.fillText("MITO", L, Math.round(H * 0.135));
    const mf = fit(c, sl.titulo || "O que todo mundo repete", "Bricolage Grotesque", "700", maxW, 4, 60, 44);
    c.fillStyle = p.mut; c.font = "700 " + mf.size + "px 'Bricolage Grotesque'";
    const my = Math.round(H * 0.185), mlh = mf.size * 1.1;
    mf.lines.forEach((l, i) => {
      const yy = my + i * mlh + mf.size; c.fillText(l, L, yy);
      c.strokeStyle = p.mut; c.lineWidth = Math.max(3, mf.size * 0.07);
      c.beginPath(); c.moveTo(L, yy - mf.size * 0.3); c.lineTo(L + c.measureText(l).width, yy - mf.size * 0.3); c.stroke();
    });
    const meio = Math.round(H * 0.5);
    c.save(); c.globalAlpha = 0.28; c.strokeStyle = p.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(L, meio); c.lineTo(W - R, meio); c.stroke(); c.restore();
    bar(c, "verdade", L, Math.round(H * 0.55), 40, p, maxW);
    const vf = fit(c, sl.corpo || "O que ninguém tem coragem de falar", "Bricolage Grotesque", "800", maxW, 5, 64, 48);
    c.fillStyle = p.ink; c.font = "800 " + vf.size + "px 'Bricolage Grotesque'";
    const vy = Math.round(H * 0.66), vlh = vf.size * 1.08;
    vf.lines.forEach((l, i) => c.fillText(l, L, vy + i * vlh + vf.size));
  } else if (sl.tpl === "interacao") {
    // story de interação: narração (corpo) + pergunta em destaque (titulo) + sticker
    let y = T + 24;
    if (sl.corpo) {
      const cf = fit(c, sl.corpo, "Hanken Grotesk", "450", maxW, 9, 44, 30);
      c.fillStyle = p.ink; c.font = "450 " + cf.size + "px 'Hanken Grotesk'"; const clh = cf.size * 1.5;
      cf.lines.forEach((l, i) => c.fillText(l, L, y + i * clh + cf.size));
      y += cf.lines.length * clh + 44;
    }
    if (sl.titulo) {
      const qf = fit(c, sl.titulo, "Bricolage Grotesque", "800", maxW, 3, 60, 40);
      c.fillStyle = p.ink; c.font = "800 " + qf.size + "px 'Bricolage Grotesque'"; const qlh = qf.size * 1.12;
      qf.lines.forEach((l, i) => c.fillText(l, L, y + i * qlh + qf.size));
      y += qf.lines.length * qlh + 40;
    }
    // sticker abaixo do texto, mas sempre dentro da área segura de baixo (respiro pro handle)
    const stY = Math.max(Math.min(Math.max(y + 8, Math.round(H * 0.56)), H - B - 200), y + 8);
    if (sl.inter === "caixinha") desenharCaixinha(c, L, stY, maxW, sl.pergunta || "Escreve o convite aqui…", p);
    else desenharEnquete(c, L, stY, maxW, sl.opcaoA || "OPÇÃO A", sl.opcaoB || "OPÇÃO B", p);
  }
  c.restore();

  // handle fixo no rodapé (frase já tem assinatura própria) — dentro da área segura
  if (sl.tpl !== "frase") rodapeHandle(c, W, H, p, handle, L, B);
  // dica de arrasto SÓ na capa (fixa)
  if (sl.tpl === "capa" && total > 1) {
    c.textAlign = "right"; c.font = "700 30px 'Bricolage Grotesque'"; c.fillStyle = p.mut;
    c.fillText("arrasta pro lado  →", W - R, Math.min(Math.round(H * 0.926), H - B - 6)); c.textAlign = "left";
  }

  // logo/marca do usuário (arrastável), mantém transparência do PNG
  if (comLogo) {
    const w = Math.round(W * sl.logoScale), h = Math.round(w * img.height / img.width);
    c.drawImage(img, sl.logoPos.x * W - w / 2, sl.logoPos.y * H - h / 2, w, h);
  }
}

export default function Estudio({ handle, onHandle, frases, iaAtiva }) {
  const rascunho = useRef(carregarRascunho()).current;
  const [fmt, setFmt] = useState(rascunho?.fmt || "carrossel");
  const [cur, setCur] = useState(0);
  const [slides, setSlides] = useState(() => rascunho?.slides || slidesPadrao());
  const [fontsReady, setFontsReady] = useState(false);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [regua, setRegua] = useState(true); // guia de área segura do Instagram (só na edição)
  const cvRef = useRef(null);
  const imgCache = useRef(new Map()); // dataURL -> HTMLImageElement
  const drag = useRef(false);
  const fi = useRef(0); // índice de frase

  const patch = (campo, val) => setSlides((ss) => ss.map((s, i) => (i === cur ? { ...s, [campo]: val } : s)));
  const sl = slides[cur];
  const nomeTpl = { capa: "Capa", conteudo: "Conteúdo", foto: "Foto", frase: "Frase", mito: "Mito × Verdade", final: "Final", interacao: "Interação" };
  const canvasLabel = `Prévia do slide ${cur + 1} de ${slides.length} — modelo ${nomeTpl[sl.tpl] || sl.tpl}, formato ${fmt}${sl.titulo ? ": " + sl.titulo : ""}`;

  const [legenda, setLegenda] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [aviso, setAviso] = useState(null);
  const ultimoAviso = useRef(null);

  // carrega fontes usadas no canvas
  useEffect(() => {
    if (!document.fonts?.load) { setFontsReady(true); return; }
    Promise.all([
      document.fonts.load("800 120px 'Bricolage Grotesque'"),
      document.fonts.load("400 120px 'Anton'"),
      document.fonts.load("500 60px 'Hanken Grotesk'"),
    ]).then(() => setFontsReady(true)).catch(() => setFontsReady(true));
  }, []);
  // @ padrão da marca, pra já aparecer nos slides
  useEffect(() => { if (!handle) onHandle("@eucleitonsampaio"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // salva o rascunho a cada mudança (se estourar a cota, salva sem as imagens)
  useEffect(() => {
    const gravar = (p) => { try { localStorage.setItem(STORE, JSON.stringify(p)); return true; } catch { return false; } };
    if (!gravar({ fmt, slides })) gravar({ fmt, slides: slides.map((s) => ({ ...s, imgData: null })) });
  }, [fmt, slides]);

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
    draw(cv.getContext("2d"), f.w, f.h, slides[cur], cur, slides.length, handle || "@eucleitonsampaio", imgDe(slides[cur].imgData));
    const msg = _ovf ? "Esse texto ficou grande demais pra caber bonito — encurta um pouco." : null;
    if (msg !== ultimoAviso.current) { ultimoAviso.current = msg; setAviso(msg); }
  };
  useEffect(redraw); // redesenha a cada render

  // ── arrastar: pega o LOGO se tocar nele, senão MOVE O TEXTO ──
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const posDoEvento = (e) => {
    const cv = cvRef.current, r = cv.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - r.left) / r.width, y: (t.clientY - r.top) / r.height };
  };
  const temLogo = () => sl.imgData && sl.imgUso === "logo" && sl.tpl !== "foto";
  const noLogo = (px, py) => {
    if (!temLogo()) return false;
    const im = imgCache.current.get(sl.imgData); if (!im) return false;
    const f = FMT[fmt], hw = sl.logoScale / 2, hh = (sl.logoScale * (im.height / im.width) * f.w / f.h) / 2;
    return Math.abs(px - sl.logoPos.x) < hw + 0.05 && Math.abs(py - sl.logoPos.y) < hh + 0.05;
  };
  const onDown = (e) => {
    const pos = posDoEvento(e);
    if (noLogo(pos.x, pos.y)) drag.current = { mode: "logo" };
    else drag.current = { mode: "texto", sx: pos.x, sy: pos.y, bx: sl.textPos?.x || 0, by: sl.textPos?.y || 0 };
  };
  const onMove = (e) => {
    if (!drag.current) return; e.preventDefault();
    const pos = posDoEvento(e);
    if (drag.current.mode === "logo") patch("logoPos", { x: clamp(pos.x, 0, 1), y: clamp(pos.y, 0, 1) });
    else { const d = drag.current; patch("textPos", { x: clamp(d.bx + (pos.x - d.sx), -0.4, 0.4), y: clamp(d.by + (pos.y - d.sy), -0.4, 0.4) }); }
  };
  const onUp = () => { drag.current = null; };
  const resetTexto = () => patch("textPos", { x: 0, y: 0 });

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
  const moveSlide = (dir) => { const j = cur + dir; if (j < 0 || j >= slides.length) return; setSlides((ss) => { const n = [...ss];[n[cur], n[j]] = [n[j], n[cur]]; return n; }); setCur(j); };
  const trocarFrase = () => { if (!frases?.length) return; fi.current = (fi.current + 1) % frases.length; patch("titulo", frases[fi.current]); };

  // ── legenda pronta (a imagem é metade; a legenda gera comentário/salvamento) ──
  const gerarLegenda = () => {
    const capa = slides.find((s) => s.tpl === "capa") || slides[0];
    const fin = slides.find((s) => s.tpl === "final");
    const pontos = slides.filter((s) => s.tpl === "conteudo" && s.titulo.trim()).map((s) => "▸ " + s.titulo.trim());
    const cta = (fin && (fin.corpo || fin.titulo)) || "Salva esse post pra aplicar e comenta o que achou.";
    const tags = "#empreendedorismo #evolução #disciplina #negócios #empreender #mentalidade #constância #bastidores #foco #empreendedorismodigital";
    return [capa?.titulo?.trim(), capa?.subtitulo?.trim(), "", pontos.join("\n"), pontos.length ? "" : null, cta, "", "Bora construir.", "", tags].filter((x) => x !== null && x !== undefined).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  };
  const copiarLegenda = async () => {
    const txt = legenda || gerarLegenda();
    try { await navigator.clipboard.writeText(txt); setCopiado(true); setTimeout(() => setCopiado(false), 1600); }
    catch { setLegenda(txt); }
  };
  const [gerandoIA, setGerandoIA] = useState(false);
  const gerarLegendaIA = async () => {
    setGerandoIA(true); setErro(null);
    try {
      const r = await api.iaLegenda(slides.map((s) => ({ tpl: s.tpl, titulo: s.titulo, subtitulo: s.subtitulo, corpo: s.corpo, palavra: s.palavra })));
      if (r?.legenda) setLegenda(r.legenda);
    } catch (e) { setErro(e.message || "A IA falhou desta vez."); }
    finally { setGerandoIA(false); }
  };

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
    for (let i = 0; i < slides.length; i++) { draw(ec, f.w, f.h, slides[i], i, slides.length, handle || "@eucleitonsampaio", imgDe(slides[i].imgData)); files.push(await toFile(exp, nome(i))); }
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
        <p className="estsub">Escreve o texto, sobe foto ou logo, <b>arrasta pra posicionar</b>. Sai pronto na sua identidade — salva direto no celular.</p>
        <button className="estbtn solid estnovo" onClick={() => { setSlides(modeloCarrossel()); setCur(0); }}>✦ Montar um carrossel do zero (8 slides)</button>
        <button className="estbtn ghost estnovo" onClick={() => { setSlides(pacoteInteracao()); setCur(0); setFmt("story"); }}>◇ Pacote: 15 stories de interação</button>
      </div>

      <div className="eststage">
        <div className="estcvwrap">
          <div className="estcvbox">
            <canvas
              ref={cvRef} className="estcv" role="img" aria-label={canvasLabel}
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
              style={{ cursor: "grab", touchAction: "none" }}
            />
            {regua && <SafeArea z={AREASEGURA[fmt]} />}
            <span className="estdicaarrasta">{temLogo() ? "arraste o texto ou o logo pra posicionar" : "arraste pra mover o texto"}</span>
          </div>
        </div>
        <div className="estslidebar">
          <button className="estnav" disabled={cur === 0} onClick={() => setCur((c) => c - 1)} aria-label="Anterior">‹</button>
          <div className="estthumbs">
            {slides.map((s, i) => <Thumb key={s.id} s={s} i={i} total={slides.length} handle={handle || "@eucleitonsampaio"} fmt={fmt} on={i === cur} img={imgDe(s.imgData)} onClick={() => setCur(i)} />)}
          </div>
          <button className="estnav" disabled={cur === slides.length - 1} onClick={() => setCur((c) => c + 1)} aria-label="Próximo">›</button>
        </div>
        {aviso && <p className="estaviso">⚠ {aviso}</p>}
        <div className="estacts">
          <button className={"estbtn ghost" + (regua ? " on" : "")} aria-pressed={regua} onClick={() => setRegua((v) => !v)} title="Mostra a área segura do Instagram — não sai na foto">⊞ Régua</button>
          <button className="estbtn ghost" onClick={() => moveSlide(-1)} disabled={cur === 0} aria-label="Mover slide para a esquerda" title="Mover pra esquerda">◀</button>
          <button className="estbtn ghost" onClick={() => moveSlide(1)} disabled={cur === slides.length - 1} aria-label="Mover slide para a direita" title="Mover pra direita">▶</button>
          <button className="estbtn ghost" onClick={addSlide}>+ Slide</button>
          <button className="estbtn ghost" onClick={dupSlide}>Duplicar</button>
          <button className="estbtn ghost" onClick={delSlide} disabled={slides.length <= 1}>Apagar</button>
          {(sl.textPos?.x || sl.textPos?.y) ? <button className="estbtn ghost" onClick={resetTexto}>Centralizar</button> : null}
          <span className="estcount">{cur + 1} / {slides.length}</span>
        </div>
      </div>

      <div className="estpanel">
        <Field label="Formato">
          <div className="estseg">{seg([{ v: "carrossel", t: "Carrossel" }, { v: "quadrado", t: "Quadrado" }, { v: "story", t: "Story" }], fmt, setFmt)}</div>
        </Field>
        <Field label="Modelo do slide">
          <div className="estseg">{seg([{ v: "capa", t: "Capa" }, { v: "conteudo", t: "Conteúdo" }, { v: "foto", t: "Foto" }, { v: "frase", t: "Frase" }, { v: "mito", t: "Mito×V" }, { v: "final", t: "Final" }, { v: "interacao", t: "Interação" }], sl.tpl, (v) => patch("tpl", v))}</div>
        </Field>
        <div className="estdupla">
          <Field label="Fundo">
            <div className="estseg">{seg([{ v: "preto", t: "Preto" }, { v: "papel", t: "Papel" }], sl.tema, (v) => patch("tema", v))}</div>
          </Field>
          <Field label="Tamanho da letra">
            <div className="estseg">{seg([{ v: 0.85, t: "Menor" }, { v: 1, t: "Médio" }, { v: 1.2, t: "Maior" }, { v: 1.45, t: "Máx" }], sl.escala || 1, (v) => patch("escala", v))}</div>
          </Field>
        </div>
        <Field label={{ capa: "Gancho (headline)", conteudo: "Título do slide", foto: "Frase na foto", frase: "Frase", mito: "O mito (o que dizem)", final: "Frase de fecho", interacao: "Pergunta em destaque (opcional)" }[sl.tpl] || "Título"}>
          <div className="estlinha">
            <textarea className="estarea" value={sl.titulo} onChange={(e) => patch("titulo", e.target.value)} placeholder={sl.tpl === "capa" ? "5 a 8 palavras que param o dedo" : sl.tpl === "interacao" ? "uma linha forte (ex.: O que irrita mais?)" : "Escreve aqui…"} rows={2} />
          </div>
          {frases?.length && (sl.tpl === "frase" || sl.tpl === "capa") ? <button className="estlink" onClick={trocarFrase}>trocar por uma frase pronta ↻</button> : null}
        </Field>
        {sl.tpl === "conteudo" && (
          <Field label="Destaque do título">
            <div className="estseg">{seg([{ v: false, t: "Normal" }, { v: true, t: "Destaque (barra)" }], !!sl.destaque, (v) => patch("destaque", v))}</div>
          </Field>
        )}
        {sl.tpl === "capa" && (
          <Field label="Subtítulo (menor, cinza)"><input className="estinput" value={sl.subtitulo} onChange={(e) => patch("subtitulo", e.target.value)} placeholder="uma linha de apoio, sem repetir o gancho" /></Field>
        )}
        {sl.tpl === "conteudo" && (
          <Field label="Formato do texto">
            <div className="estseg">{seg([{ v: "texto", t: "Parágrafo" }, { v: "bullet", t: "Lista •" }, { v: "num", t: "Números 01" }], sl.lista, (v) => patch("lista", v))}</div>
          </Field>
        )}
        {(sl.tpl === "conteudo" || sl.tpl === "final" || sl.tpl === "mito" || sl.tpl === "interacao") && (
          <Field label={sl.tpl === "final" ? "Instrução (o que fazer)" : sl.tpl === "mito" ? "A verdade (o que ninguém fala)" : sl.tpl === "interacao" ? "Narração (o texto de cima)" : (sl.lista === "texto" ? "Texto do slide (uma ideia só)" : "Itens da lista (uma linha por item)")}><textarea className="estarea" value={sl.corpo} onChange={(e) => patch("corpo", e.target.value)} placeholder={sl.tpl === "final" ? "Comenta X que te mando no direct…" : sl.tpl === "mito" ? "A verdade que muda o jogo…" : sl.tpl === "interacao" ? "Conta a história em linhas curtas…" : (sl.lista === "texto" ? "O miolo do slide…" : "Primeiro item\nSegundo item\nTerceiro item")} rows={sl.tpl === "interacao" ? 5 : (sl.lista === "texto" ? 3 : 4)} /></Field>
        )}
        {sl.tpl === "interacao" && (
          <>
            <Field label="Tipo de interação">
              <div className="estseg">{seg([{ v: "enquete", t: "Enquete (2 opções)" }, { v: "caixinha", t: "Caixinha (pergunta)" }], sl.inter || "enquete", (v) => patch("inter", v))}</div>
            </Field>
            {(sl.inter || "enquete") === "caixinha" ? (
              <Field label="Convite da caixinha"><input className="estinput" value={sl.pergunta} onChange={(e) => patch("pergunta", e.target.value)} placeholder="Ex.: Me indica um 👇" /></Field>
            ) : (
              <div className="estdupla">
                <Field label="Opção da esquerda"><input className="estinput" value={sl.opcaoA} onChange={(e) => patch("opcaoA", e.target.value)} placeholder="Ex.: SIM" /></Field>
                <Field label="Opção da direita"><input className="estinput" value={sl.opcaoB} onChange={(e) => patch("opcaoB", e.target.value)} placeholder="Ex.: EU ENTREGO LOGO" /></Field>
              </div>
            )}
            <p className="esthint">Posta assim (as pessoas respondem no direct) ou, no Instagram, cola a <b>enquete/caixinha de verdade</b> por cima desta pra contar votos.</p>
          </>
        )}
        {sl.tpl === "conteudo" && (
          <Field label="Gancho de continuidade (puxa o próximo)"><input className="estinput" value={sl.gancho} onChange={(e) => patch("gancho", e.target.value)} placeholder="…e o pior nem é esse →" /></Field>
        )}
        {sl.tpl !== "interacao" && sl.tpl !== "mito" && (
          <Field label={sl.tpl === "final" ? "Verbo do botão (CTA)" : "Palavra-chave (barra invertida)"}><input className="estinput" value={sl.palavra} onChange={(e) => patch("palavra", e.target.value)} placeholder={sl.tpl === "final" ? "Ex.: comenta QUERO" : "Ex.: em tempo real"} /></Field>
        )}

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

        <details className="estlegenda">
          <summary>Legenda pronta pra colar</summary>
          <p className="esthint" style={{ margin: "8px 0 10px" }}>A imagem para o dedo; a <b>legenda</b> é o que gera comentário e salvamento. Gera daqui, ajusta e cola no Instagram.</p>
          <textarea className="estarea" value={legenda} onChange={(e) => setLegenda(e.target.value)} rows={8} placeholder="Clique em “Gerar da timeline” que eu monto a legenda a partir dos seus slides…" />
          <div className="estlegacts">
            {iaAtiva && <button className="estbtn ghost" onClick={gerarLegendaIA} disabled={gerandoIA}>{gerandoIA ? "Escrevendo…" : "Gerar com IA ✦"}</button>}
            <button className="estbtn ghost" onClick={() => setLegenda(gerarLegenda())}>{iaAtiva ? "Sem IA ↻" : "Gerar da timeline ↻"}</button>
            <button className="estbtn solid" onClick={copiarLegenda}>{copiado ? "Copiado ✓" : "Copiar"}</button>
          </div>
        </details>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return <div className="estfield"><span className="estlbl">{label}</span>{children}</div>;
}

// Guia de área segura: faixas hachuradas nas zonas de risco + contorno tracejado.
// É um nó de DOM separado por cima do <canvas>, então nunca entra no toBlob()/PNG.
function SafeArea({ z }) {
  const pc = (v) => v * 100 + "%";
  return (
    <div className="estsafe" aria-hidden="true">
      <div className="estsafe-band" style={{ top: 0, left: 0, right: 0, height: pc(z.top) }} />
      <div className="estsafe-band" style={{ bottom: 0, left: 0, right: 0, height: pc(z.bottom) }} />
      <div className="estsafe-band" style={{ top: 0, bottom: 0, left: 0, width: pc(z.left) }} />
      <div className="estsafe-band" style={{ top: 0, bottom: 0, right: 0, width: pc(z.right) }} />
      <div className="estsafe-box" style={{ top: pc(z.top), right: pc(z.right), bottom: pc(z.bottom), left: pc(z.left) }} />
      <span className="estsafe-tag">Área segura · {z.nota}</span>
    </div>
  );
}

function Thumb({ s, i, total, handle, fmt, on, img, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    const f = FMT[fmt], c = ref.current; if (!c) return;
    c.width = 240; c.height = Math.round(240 * f.h / f.w);
    draw(c.getContext("2d"), c.width, c.height, s, i, total, handle, img);
  });
  return <button className={"estthumb" + (on ? " on" : "")} onClick={onClick} aria-label={"Ir para o slide " + (i + 1)} aria-current={on ? "true" : undefined}><canvas ref={ref} /></button>;
}

const css = `
.est{padding:2px 0 8px;}
.esthead{margin-bottom:16px;}
.esth{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:23px;letter-spacing:-.02em;margin:0 0 6px;color:#0A0A0A;}
.estsub{font-size:14px;line-height:1.55;color:#6E6E73;margin:0;}
.estsub b{color:#0A0A0A;font-weight:600;}
.estnovo{width:100%;margin-top:14px;font-size:15px;padding:13px 15px;}
.eststage{margin-bottom:18px;}
.estcvwrap{position:relative;background:#ECEAE6;border:1px solid #E4E2DE;border-radius:18px;padding:16px;display:grid;place-items:center;box-shadow:0 1px 2px rgba(10,10,10,.04),0 14px 30px -22px rgba(10,10,10,.3);}
.estcvbox{position:relative;line-height:0;max-width:100%;}
.estcv{width:auto;max-width:100%;max-height:56vh;height:auto;border-radius:8px;box-shadow:0 16px 40px -20px rgba(10,10,10,.6);display:block;-webkit-user-select:none;user-select:none;}
.estdicaarrasta{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(10,10,10,.72);color:#F4F3F1;font-size:11.5px;line-height:1.3;font-weight:600;padding:5px 12px;border-radius:99px;pointer-events:none;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);}
/* régua de área segura — só na edição, hachura vermelha nas zonas de corte */
.estsafe{position:absolute;inset:0;pointer-events:none;border-radius:8px;overflow:hidden;}
.estsafe-band{position:absolute;background:repeating-linear-gradient(-45deg,rgba(226,64,64,.30) 0 5px,rgba(226,64,64,.09) 5px 11px);}
.estsafe-box{position:absolute;border:1.5px dashed rgba(255,255,255,.95);border-radius:4px;box-shadow:0 0 0 1.5px rgba(10,10,10,.45),inset 0 0 0 1px rgba(10,10,10,.18);}
.estsafe-tag{position:absolute;top:8px;left:50%;transform:translateX(-50%);max-width:94%;background:rgba(10,10,10,.82);color:#F4F3F1;font-family:'Hanken Grotesk',sans-serif;font-weight:600;font-size:10px;line-height:1.25;padding:5px 9px;border-radius:99px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);}
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
.estbtn.ghost.on{background:#0A0A0A;color:#F4F3F1;border-color:#0A0A0A;}
.estbtn.solid{background:#0A0A0A;color:#F4F3F1;border-color:#0A0A0A;}
.estbtn.solid:hover:not(:disabled){filter:brightness(1.15);}
.estbtn.wide{width:100%;}
.estpanel{background:#fff;border:1px solid #E4E2DE;border-radius:18px;padding:18px;box-shadow:0 1px 2px rgba(10,10,10,.04),0 14px 30px -24px rgba(10,10,10,.22);display:grid;gap:16px;}
.estfield{display:grid;gap:8px;}
.estlbl{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#6E6E73;}
.estseg{display:flex;gap:6px;flex-wrap:wrap;}
.estdupla{display:grid;gap:16px;}
.estseg-b{flex:1;min-width:60px;border:1px solid #E4E2DE;background:transparent;color:#6E6E73;border-radius:10px;padding:9px 8px;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all .16s;white-space:nowrap;}
.estseg-b.on{background:#0A0A0A;color:#F4F3F1;border-color:#0A0A0A;}
.estseg-b:active{transform:scale(.96);}
.estinput,.estarea{width:100%;border:1px solid #E4E2DE;border-radius:11px;background:#F4F3F1;color:#0A0A0A;font-family:'Hanken Grotesk',sans-serif;font-size:16px;padding:11px 13px;outline:none;transition:border-color .2s;}
.estinput:focus,.estarea:focus{border-color:#0A0A0A;}
/* foco de teclado visível (acessibilidade) — anel fora da borda, aparece em qualquer botão */
.est button:focus-visible,.est label.estupload:focus-within,.estinput:focus-visible,.estarea:focus-visible,.estlink:focus-visible{outline:2px solid #0A0A0A;outline-offset:2px;border-radius:8px;}
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
.estaviso{background:#F4F3F1;border:1px solid #D8D6D0;border-left:3px solid #0A0A0A;border-radius:10px;padding:9px 12px;font-size:12.5px;line-height:1.4;color:#0A0A0A;font-weight:600;margin:12px 0 0;}
.estlegenda{border:1px solid #E4E2DE;border-radius:14px;padding:4px 16px 16px;background:#F4F3F1;}
.estlegenda>summary{list-style:none;cursor:pointer;padding:14px 0 4px;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:14.5px;color:#0A0A0A;}
.estlegenda>summary::-webkit-details-marker{display:none;}
.estlegenda>summary::after{content:"+";float:right;font-weight:700;color:#6E6E73;font-size:1.2rem;line-height:1;}
.estlegenda[open]>summary::after{content:"\\2013";}
.estlegacts{display:flex;gap:10px;margin-top:10px;}
.estlegacts .estbtn{flex:1;}
@media(min-width:820px){
  .eststage,.estpanel{max-width:640px;margin-left:auto;margin-right:auto;}
}
`;
