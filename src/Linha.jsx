import React, { useState, useEffect, useRef } from "react";
import PhoenixMascot from "./Fenix.jsx";
import Treino from "./Treino.jsx";
import { IcHalter } from "./Icones.jsx";
import { api } from "./api.js";
import { descartarLegado, lerLegado } from "./armazenamento.js";
import {
  arquivar,
  ativo,
  chaveSemana,
  diaDoAno,
  fotografar,
  iso,
  letraDoDia,
  normalizar,
  TIPS,
} from "./estado.js";
import { useEstadoSincronizado } from "./sync.js";

// ─── Linha · Copiloto de rotina ────────────────────────────────────────
// Azul tech. Rotina editável + 3 vitórias + dieta + peso + bem-estar
// + motor anti-preguiça (sequência, foco, baixa energia) + resumo semanal.
//
// O formato do estado, a virada de dia e a fusão entre aparelhos moram em
// estado.js — o servidor precisa concordar com eles, então não podem viver aqui.

const C = {
  bg: "#E9EFFB", surface: "#FFFFFF", ink: "#0C1A33", muted: "#5A6B87",
  faint: "#D6E0F0", blue: "#1F5FE6", blueSoft: "#E2ECFC",
  cyan: "#0FB5C7", cyanSoft: "#DBF4F6", navy: "#0C1A33",
  gold: "#C98A24", goldSoft: "#F4EAD4",
};

const KCAL_META = 2900;
const PROT_META = 120;

const CHEER = [
  "Não desiste não. Você já chegou até aqui.",
  "Vai com calma, um passo de cada vez. Eu acredito em você.",
  "Se tá cansado, descansa. Só não desiste.",
  "Você aguenta mais do que a preguiça de hoje quer te convencer.",
  "Continua. O Cleiton de daqui a um ano vai te agradecer.",
  "Devagar também é ir. Segue.",
  "Império nenhum se constrói num dia. Só não para.",
  "Respira e faz uma coisinha só. Já ajuda.",
];
const HAPPY = [
  "Eu sabia que você ia conseguir. Que orgulho de te ver assim.",
  "Fechou as três! Levanta a cabeça, você merece.",
  "É isso. Amanhã a gente sobe de novo.",
];
const SOFT = [
  "Dia difícil acontece. Faz só uma coisinha, eu fico aqui com você.",
  "Energia baixa também faz parte. Descansa, que amanhã você sobe de novo.",
  "Respira fundo. Um passo pequeno já conta, e você não tá sozinho.",
];

const PHRASES = [
  { cat: "empresa", text: "Construir empresa é fazer o chato bem feito, todo dia." },
  { cat: "empresa", text: "Cliente não quer promessa. Quer problema resolvido." },
  { cat: "empresa", text: "Empresa grande é empresa pequena que não desistiu." },
  { cat: "empresa", text: "Foca em três coisas por dia. O resto é ruído." },
  { cat: "empresa", text: "Ninguém constrói império numa terça. Constrói em mil terças." },
  { cat: "empresa", text: "Vende antes de estar pronto. Perfeito é desculpa pra não começar." },
  { cat: "empresa", text: "O que não é medido vira achismo." },
  { cat: "empresa", text: "Sua marca é o que falam de você quando você sai da sala." },
  { cat: "empresa", text: "Faturamento paga conta. Reputação abre porta." },
  { cat: "empresa", text: "Delegar não é perder controle. É ganhar tempo." },
  { cat: "empresa", text: "Trabalha calado e deixa o resultado fazer barulho." },
  { cat: "empresa", text: "Toda grande ideia parece pequena no começo." },
  { cat: "empresa", text: "Quem resolve o problema do cliente hoje vende de novo amanhã." },
  { cat: "empresa", text: "Concorrente não te vence. Desistir te vence." },
  { cat: "empresa", text: "Reunião não entrega nada. Quem entrega é você." },
  { cat: "diaadia", text: "Levanta. O dia não vai se resolver do travesseiro." },
  { cat: "diaadia", text: "Um copo d'água e dez minutos de sol já mudam sua manhã." },
  { cat: "diaadia", text: "Você não tá atrasado. Tá no seu tempo." },
  { cat: "diaadia", text: "Descanso também é parte do trabalho." },
  { cat: "diaadia", text: "Cuida do corpo. É onde você vai morar a vida toda." },
  { cat: "diaadia", text: "Compara com o você de ontem, não com o feed dos outros." },
  { cat: "diaadia", text: "Dia ruim tem 24 horas. Não deixa virar a vida toda." },
  { cat: "diaadia", text: "Progresso devagar ainda te tira do lugar." },
  { cat: "diaadia", text: "Respira. O urgente quase nunca é o importante." },
  { cat: "diaadia", text: "Guarda um tempo pra quem tá do seu lado." },
  { cat: "diaadia", text: "Cansaço passa. Arrependimento fica." },
  { cat: "diaadia", text: "Começa pequeno, começa hoje, só começa." },
  { cat: "diaadia", text: "Você já superou dias que achou que não ia aguentar." },
  { cat: "diaadia", text: "Se caiu, levanta. Fênix não pede desculpa por renascer." },
  { cat: "diaadia", text: "Feito hoje vale mais que perfeito algum dia." },
  { cat: "recomeco", text: "Recomeçar não é voltar pro zero. É voltar com experiência." },
  { cat: "recomeco", text: "Hoje você só precisa vencer o hoje." },
  { cat: "recomeco", text: "Dias cinzas também passam. Continua andando." },
  { cat: "recomeco", text: "Pedir ajuda é coisa de gente forte." },
  { cat: "recomeco", text: "Você não é o seu pior dia." },
  { cat: "recomeco", text: "Devagar, mas todo dia. É assim que se sai do fundo." },
  { cat: "recomeco", text: "A fênix não renasce por ser forte. Renasce porque não aceita o fim." },
  { cat: "recomeco", text: "Cuidar de você também é produtividade." },
  { cat: "recomeco", text: "Um passo pequeno hoje vale mais que um plano perfeito amanhã." },
  { cat: "recomeco", text: "Escuridão nenhuma apaga quem decide acender de novo." },
];
const WEEK_PHRASE = "7 dias. 7 vitórias. Semana fechada. Bora pra próxima.";

const GUIDES = [
  { cat: "preguica", title: "Regra dos 2 minutos", why: "Começar é a parte mais difícil. Se a tarefa dura menos de 2 minutos, o cérebro nem tem tempo de inventar desculpa.", steps: ["Pega a tarefa que você tá empurrando.", "Encolhe ela pra uma versão de 2 minutos: abrir o arquivo, calçar o tênis, escrever uma linha.", "Faz só isso. Se quiser parar depois, pode. Quase nunca você vai querer."] },
  { cat: "preguica", title: "Plano se... então", why: "É uma das técnicas com mais evidência que existe. Você decide antes o que vai fazer quando a situação aparecer, e aí não depende de força de vontade na hora.", steps: ["Escreve: SE acontecer X, ENTÃO eu faço Y.", "Exemplo: se der 9h, então eu abro a proposta antes de qualquer mensagem.", "Exemplo: se bater vontade de adiar, então eu faço só os 2 primeiros minutos.", "Quanto mais específico o lugar e a hora, melhor funciona."] },
  { cat: "preguica", title: "Aja antes do humor", why: "A gente espera a vontade chegar pra agir, mas é o contrário: a ação vem primeiro e a vontade vem atrás.", steps: ["Aceita que você não precisa estar animado pra começar.", "Combina consigo mesmo um início ridículo de pequeno.", "Depois de 5 minutos fazendo, repara como o humor muda sozinho."] },
  { cat: "preguica", title: "Coma o sapo", why: "Fazer a tarefa mais difícil logo cedo, quando a energia tá alta, tira um peso que contaminaria o dia inteiro.", steps: ["À noite, escolhe qual é o sapo de amanhã: a tarefa que você mais quer evitar.", "De manhã, faz ela antes de abrir WhatsApp ou e-mail.", "O resto do dia fica leve em comparação."] },
  { cat: "habito", title: "Empilhar hábito", why: "Colar um hábito novo num que já existe usa o piloto automático a seu favor. É bem mais fácil do que criar do zero.", steps: ["Escolhe um hábito que você já tem: café da manhã, escovar os dentes, chegar no escritório.", "Cola o novo logo depois: depois do café, 10 minutos de inglês.", "Fórmula: depois de [hábito atual], eu vou [hábito novo]."] },
  { cat: "habito", title: "Comece minúsculo", why: "Hábito que começa grande morre na primeira semana difícil. Começar pequeno demais pra falhar é o que sobrevive.", steps: ["Reduz a meta até dar vergonha: 1 flexão, 1 frase, 2 minutos.", "Cumpre essa versão mínima todo dia, mesmo nos dias ruins.", "Deixa o tamanho crescer sozinho com o tempo. Consistência primeiro, volume depois."] },
  { cat: "habito", title: "Não quebre a corrente", why: "Ver a sequência crescer cria um compromisso visual. Seu trabalho vira só um: não quebrar a corrente.", steps: ["Marca um X (ou fecha suas 3 vitórias aqui no Linha) todo dia que cumprir.", "Se falhar um dia, a regra de ouro: nunca falhe dois seguidos.", "O escudo do app existe exatamente pra isso."] },
  { cat: "habito", title: "Desenhe o ambiente", why: "Ambiente vence força de vontade. Quem decide seu comportamento muitas vezes é o que está à vista e ao alcance.", steps: ["Deixa o que você quer fazer fácil e visível: tênis do lado da cama, castanhas na mesa do escritório.", "Deixa o que quer evitar difícil e escondido: celular em outro cômodo, notificação desligada.", "Uma mudança de ambiente vale mais que dez promessas."] },
  { cat: "habito", title: "Hábito de identidade", why: "Hábito que dura não é o que você faz, é quem você decide ser. A pergunta muda de 'o que quero alcançar' pra 'quem eu quero me tornar'.", steps: ["Define a identidade: sou um cara que treina, sou um empresário que entrega.", "A cada ação pequena, fala pra si: é isso que uma pessoa assim faz.", "Cada repetição é um voto nessa identidade."] },
  { cat: "habito", title: "10 páginas por dia", why: "Ler pouco todo dia vence ler muito de vez em quando. Dez páginas diárias passam de 3.600 páginas num ano, uns dez livros ou mais.", steps: ["Escolhe UM livro e registra ele no cartão Leitura aqui do app.", "Cola a leitura num hábito que já existe: depois do café, ou antes de dormir com o celular longe.", "Dez páginas. Se quiser parar ali, tá cumprido. Se quiser seguir, lucro."] },
  { cat: "energia", title: "Sol e luz de manhã", why: "Luz forte de manhã ajusta seu relógio interno: você fica mais alerta de dia e dorme melhor de noite.", steps: ["Nos primeiros 30 a 60 minutos acordado, pega 5 a 10 minutos de luz natural.", "Toma o café perto da janela ou vai a pé até a padaria.", "Evita luz forte de tela na última hora antes de dormir."] },
  { cat: "energia", title: "Sono é treino", why: "É dormindo que o músculo cresce, a memória consolida e o humor se regula. Cortar sono pra produzir é pagar juros caro.", steps: ["Escolhe um horário de dormir e protege ele como reunião importante.", "Quarto escuro, fresco e celular longe da cama.", "7h30 a 8h por noite. Pra quem quer ganhar peso e massa, é inegociável."] },
  { cat: "energia", title: "Mexa o corpo pra ter energia", why: "Parece contraditório, mas movimento gera energia. Uma caminhada curta acorda mais que café.", steps: ["Quando bater a moleza da tarde, levanta e anda 10 minutos.", "Sobe escada em vez de elevador quando der.", "Treino de força 3 a 4 vezes por semana muda seu nível de energia em poucas semanas."] },
  { cat: "energia", title: "Água e comida de verdade", why: "Cansaço à tarde muitas vezes é desidratação ou açúcar demais no almoço.", steps: ["Garrafa de água na mesa, sempre à vista.", "No almoço, prioriza proteína e comida de verdade em vez de massa e doce.", "Pra sua meta de peso: os lanches entre as refeições são o que mais soma."] },
  { cat: "mente", title: "Descarga mental no papel", why: "Cabeça cheia gira em círculo. O que sai da cabeça e vai pro papel para de gritar.", steps: ["Pega papel ou nota do celular e despeja tudo que tá te ocupando, sem ordem.", "Circula só o que é de hoje. O resto tem dia marcado ou vai embora.", "Escolhe as 3 vitórias a partir disso."] },
  { cat: "mente", title: "Respiração 4-4-4-4", why: "Respirar devagar e com pausa acalma o sistema nervoso em um ou dois minutos. É o botão de emergência do corpo.", steps: ["Inspira contando 4, segura 4, solta 4, segura 4.", "Repete por 4 a 6 ciclos.", "Tem guiado aqui no app, no botão 'respira 1 min'."] },
  { cat: "mente", title: "Fale consigo como falaria com um amigo", why: "Autocobrança dura demais não motiva, trava. Autocompaixão não é frouxidão: quem se trata bem persiste mais.", steps: ["Quando errar, pergunta: o que eu diria pa um amigo nessa situação?", "Diz isso pra você mesmo, nas mesmas palavras.", "Erro vira informação, não vira sentença."] },
  { cat: "mente", title: "Preocupação com hora marcada", why: "Tentar não pensar não funciona. Dar um horário pra preocupação tira ela do resto do dia.", steps: ["Marca 15 minutos no fim da tarde: a 'hora da preocupação'.", "Quando a ansiedade aparecer fora de hora, anota e fala: te vejo às 17h.", "Na hora marcada, olha a lista. Metade já perdeu a força."] },
  { cat: "empresa", title: "Blocos de foco protegidos", why: "Trabalho profundo não acontece entre notificações. Uma hora protegida rende mais que quatro picotadas.", steps: ["Marca na agenda 1 ou 2 blocos de 60 a 90 minutos por dia.", "Celular em outro cômodo, aba de e-mail fechada, WhatsApp Web fora.", "Manhã pra criar, tarde pra resolver e atender."] },
  { cat: "empresa", title: "As 3 vitórias do dia", why: "Lista de 15 itens garante frustração. Três coisas que importam, fechadas, movem a empresa de verdade.", steps: ["De manhã (ou na noite anterior), escolhe 1 vitória de empresa, 1 de saúde, 1 de vida.", "Faz a de empresa no primeiro bloco de foco.", "Fechou as três? O dia valeu, independente do resto."] },
  { cat: "empresa", title: "Toque único", why: "Reler mensagem pra responder depois é pagar duas vezes pela mesma tarefa.", steps: ["Definir 2 ou 3 janelas por dia pra mensagens e e-mail.", "Abriu, resolve: responde, delega ou marca quando vai fazer.", "Fora das janelas, notificação desligada."] },
  { cat: "empresa", title: "Revisão semanal de 30 minutos", why: "Sem parar pra olhar o mapa, você corre a semana inteira e não sai do lugar.", steps: ["Sexta no fim da tarde ou domingo à noite: 30 minutos, sozinho.", "Três perguntas: o que andou? o que travou? o que é prioridade na semana que vem?", "Já deixa as 3 vitórias de segunda escolhidas."] },
];

const GUIDE_CATS = [["todas", "Todas"], ["preguica", "Vencer a preguiça"], ["habito", "Criar hábito"], ["energia", "Energia e corpo"], ["mente", "Mente em paz"], ["empresa", "Empresa e foco"]];

const CHALLENGES = [
  "Faça primeiro a tarefa que você mais tá adiando.",
  "Elogie alguém de verdade hoje, sem motivo.",
  "Passe 10 minutos sem celular, só pensando na sua meta.",
  "Beba 2 litros de água ao longo do dia.",
  "Diga não pra uma coisa que não é prioridade.",
  "Mande aquela mensagem que você tá enrolando pra mandar.",
  "Agradeça por três coisas antes de dormir.",
  "Fique 5 minutos no sol de manhã.",
  "Termine uma tarefa antes de começar outra.",
  "Anote uma ideia nova pra Fluxo, mesmo que pareça pequena.",
  "Caminhe 15 minutos sem destino.",
  "Arrume seu espaço de trabalho antes de começar.",
  "Peça um feedback sincero pra alguém hoje.",
  "Coma uma refeição sem tela nenhuma.",
  "Escreva o que te deixou orgulhoso essa semana.",
  "Reserve 20 minutos pra sua esposa, sem pressa.",
  "Estude 15 minutos de algo que te aproxima do seu objetivo.",
  "Faça uma coisa difícil antes das 10h.",
  "Desligue as notificações por duas horas.",
  "Perdoe a si mesmo por um erro e siga em frente.",
  "Ajude alguém sem esperar nada em troca.",
  "Planeje o dia de amanhã em três linhas.",
  "Respire fundo 10 vezes quando bater a ansiedade.",
  "Tire da lista uma tarefa que não importa mais.",
  "Comemore uma pequena vitória em voz alta.",
  "Durma 30 minutos mais cedo hoje.",
  "Escreva de novo por que você começou tudo isso.",
  "Faça uma pausa de verdade no meio da tarde.",
  "Feche o dia com o celular longe da cama.",
  "Dê o primeiro passo naquele projeto parado.",
];

const BGS = [
  { name: "Navy", type: "linear", stops: [[0, "#0C1A33"], [1, "#1F5FE6"]], text: "#fff" },
  { name: "Ciano", type: "linear", stops: [[0, "#1F5FE6"], [1, "#0FB5C7"]], text: "#fff" },
  { name: "Noite", type: "radial", base: "#08111F", stops: [[0, "rgba(15,181,199,0.55)"], [1, "rgba(8,17,31,0)"]], text: "#fff" },
  { name: "Água", type: "linear", stops: [[0, "#0FB5C7"], [1, "#0C6B8A"]], text: "#fff" },
  { name: "Fênix", type: "linear", stops: [[0, "#0C1A33"], [0.55, "#3A2A6B"], [1, "#E08A2C"]], text: "#fff" },
  { name: "Claro", type: "linear", stops: [[0, "#EAF2FF"], [1, "#D3E6FB"]], text: "#0C1A33" },
];

const swStyle = (b) => {
  if (b.type === "radial") return { background: `radial-gradient(circle at 50% 40%, ${b.stops[0][1]}, ${b.base})` };
  return { background: `linear-gradient(135deg, ${b.stops.map(([o, c]) => `${c} ${Math.round(o * 100)}%`).join(",")})` };
};

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = []; let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}
function paintBg(ctx, W, H, bg) {
  if (bg.type === "radial") {
    ctx.fillStyle = bg.base; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.4, H * 0.78);
    bg.stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    bg.stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // grão sutil, tira a cara de degradê de gerador
  for (let i = 0; i < 2800; i++) {
    ctx.globalAlpha = Math.random() * 0.045;
    ctx.fillStyle = Math.random() < 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  ctx.globalAlpha = 1;
}
function drawPhoenixEmblem(ctx, cx, topY, k, flat) {
  ctx.save();
  ctx.translate(cx - 60 * k, topY);
  ctx.scale(k, k);
  if (flat) ctx.fillStyle = flat;
  else {
    const g = ctx.createLinearGradient(0, 14, 0, 110);
    g.addColorStop(0, "#5FD9EA"); g.addColorStop(1, "#2E6FEA");
    ctx.fillStyle = g;
  }
  ["M58 56 C44 44 30 42 14 32 C24 48 26 56 40 62 C47 65 53 63 58 60 Z",
   "M62 56 C76 44 90 42 106 32 C96 48 94 56 80 62 C73 65 67 63 62 60 Z",
   "M60 78 C55 90 51 99 49 109 C57 100 58 97 60 91 C62 97 63 100 71 109 C69 99 65 90 60 78 Z",
   "M60 46 C70 46 75 56 75 66 C75 78 68 86 60 86 C52 86 45 78 45 66 C45 56 50 46 60 46 Z",
   "M54 33 C56 24 59 22 58 15 C62 21 61 27 62 32 Z",
   "M63 33 C65 25 68 23 68 17 C70 24 68 29 66 33 Z",
  ].forEach((d) => ctx.fill(new Path2D(d)));
  ctx.beginPath(); ctx.arc(60, 44, 13, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawStory(canvas, bg, text, handle, label) {
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  paintBg(ctx, W, H, bg);
  const light = bg.text && bg.text !== "#fff" && bg.text !== "#ffffff";
  const ink = light ? "#0C1A33" : "#FFFFFF";
  const accent = light ? "#1F5FE6" : "#3FD0E6";
  const X = 96;

  // fênix marca d'água, sangrando pela borda direita
  ctx.save();
  ctx.globalAlpha = light ? 0.09 : 0.12;
  drawPhoenixEmblem(ctx, W + 70, H - 760, 5.2, ink);
  ctx.restore();

  // selo do topo: traço + categoria + data
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = accent; ctx.fillRect(X, 148, 48, 5);
  const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
  ctx.fillStyle = ink; ctx.globalAlpha = 0.85;
  ctx.font = "700 30px 'Space Mono','Inter',monospace";
  try { ctx.letterSpacing = "6px"; } catch {}
  ctx.fillText(((label || "Linha").toUpperCase() + "  ·  " + dateStr.toUpperCase()), X, 212);
  try { ctx.letterSpacing = "0px"; } catch {}
  ctx.globalAlpha = 1;

  // frase em pôster, alinhada à esquerda
  let fs = 104;
  const setF = () => { ctx.font = `800 ${fs}px 'Bricolage Grotesque','Inter',Arial,sans-serif`; };
  setF();
  const maxW = W - X - 120;
  let lines = wrapText(ctx, text, maxW);
  while (lines.length > 8 && fs > 50) { fs -= 6; setF(); lines = wrapText(ctx, text, maxW); }
  const lh = fs * 1.14;
  const totalH = lines.length * lh;
  let y = Math.max(430, (H - totalH) / 2 - 40) + fs * 0.8;

  // a Linha: régua vertical ao lado do texto
  const ruleTop = y - fs * 0.82;
  const rg = ctx.createLinearGradient(0, ruleTop, 0, ruleTop + totalH);
  rg.addColorStop(0, "#3FD0E6"); rg.addColorStop(1, "#1F5FE6");
  ctx.fillStyle = rg;
  ctx.fillRect(X, ruleTop, 7, totalH - lh + fs);

  const TX = X + 44;
  ctx.fillStyle = ink;
  lines.forEach((l, i) => {
    if (i === lines.length - 1) {
      // última palavra em destaque
      const words = l.split(" ");
      const lastWord = words.pop();
      const before = words.length ? words.join(" ") + " " : "";
      ctx.fillStyle = ink; ctx.fillText(before, TX, y);
      ctx.fillStyle = accent; ctx.fillText(lastWord, TX + ctx.measureText(before).width, y);
      ctx.fillStyle = ink;
    } else {
      ctx.fillText(l, TX, y);
    }
    y += lh;
  });

  // assinatura, canto inferior esquerdo
  ctx.fillStyle = accent; ctx.fillRect(X, H - 252, 48, 5);
  ctx.fillStyle = ink;
  ctx.font = "400 88px 'Sacramento','Bricolage Grotesque',cursive";
  ctx.globalAlpha = 0.97; ctx.fillText("Cleiton Sampaio", X, H - 150); ctx.globalAlpha = 1;
  if (handle && handle.trim()) {
    const h = handle.trim().replace(/^@?/, "@");
    ctx.font = "600 31px 'Inter',Arial,sans-serif";
    ctx.globalAlpha = 0.7; ctx.fillText(h, X + 4, H - 92); ctx.globalAlpha = 1;
  }
}

function Stories({ weekComplete, handle, onHandle }) {
  const cats = [["todas", "Todas"], ["empresa", "Empresa"], ["diaadia", "Dia a dia"], ["recomeco", "Recomeço"]];
  const [cat, setCat] = useState("todas");
  const [pi, setPi] = useState(0);
  const [bgi, setBgi] = useState(0);
  const [custom, setCustom] = useState("");
  const [url, setUrl] = useState("");
  const [blob, setBlob] = useState(null);
  const [aviso, setAviso] = useState(null);

  const list = cat === "todas" ? PHRASES : PHRASES.filter((p) => p.cat === cat);
  const current = custom.trim() ? null : (list.length ? list[pi % list.length] : null);
  const frase = custom.trim() || (current ? current.text : "");
  const catNames = { empresa: "Empresa", diaadia: "Dia a dia", recomeco: "Recomeço" };
  const label = custom.trim()
    ? (custom.trim() === WEEK_PHRASE ? "Semana fechada" : "Minha frase")
    : (current ? catNames[current.cat] || "Linha" : "Linha");
  const bg = BGS[bgi];

  // Só redesenha quando a digitação PARA.
  // Antes o efeito dependia direto do texto: cada caractere redesenhava um canvas
  // de 1080x1920, com um laço de 2800 grãos, e ainda exportava PNG em base64.
  // Escrever uma frase no celular travava o aparelho.
  const [fraseDesenho, setFraseDesenho] = useState(frase);
  useEffect(() => {
    const t = setTimeout(() => setFraseDesenho(frase), 260);
    return () => clearTimeout(t);
  }, [frase]);

  useEffect(() => {
    const c = document.createElement("canvas");
    let vivo = true;

    const desenhar = () => {
      if (!vivo) return;
      drawStory(c, bg, fraseDesenho || " ", handle, label);
      try {
        setUrl(c.toDataURL("image/png"));
      } catch {
        /* canvas "sujo" — não deveria acontecer, tudo é desenhado na mão */
      }
      // Guarda o Blob junto: é dele que sai o compartilhamento nativo do celular.
      c.toBlob((b) => vivo && setBlob(b), "image/png");
    };

    desenhar();

    if (document.fonts?.load) {
      Promise.all([
        document.fonts.load("800 84px 'Bricolage Grotesque'"),
        document.fonts.load("400 96px 'Sacramento'"),
        document.fonts.load("700 30px 'Space Mono'"),
      ])
        .then(desenhar)
        .catch(() => {});
    }

    return () => { vivo = false; };
  }, [fraseDesenho, bgi, handle, label]); // eslint-disable-line

  const nextPhrase = () => { setCustom(""); setPi((i) => i + 1); };
  const useWeek = () => { setCustom(WEEK_PHRASE); setBgi(BGS.findIndex((b) => b.name === "Fênix")); };

  // Salvar a imagem.
  // O jeito antigo (<a download> com data: URL) é ignorado pelo Safari e, dentro
  // de um PWA instalado, ainda tentava navegar pra fora do app. No celular, o
  // caminho certo é o compartilhamento nativo — que ainda joga direto no Instagram.
  const save = async () => {
    if (!blob) return;
    setAviso(null);

    const arquivo = new File([blob], "story-linha.png", { type: "image/png" });

    if (navigator.canShare?.({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo] });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return; // a pessoa fechou a folha de compartilhar
      }
    }

    try {
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "story-linha.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 4000);
    } catch {
      setAviso("Não consegui salvar sozinho. Segura o dedo na imagem e escolhe “Salvar imagem”.");
    }
  };

  return (
    <section className="stories">
      {weekComplete && (
        <div className="weekstory">
          <span className="wseye">Você fechou a semana</span>
          <p className="wstext">Sua semana virou um story. Gera e posta o recorde.</p>
          <button className="wsbtn" onClick={useWeek}>Usar a frase da semana</button>
        </div>
      )}
      <div className="storypreview">
        {url ? <img src={url} alt="prévia do story" /> : <div className="storyload">gerando…</div>}
      </div>
      <section className="card">
        <span className="ctrllabel">Frase</span>
        <div className="chips">
          {cats.map(([v, l]) => <button key={v} className={"chip" + (cat === v ? " chip-on" : "")} onClick={() => { setCat(v); setPi(0); setCustom(""); }}>{l}</button>)}
        </div>
        <button className="bigbtn" onClick={nextPhrase}>Trocar frase ↻</button>
        <span className="ctrllabel">Ou escreva a sua</span>
        <textarea className="storyinput" value={custom} placeholder="Deixa em branco pra usar as frases prontas" onChange={(e) => setCustom(e.target.value)} />
      </section>
      <section className="card">
        <span className="ctrllabel">Fundo</span>
        <div className="bgrow">
          {BGS.map((b, i) => <button key={i} className={"bgsw" + (bgi === i ? " bgsw-on" : "")} style={swStyle(b)} onClick={() => setBgi(i)} aria-label={b.name} />)}
        </div>
        <span className="ctrllabel">Seu @ do Instagram (aparece no story)</span>
        {/* Sem autocapitalize o teclado do celular manda "@Cleiton" — e o erro ia
            queimado dentro da imagem. */}
        <input
          className="handleinput"
          value={handle}
          placeholder="@cleitonsampaio"
          onChange={(e) => onHandle(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-label="Seu @ do Instagram"
        />
      </section>
      <button className="savebtn" onClick={save} disabled={!blob}>Salvar no celular</button>
      {aviso && <p className="savehint" role="status">{aviso}</p>}
      <p className="savehint">Também dá pra segurar o dedo na imagem lá em cima e escolher “Salvar imagem”.</p>
    </section>
  );
}

function BarrierTool({ onWin, count }) {
  const Qs = [
    "Se um amigo te contasse isso, o que você diria pra ele?",
    "Qual a menor parte disso que dá pra resolver em 10 minutos?",
    "O que exatamente te trava aqui? Escreve numa frase.",
    "Isso vai importar daqui a uma semana? E daqui a um ano?",
    "O que você faria agora se soubesse que não ia dar errado?",
  ];
  const [barrier, setBarrier] = useState("");
  const [step, setStep] = useState("");
  const [qi] = useState(() => Math.floor(Math.random() * Qs.length));
  const [won, setWon] = useState(false);

  if (won) return (
    <section className="card barrier">
      <div className="secthead nobord"><h2>Vencer uma barreira</h2>{count > 0 && <span className="tally">{count} vencidas</span>}</div>
      <div className="barrierwin">Boa. Mais uma pra trás. Cada barreira que você encara te deixa mais forte pra próxima.</div>
      <button className="barrierreset" onClick={() => { setBarrier(""); setStep(""); setWon(false); }}>Encarar outra</button>
    </section>
  );

  return (
    <section className="card barrier">
      <div className="secthead nobord"><h2>Vencer uma barreira</h2>{count > 0 && <span className="tally">{count} vencidas</span>}</div>
      <p className="sectnote">Nomeia o que tá travando, encolhe até virar um passo pequeno, e dá esse passo.</p>
      <label className="flabel">O que tá te travando?</label>
      <textarea className="storyinput" value={barrier} placeholder="Ex.: tô empurrando a proposta da Red faz dias" onChange={(e) => setBarrier(e.target.value)} />
      {barrier.trim() && (
        <>
          <div className="barrierq">{Qs[qi]}</div>
          <label className="flabel">Qual o menor passo pra hoje?</label>
          <textarea className="storyinput" value={step} placeholder="Ex.: abrir o arquivo e escrever só o título" onChange={(e) => setStep(e.target.value)} />
          <button className="barrierbtn" disabled={!step.trim()} onClick={() => { onWin(); setWon(true); }}>Dei o passo</button>
        </>
      )}
    </section>
  );
}

function ReadingCard({ reading, onStart, onRead, onNew }) {
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("");
  const [pages, setPages] = useState("");
  const hasBook = reading.title && reading.total > 0;
  const finishedNow = hasBook && reading.page >= reading.total;
  const pct = hasBook ? Math.min(100, Math.round((reading.page / reading.total) * 100)) : 0;
  const readToday = reading.lastReadDate === iso();

  return (
    <section className="card readcard">
      <div className="secthead nobord"><h2>Leitura</h2><span className="tally">{reading.finished > 0 ? `${reading.finished} ${reading.finished === 1 ? "livro lido" : "livros lidos"}` : "+5 XP por dia"}</span></div>
      {!hasBook ? (
        <>
          <p className="sectnote">Dez páginas por dia viram mais de dez livros num ano. Qual é o da vez?</p>
          <label className="flabel">Livro</label>
          <input className="readinput" value={title} placeholder="Ex.: Hábitos Atômicos" onChange={(e) => setTitle(e.target.value)} />
          <div className="frow">
            <div><label className="flabel">Total de páginas</label><input className="readinput" type="number" value={total} placeholder="320" onChange={(e) => setTotal(e.target.value)} /></div>
          </div>
          <button className="readbtn" disabled={!title.trim() || !(+total > 0)} onClick={() => { onStart(title, +total); setTitle(""); setTotal(""); }}>Começar o livro</button>
        </>
      ) : finishedNow ? (
        <>
          <div className="readdone">Você terminou <strong>{reading.title}</strong>. Mais um pra conta. +25 XP.</div>
          <button className="readbtn" onClick={onNew}>Começar outro livro</button>
        </>
      ) : (
        <>
          <p className="readtitle">{reading.title}</p>
          <div className="barlabel"><span>página {reading.page} de {reading.total}</span><span className="barnum">{pct}%</span></div>
          <div className="track"><div className="fillblue" style={{ width: pct + "%" }} /></div>
          <div className="readbtns">
            <button className="readquick" onClick={() => onRead(5)}>+5 pág</button>
            <button className="readquick" onClick={() => onRead(10)}>+10 pág</button>
            <input className="readinput readnum" type="number" value={pages} placeholder="nº" onChange={(e) => setPages(e.target.value)} />
            <button className="readquick alt" onClick={() => { if (+pages > 0) { onRead(+pages); setPages(""); } }}>Registrar</button>
          </div>
          {readToday && <p className="readtoday">✓ Você leu hoje. Amanhã tem mais.</p>}
        </>
      )}
    </section>
  );
}

function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [why, setWhy] = useState("");
  const [kg, setKg] = useState("");
  const [goalKg, setGoalKg] = useState("");
  const done = () => onFinish({
    goal: goal.trim(), why: why.trim(),
    kg: parseFloat(String(kg).replace(",", ".")) || null,
    goalKg: parseFloat(String(goalKg).replace(",", ".")) || null,
  });
  return (
    <div className="onb">
      <div className="onbcard">
        <div className="onbdots">{[0, 1, 2].map((i) => <span key={i} className={"onbdot" + (i === step ? " onbdot-on" : "")} />)}</div>
        {step === 0 && (
          <div className="onbstep">
            <PhoenixMascot mood="cheer" />
            <h2 className="onbh">Bem-vindo à Linha</h2>
            <p className="onbp">Aqui a regra é uma só: três vitórias por dia, sem se cobrar além disso. O resto do app existe pra te ajudar a fechar essas três.</p>
            <button className="onbbtn" onClick={() => setStep(1)}>Começar</button>
          </div>
        )}
        {step === 1 && (
          <div className="onbstep">
            <h2 className="onbh">Seu norte</h2>
            <p className="onbp">Isso fica no topo do app pros dias difíceis. Pode ajustar depois.</p>
            <label className="flabel">Onde você quer chegar?</label>
            <textarea className="onbinput" value={goal} placeholder="Ex.: fazer minha empresa crescer e chegar aos 62kg com saúde" onChange={(e) => setGoal(e.target.value)} />
            <label className="flabel">Por que isso importa?</label>
            <textarea className="onbinput" value={why} placeholder="Ex.: dar uma vida melhor pra minha família" onChange={(e) => setWhy(e.target.value)} />
            <button className="onbbtn" onClick={() => setStep(2)}>Continuar</button>
            <button className="onbskip" onClick={() => setStep(2)}>Preencho depois</button>
          </div>
        )}
        {step === 2 && (
          <div className="onbstep">
            <h2 className="onbh">Sua meta de peso</h2>
            <p className="onbp">O app acompanha sua evolução semana a semana, num ritmo saudável.</p>
            {/* type=text + teclado decimal: no type=number o navegador descartava
                "52,5" e o parseFloat nunca via nada. */}
            <div className="frow">
              <div><label className="flabel" htmlFor="onb-kg">Peso atual (kg)</label><input id="onb-kg" className="onbinput" type="text" inputMode="decimal" value={kg} placeholder="52,5" onChange={(e) => setKg(e.target.value)} /></div>
              <div><label className="flabel" htmlFor="onb-meta">Meta (kg)</label><input id="onb-meta" className="onbinput" type="text" inputMode="decimal" value={goalKg} placeholder="62" onChange={(e) => setGoalKg(e.target.value)} /></div>
            </div>
            <button className="onbbtn" onClick={done}>Entrar no app</button>
            <p className="onbfirst">Primeira missão lá dentro: escrever sua primeira vitória de hoje.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Guides() {
  const [cat, setCat] = useState("todas");
  const [open, setOpen] = useState(null);
  const list = cat === "todas" ? GUIDES : GUIDES.filter((g) => g.cat === cat);
  const catName = Object.fromEntries(GUIDE_CATS);
  return (
    <section className="guides">
      <p className="guidesintro">Técnicas que funcionam de verdade, com o porquê e o passo a passo. Escolhe uma e testa por uma semana antes de somar outra.</p>
      <div className="chips guidechips">
        {GUIDE_CATS.map(([v, l]) => <button key={v} className={"chip" + (cat === v ? " chip-on" : "")} onClick={() => { setCat(v); setOpen(null); }}>{l}</button>)}
      </div>
      <div className="guidelist">
        {list.map((g, i) => {
          const isOpen = open === g.title;
          return (
            <div key={g.title} className={"guide" + (isOpen ? " guide-open" : "")}>
              <button className="guidehead" onClick={() => setOpen(isOpen ? null : g.title)}>
                <span className="guidecat">{catName[g.cat]}</span>
                <span className="guidetitle">{g.title}</span>
                <span className="guidechev">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="guidebody">
                  <p className="guidewhy">{g.why}</p>
                  <ol className="guidesteps">
                    {g.steps.map((st, j) => <li key={j}>{st}</li>)}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="guidesfoot">Regra de ouro: uma técnica bem usada vale mais que dez conhecidas. E se o desânimo pesar por semanas, procura um profissional. Isso também é técnica de gente forte.</p>
    </section>
  );
}

function SosModal({ onBreath, onClose }) {  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheethandle" />
        <h3 className="sheeth">Dia difícil</h3>
        <p className="sostext">Tá tudo bem não estar bem. Você não precisa resolver a vida hoje. Agora, só três coisas pequenas:</p>
        <div className="sossteps">
          <button className="sosstep" onClick={onBreath}><span className="sosnum">1</span><span>Respira um minuto comigo. Só isso.</span></button>
          <div className="sosstep"><span className="sosnum">2</span><span>Faz uma coisinha só: um copo d'água, abrir a janela, levantar da cama.</span></div>
          <div className="sosstep"><span className="sosnum">3</span><span>Manda uma mensagem pra alguém de confiança. Não precisa explicar tudo, só um "oi, tô num dia ruim".</span></div>
        </div>
        <div className="sosnote">
          <p>Se esse peso durar semanas, tirar seu sono, sua fome ou sua vontade de viver, procura um médico ou psicólogo. Isso não é fraqueza, é o passo mais forte que existe.</p>
          <p>No Brasil, o CVV escuta você de graça, a qualquer hora: <strong>ligue 188</strong> ou acesse cvv.org.br.</p>
        </div>
        <button className="cancel" onClick={onClose}>Voltar</button>
      </div>
    </div>
  );
}

function BreathingModal({ onClose }) {
  const phases = ["Inspira", "Segura", "Expira", "Segura"];

  // Um contador só. Antes o `setCycles` era chamado de DENTRO do updater do
  // `setIdx` — o React pode reexecutar essas funções, e efeito colateral ali
  // dentro é receita de contagem errada. A fase e o ciclo agora saem do mesmo tick.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const idx = tick % 4;
  const cycles = Math.floor(tick / 4);

  return (
    <div className="breatheoverlay" onClick={onClose}>
      <div className="breathe" onClick={(e) => e.stopPropagation()}>
        <div className="breathecircle"><span>{phases[idx]}</span></div>
        <p className="breathecount">{cycles} {cycles === 1 ? "ciclo" : "ciclos"}</p>
        <p className="breathehint">Acompanha o círculo. 4 segundos em cada fase.</p>
        <button className="breatheclose" onClick={onClose}>Pronto</button>
      </div>
    </div>
  );
}

const LEVEL_TITLES = ["Início", "Constante", "Focado", "Disciplinado", "Imparável", "Fênix"];

const ontemIso = () => { const d = new Date(); d.setDate(d.getDate() - 1); return iso(d); };
const anteontemIso = () => { const d = new Date(); d.setDate(d.getDate() - 2); return iso(d); };

const sortItems = (a) => [...a].sort((x, y) => x.t.localeCompare(y.t));
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; };
const prettyDate = () => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const genId = () => "x" + Date.now().toString(36) + Math.floor(Math.random() * 999);
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const hmNow = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const buzz = (ms = 12) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

export default function Linha({ usuario, onSair, onAdmin }) {
  // O estado agora é do hook: ele junta o aparelho com o servidor, grava local na
  // hora, empurra pro servidor com calma e vira o dia sozinho à meia-noite.
  const { s, setS, carregando, situacao } = useEstadoSincronizado(usuario);

  const [editing, setEditing] = useState(null);
  const [wInput, setWInput] = useState("");
  const [wGoalDraft, setWGoalDraft] = useState(null);
  const [wAviso, setWAviso] = useState(null);
  const [focusSecs, setFocusSecs] = useState(0);
  const [focusRun, setFocusRun] = useState(false);
  const [focusDone, setFocusDone] = useState(false);
  const [phIndex, setPhIndex] = useState(() => new Date().getDate() % CHEER.length);
  const [tab, setTab] = useState("hoje");
  const [breath, setBreath] = useState(false);
  const [sos, setSos] = useState(false);
  const [splash, setSplash] = useState(true);
  const [installEvt, setInstallEvt] = useState(null);
  const [iosHint, setIosHint] = useState(false);
  const [showInstall, setShowInstall] = useState(true);
  const [iosOpen, setIosOpen] = useState(false);
  const [nowHM, setNowHM] = useState(hmNow());
  const [burst, setBurst] = useState(false);
  const [xpGain, setXpGain] = useState(null);
  const [menu, setMenu] = useState(false);
  const [confirmarDia, setConfirmarDia] = useState(false);
  const [legado, setLegado] = useState(null);
  const [iaAtiva, setIaAtiva] = useState(false);

  // A IA (personal/nutri) só liga se o servidor tiver a chave. Pergunta uma vez.
  useEffect(() => {
    api.iaStatus().then((r) => setIaAtiva(!!r?.ativa)).catch(() => setIaAtiva(false));
  }, []);

  const focusFim = useRef(0);
  const focusLen = useRef(0);
  const touchRef = useRef(null);

  // ── Dados da versão sem login que ficaram neste aparelho.
  // Não são importados sozinhos: entregar automaticamente pro primeiro que logar
  // seria servir o histórico de uma pessoa pra outra. Quem decide é o usuário.
  useEffect(() => {
    if (carregando || !s) return;
    if (s.history?.length || s.xp > 0) return; // já tem vida própria; não oferece nada
    setLegado(lerLegado());
  }, [carregando, !!s]);

  // ── Modo foco, pelo relógio de parede.
  // O anterior encadeava setTimeout de 1s: com a tela bloqueada, o navegador
  // congela o timer e o bloco de 25 min nunca fechava. Agora o fim é um instante
  // fixo, e a conta é sempre "quanto falta pra aquele instante".
  useEffect(() => {
    if (!focusRun) return;

    const conferir = () => {
      const faltam = Math.max(0, Math.round((focusFim.current - Date.now()) / 1000));
      setFocusSecs(faltam);

      if (faltam <= 0) {
        setFocusRun(false);
        setFocusDone(true);
        buzz([14, 50, 14]);
        if (focusLen.current >= 1500) {
          setXpGain({ n: 5, k: Date.now() });
          setS((x) => (x ? { ...x, xp: (x.xp || 0) + 5 } : x));
        }
        focusLen.current = 0;
      }
    };

    conferir();
    const id = setInterval(conferir, 500);
    // Voltou pro app depois de a tela apagar: recalcula na hora, sem esperar o tick.
    document.addEventListener("visibilitychange", conferir);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", conferir);
    };
  }, [focusRun, setS]);

  const vitDone = s ? s.vitorias.filter((v) => v.done).length : 0;
  useEffect(() => {
    if (!s) return;
    if (vitDone === 3 && s.lastDoneDate !== iso()) {
      setS((x) => {
        let shields = x.shields || 0;
        let streak;
        if (x.lastDoneDate === ontemIso()) streak = x.streak + 1;
        else if (x.lastDoneDate === anteontemIso() && shields > 0) { streak = x.streak + 1; shields -= 1; }
        else streak = 1;
        if (streak > 0 && streak % 7 === 0) shields = Math.min(shields + 1, 2);
        return { ...x, lastDoneDate: iso(), streak, streakRecord: Math.max(x.streakRecord || 0, streak), shields, xp: (x.xp || 0) + 20 };
      });
    }
  }, [vitDone]); // eslint-disable-line

  // ── O toast de "+XP" some sozinho.
  // Antes ele só saía no onAnimationEnd. Quem liga "reduzir movimento" no celular
  // mata as animações — e o evento nunca disparava: o toast ficava preso na tela
  // pra sempre, tapando o app.
  useEffect(() => {
    if (!xpGain) return;
    const t = setTimeout(() => setXpGain(null), 1600);
    return () => clearTimeout(t);
  }, [xpGain]);

  // ── Trava o fundo enquanto um modal está aberto.
  // Sem isso, arrastar sobre o modal rolava a página atrás dele no iPhone.
  const modalAberto = !!editing || breath || sos || (s && !s.onboarded);
  useEffect(() => {
    if (!modalAberto) return;
    const y = window.scrollY;
    const { style } = document.body;
    const antes = { position: style.position, top: style.top, width: style.width };

    style.position = "fixed";
    style.top = `-${y}px`;
    style.width = "100%";

    return () => {
      style.position = antes.position;
      style.top = antes.top;
      style.width = antes.width;
      window.scrollTo(0, y);
    };
  }, [modalAberto]);

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1200);
    const onBip = (e) => { e.preventDefault(); setInstallEvt(e); };
    const onInstalled = () => { setInstallEvt(null); setShowInstall(false); };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
    const standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone;
    if (isIOS && !standalone) setIosHint(true);
    if (standalone) setShowInstall(false);
    return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onBip); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  useEffect(() => { const id = setInterval(() => setNowHM(hmNow()), 30000); return () => clearInterval(id); }, []);

  const prevVit = useRef(-1);
  useEffect(() => {
    if (!s) return;
    const was = prevVit.current;
    prevVit.current = vitDone;
    if (was === -1) return; // primeira leitura depois de carregar: só registra
    if (was < 3 && vitDone === 3) {
      setBurst(true); buzz([16, 60, 24]);
      if (s.lastDoneDate !== iso()) setXpGain({ n: 20, k: Date.now() });
      const t = setTimeout(() => setBurst(false), 1500);
      return () => clearTimeout(t);
    }
  }, [vitDone, carregando]); // eslint-disable-line

  if (!s || carregando) return <div style={{ ...shell, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: "Inter,sans-serif" }}>Puxando seu dia…</div>;

  const meals = s.items.filter((i) => i.kind === "meal");
  const kcal = meals.filter((m) => m.done).reduce((a, m) => a + (+m.kcal || 0), 0);
  const prot = meals.filter((m) => m.done).reduce((a, m) => a + (+m.prot || 0), 0);
  const blocksDone = s.items.filter((i) => i.kind === "block" && i.done).length;
  const blocksTotal = s.items.filter((i) => i.kind === "block").length;
  const mealsDone = meals.filter((m) => m.done).length;
  const kcalPct = Math.min(100, Math.round((kcal / KCAL_META) * 100));
  const protPct = Math.min(100, Math.round((prot / PROT_META) * 100));
  const locLabel = { escritorio: "Escritório", casa: "Casa", cliente: "Cliente" }[s.location];
  const lowEnergy = s.energy != null && s.energy <= 4;
  const heroSub = vitDone === 3 ? "Dia fechado. Você venceu o hoje."
    : lowEnergy ? "Hoje vale meia bateria. Uma vitória já conta."
    : `${3 - vitDone === 3 ? "Três vitórias te esperando." : `Falta${3 - vitDone === 1 ? "" : "m"} ${3 - vitDone} vitória${3 - vitDone === 1 ? "" : "s"} pra fechar o dia.`}`;
  const phMood = vitDone === 3 ? "happy" : lowEnergy ? "soft" : "cheer";
  const phMsg = phMood === "happy" ? HAPPY[phIndex % HAPPY.length] : phMood === "soft" ? SOFT[phIndex % SOFT.length] : CHEER[phIndex % CHEER.length];

  const log = s.weight.log;
  // Antes o padrão trazia uma pesagem falsa de 52 kg. Agora o log nasce vazio, e
  // enquanto não houver pesagem o cartão de peso mostra o convite em vez de números
  // inventados.
  const temPeso = log.length > 0;
  const wStart = log[0]?.kg ?? 0;
  const wNow = log[log.length - 1]?.kg ?? 0;
  const wGoal = s.weight.goal;
  const wGained = temPeso ? +(wNow - wStart).toFixed(1) : 0;
  const wToGo = temPeso ? +(wGoal - wNow).toFixed(1) : 0;
  const wPct = temPeso ? Math.max(0, Math.min(100, Math.round(((wNow - wStart) / (wGoal - wStart || 1)) * 100))) : 0;

  // ── semana (últimos 7 dias, hoje ao vivo)
  const today = iso();
  const dates = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return iso(d); });
  const hmap = Object.fromEntries((s.history || []).map((h) => [h.date, h]));
  const liveSnap = fotografar({ ...s, currentDate: today });
  if (ativo(liveSnap) || !hmap[today]) hmap[today] = liveSnap;
  const week = dates.map((d) => hmap[d] || { date: d, vit: 0, blocks: 0, kcal: 0, prot: 0, energy: null, closed: false });
  const daysClosed = week.filter((w) => w.closed).length;
  const eVals = week.filter((w) => w.energy != null).map((w) => w.energy);
  const avgEnergy = eVals.length ? eVals.reduce((a, b) => a + b, 0) / eVals.length : null;
  const kVals = week.filter((w) => w.kcal > 0).map((w) => w.kcal);
  const avgKcal = kVals.length ? Math.round(kVals.reduce((a, b) => a + b, 0) / kVals.length) : null;
  const wkEntries = log.filter((e) => e.date >= dates[0]);
  const wWeekDelta = wkEntries.length > 1 ? +(wNow - wkEntries[0].kg).toFixed(1) : 0;
  const daysUsed = week.filter((w) => ativo(w)).length;

  const up = (p) => setS((x) => ({ ...x, ...p }));
  const setVit = (id, p) => { if (p.done) buzz(); setS((x) => ({ ...x, vitorias: x.vitorias.map((v) => v.id === id ? { ...v, ...p } : v) })); };
  const toggle = (id) => { buzz(); setS((x) => ({ ...x, items: x.items.map((i) => i.id === id ? { ...i, done: !i.done } : i) })); };
  const nextTip = () => setS((x) => ({ ...x, tipIndex: (x.tipIndex + 1) % TIPS.length }));
  const setWhy = (v) => setS((x) => ({ ...x, why: v }));
  const setObjective = (v) => setS((x) => ({ ...x, goal: v }));
  const setHandle = (v) => setS((x) => ({ ...x, handle: v }));
  const addWater = (n) => { if (n > 0) buzz(8); setS((x) => ({ ...x, water: Math.max(0, Math.min(12, (x.water || 0) + n)) })); };
  const setSleep = (v) => setS((x) => ({ ...x, sleep: v }));
  const setGratitude = (v) => setS((x) => ({ ...x, gratitude: v }));
  const setWeekPriority = (v) => setS((x) => ({ ...x, weekPriority: { wk: chaveSemana(), text: v } }));
  const startBook = (title, total) => setS((x) => ({ ...x, reading: { ...x.reading, title: title.trim(), total: Math.max(1, total | 0), page: 0 } }));
  const readPages = (n) => {
    if (!n || n <= 0 || !s) return;
    buzz(8);
    const r0 = s.reading || {};
    const firstToday = r0.lastReadDate !== iso();
    const willFinish = r0.total > 0 && (r0.page || 0) < r0.total && (r0.page || 0) + n >= r0.total;
    if (firstToday) setXpGain({ n: 5, k: Date.now() });
    if (willFinish) {
      setBurst(true); setTimeout(() => setBurst(false), 1500);
      setTimeout(() => setXpGain({ n: 25, k: Date.now() + 1 }), firstToday ? 1100 : 0);
    }
    setS((x) => {
      const r = { ...x.reading };
      let xp = x.xp || 0;
      const wasPage = r.page || 0;
      if (r.lastReadDate !== iso()) { xp += 5; r.lastReadDate = iso(); }

      // Só conta o que realmente avançou. Num livro de 300 páginas, estando na
      // 298 e clicando "+10", quem lê 2 páginas não pode ganhar 10 no acumulado.
      const avanco = r.total > 0 ? Math.max(0, Math.min(n, r.total - wasPage)) : n;

      r.page = Math.min(r.total || 999999, wasPage + n);
      r.pagesAllTime = (r.pagesAllTime || 0) + avanco;
      if (r.total > 0 && wasPage < r.total && r.page >= r.total) { r.finished = (r.finished || 0) + 1; xp += 25; }
      return { ...x, reading: r, xp };
    });
  };
  const newBook = () => setS((x) => ({ ...x, reading: { ...x.reading, title: "", total: 0, page: 0 } }));
  const doInstall = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch {} setInstallEvt(null); setShowInstall(false); };
  const winBarrier = () => { buzz(); setXpGain({ n: 10, k: Date.now() }); setS((x) => ({ ...x, barriersWon: (x.barriersWon || 0) + 1, xp: (x.xp || 0) + 10 })); };
  const doChallenge = () => { if (s.challengeDoneDate === iso()) return; buzz(); setXpGain({ n: 15, k: Date.now() }); setS((x) => ({ ...x, challengeDoneDate: iso(), xp: (x.xp || 0) + 15 })); };
  const goTab = (t) => { setTab(t); try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {} };
  const onTouchStart = (e) => { const t = e.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    const s0 = touchRef.current; touchRef.current = null;
    if (!s0 || editing || breath || sos || (s && !s.onboarded)) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s0.x, dy = t.clientY - s0.y;
    if (Math.abs(dx) > 72 && Math.abs(dy) < 48) {
      const order = ["hoje", "treino", "dicas", "stories"];
      const i = order.indexOf(tab);
      const ni = dx < 0 ? Math.min(order.length - 1, i + 1) : Math.max(0, i - 1);
      if (ni !== i) { buzz(6); goTab(order[ni]); }
    }
  };
  const scrollToSec = (id) => { try { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {} };
  const finishOnboarding = (data) => {
    setS((x) => {
      const w = { ...x.weight };
      if (data.kg) w.log = [{ date: iso(), kg: data.kg }];
      if (data.goalKg) w.goal = data.goalKg;
      return { ...x, onboarded: true, journeyStart: iso(), goal: data.goal ?? x.goal, why: data.why ?? x.why, weight: w };
    });
  };
  const trocarSenha = async () => {
    const atual = window.prompt("Sua senha atual:");
    if (!atual) return;

    const nova = window.prompt("Nova senha (mínimo 10 caracteres, com letra e número):");
    if (!nova) return;

    try {
      const r = await api.trocarSenha(atual, nova);
      window.alert(r.mensagem);
    } catch (e) {
      window.alert(e.message);
    }
  };

  const exportData = () => {
    try {
      const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `linha-backup-${iso()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch {}
  };

  const importData = (file) => {
    if (!file) return;

    const rd = new FileReader();
    rd.onerror = () => window.alert("Não consegui ler esse arquivo.");
    rd.onload = () => {
      let d;
      try {
        d = JSON.parse(rd.result);
      } catch {
        window.alert("Esse arquivo não é um backup do Linha.");
        return;
      }

      // O backup baixado do servidor vem embrulhado em { app, data }. O antigo
      // era o estado cru. Aceita os dois.
      const bruto = d?.app === "linha" && d.data ? d.data : d;
      if (!bruto || typeof bruto !== "object" || !Array.isArray(bruto.items)) {
        window.alert("Esse arquivo não é um backup do Linha.");
        return;
      }

      // Normaliza ANTES de olhar pro conteúdo: um backup com `weight` sem `log`
      // derrubava o app numa tela branca.
      const novo = normalizar({ ...bruto, onboarded: true });
      const dias = novo.history?.length || 0;

      const ok = window.confirm(
        `Isso substitui TUDO que está aqui pelos dados do arquivo ` +
          `(${dias} ${dias === 1 ? "dia" : "dias"} de histórico, ${novo.xp} XP).\n\n` +
          `Os seus dados de agora vão ser perdidos. Continuar?`
      );
      if (!ok) return;

      setS(() => novo);
    };
    rd.readAsText(file);
  };

  const startFocus = (secs) => {
    focusLen.current = secs;
    focusFim.current = Date.now() + secs * 1000; // instante de término, não contagem
    setFocusSecs(secs);
    setFocusDone(false);
    setFocusRun(true);
  };
  const stopFocus = () => { focusFim.current = 0; setFocusRun(false); setFocusSecs(0); setFocusDone(false); };
  // Pausar congela o que falta; retomar remarca o instante de término a partir de agora.
  const pausarFoco = () => { setFocusSecs(Math.max(0, Math.round((focusFim.current - Date.now()) / 1000))); setFocusRun(false); };
  const retomarFoco = () => { focusFim.current = Date.now() + focusSecs * 1000; setFocusRun(true); };

  const saveItem = (d) => {
    setS((x) => {
      const exists = x.items.some((i) => i.id === d.id);
      const items = exists ? x.items.map((i) => i.id === d.id ? d : i) : [...x.items, d];
      return { ...x, items: sortItems(items) };
    });
    setEditing(null);
  };
  const deleteItem = (id) => { setS((x) => ({ ...x, items: x.items.filter((i) => i.id !== id) })); setEditing(null); };

  // O campo de peso agora é texto com teclado decimal, então "52,5" chega inteiro
  // aqui. Antes era type=number: o navegador descartava o valor com vírgula e o
  // .replace(",", ".") nunca via nada — quem digita vírgula (todo brasileiro)
  // simplesmente não conseguia registrar o peso.
  const logWeight = () => {
    const kg = parseFloat(String(wInput).replace(",", "."));

    if (!Number.isFinite(kg)) return setWAviso({ tipo: "erro", txt: "Escreve só o número. Ex.: 52,5" });
    if (kg < 30 || kg > 200) return setWAviso({ tipo: "erro", txt: "Peso fora do esperado (30 a 200 kg)." });

    setS((x) => {
      const t = iso();
      const outros = x.weight.log.filter((e) => e.date !== t); // uma pesagem por dia
      return {
        ...x,
        weight: { ...x.weight, log: [...outros, { date: t, kg }].sort((a, b) => a.date.localeCompare(b.date)) },
      };
    });

    setWInput("");
    setWAviso({ tipo: "ok", txt: `Registrado: ${kg} kg.` });
  };

  const setGoal = (v) => {
    const g = parseFloat(String(v).replace(",", "."));
    if (!Number.isFinite(g) || g < 40 || g > 150) {
      return setWAviso({ tipo: "erro", txt: "A meta precisa ficar entre 40 e 150 kg." });
    }
    setS((x) => ({ ...x, weight: { ...x.weight, goal: g } }));
    setWAviso({ tipo: "ok", txt: `Meta: ${g} kg.` });
  };

  // "Encerrar e começar um novo dia".
  //
  // Dois defeitos aqui, os dois corrigidos:
  //   1. Zerava vitórias, água, energia e gratidão num toque, sem perguntar nada.
  //      Agora exige uma confirmação em dois passos (setConfirmarDia).
  //   2. Usado no MESMO dia — que é o uso natural, já que o botão fica no
  //      "Relatório da noite" — arquivava hoje no histórico e passava a contar o
  //      dia (e as vitórias) em dobro. `arquivar` agora soma por diferença: o
  //      mesmo dia arquivado duas vezes conta uma vez só.
  const newDay = () => {
    stopFocus();
    setConfirmarDia(false);
    setS((x) => {
      const { history, lifetime } = arquivar(x);
      return {
        ...x,
        history,
        lifetime,
        currentDate: iso(),
        energy: null, water: 0, sleep: null, gratitude: "",
        tipIndex: (x.tipIndex + 1) % TIPS.length,
        vitorias: x.vitorias.map((v) => ({ ...v, text: "", done: false })),
        items: x.items.map((i) => ({ ...i, done: false })),
      };
    });
  };

  // leitura automática da semana
  const weekRead = () => {
    if (daysUsed < 2) return "Ainda tô juntando teus primeiros dias. Conforme você for usando, esse resumo vai ganhando corpo. Volta aqui no fim da semana.";
    let parts = [`Você fechou ${daysClosed} de 7 dias.`];
    if (avgEnergy != null) parts.push(`Energia média de ${avgEnergy.toFixed(1)} em 10.`);
    if (avgKcal != null) parts.push(`Média de ${avgKcal} kcal por dia, ${avgKcal >= KCAL_META ? "no alvo pra ganhar peso." : "um pouco abaixo do alvo."}`);
    if (wkEntries.length > 1) parts.push(`No peso, você ${wWeekDelta >= 0 ? "subiu" : "caiu"} ${Math.abs(wWeekDelta)} kg na semana.`);
    return parts.join(" ");
  };
  const weekClose = daysClosed >= 5 ? "Semana boa. Fechou bastante dia, continua assim."
    : daysClosed >= 2 ? "Boa base. Fecha mais um dia por semana e o ganho acelera."
    : "Semana difícil acontece. Sem drama, começa a próxima fechando um dia só.";

  const ach = [
    { got: (s.streakRecord || 0) >= 1, label: "Primeiro dia fechado" },
    { got: (s.streakRecord || 0) >= 3, label: "3 dias seguidos" },
    { got: (s.streakRecord || 0) >= 7, label: "7 dias seguidos" },
    { got: wGained >= 1, label: "Primeiro quilo" },
    { got: (s.barriersWon || 0) >= 1, label: "Barreira vencida" },
    { got: (s.barriersWon || 0) >= 10, label: "10 barreiras" },
    { got: ((s.reading && s.reading.finished) || 0) >= 1, label: "Primeiro livro" },
    { got: ((s.reading && s.reading.finished) || 0) >= 3, label: "3 livros" },
  ];

  const xp = s.xp || 0;
  const level = Math.floor(xp / 100) + 1;
  const levelInto = xp % 100;
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  const challengeToday = CHALLENGES[diaDoAno() % CHALLENGES.length];
  const challengeDone = s.challengeDoneDate === iso();
  let nowIdx = -1;
  s.items.forEach((it, i) => { if (it.t <= nowHM) nowIdx = i; });

  const journeyDay = Math.max(1, Math.floor((new Date(iso()) - new Date(s.journeyStart || iso())) / 86400000) + 1);

  // Os números da evolução vêm dos totais vitalícios, não do histórico guardado.
  // Antes eram somados a partir do `history`, que era cortado em 90 dias — do 91º
  // dia em diante os contadores ENCOLHIAM, como se o passado nunca tivesse existido.
  // Hoje o histórico ainda tem teto (é uma lista, precisa ter), mas os totais não.
  const hojeArquivado = (s.history || []).some((h) => h.date === today);
  const todayActive = s.energy != null || vitDone > 0 || mealsDone > 0;

  const daysShown = s.lifetime.dias + (todayActive && !hojeArquivado ? 1 : 0);
  const totalVit = s.lifetime.vitorias + (hojeArquivado ? 0 : vitDone);

  const evoLine = (s.streak === 0 && (s.streakRecord || 0) >= 2)
    ? "Perdeu a sequência, mas não perdeu o caminho. Recomeça hoje: o recorde continua sendo seu."
    : daysShown <= 1
    ? "Todo mundo começa no dia um. O seu já começou, e isso já te deixa à frente de ontem."
    : "Olha o quanto você já andou. Cada número aqui é prova de que você não tá parado.";

  return (
    <div style={shell} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <style>{css}</style>
      <div className="aurora" aria-hidden="true" />
      <div className="grao" aria-hidden="true" />
      {splash && (
        <div className="splash">
          <div className="splashinner">
            <PhoenixMascot mood="cheer" />
            <span className="splashword">Linha</span>
            <span className="splashtag">um passo de cada vez</span>
          </div>
        </div>
      )}
      <div className="wrap">
        <header className="head">
          <div className="headtop">
            <div className="brandmark">
              <PhoenixMascot mood="cheer" />
              <div className="brandtext"><span className="brand">Linha</span><span className="brandsub">copiloto de rotina</span></div>
            </div>
            <div className="headright">
              <LevelRing level={level} pct={levelInto} />
              <button className="headmenu" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Sua conta">
                <span className="headinicial">{(usuario?.nome || "?").trim().charAt(0).toUpperCase()}</span>
              </button>
            </div>
          </div>

          {menu && (
            <div className="conta">
              <p className="contanome">{usuario?.nome}</p>
              <p className="contaemail">{usuario?.email}</p>

              <div className="contabtns">
                {onAdmin && (
                  <button className="contabtn destaque" onClick={() => { setMenu(false); onAdmin(); }}>
                    Liberar acessos
                  </button>
                )}
                <button className="contabtn" onClick={exportData}>Baixar meus dados</button>
                <label className="contabtn">
                  Importar backup
                  <input type="file" accept="application/json,.json" style={{ display: "none" }}
                    onChange={(e) => { importData(e.target.files && e.target.files[0]); e.target.value = ""; }} />
                </label>
                <button className="contabtn" onClick={trocarSenha}>Trocar senha</button>
                <button className="contabtn sair" onClick={onSair}>Sair</button>
              </div>
            </div>
          )}
        </header>

        {/* O aparelho não deixou salvar. Nunca fingir que deu certo: se o usuário
            não souber, ele fecha o app achando que o dia dele está guardado. */}
        {situacao.erroLocal && (
          <div className="avisoruim" role="alert">
            {situacao.erroLocal === "sem-espaco"
              ? "A memória deste navegador encheu e eu não consigo salvar aqui. Baixe seus dados e libere espaço."
              : "Este navegador está bloqueando o armazenamento. Seus dados sobem pro servidor, mas o app não vai funcionar offline."}
          </div>
        )}

        {situacao.offline && (
          <div className="avisocalmo">Sem internet. Pode continuar — eu guardo tudo aqui e subo quando a rede voltar.</div>
        )}

        {/* Dados da versão sem login que ficaram neste aparelho. */}
        {legado && (
          <div className="legado">
            <p className="legadotxt">
              Achei dados do Linha antigo neste aparelho{legado.dias > 0 && <> ({legado.dias} {legado.dias === 1 ? "dia" : "dias"} de histórico)</>}. Quer trazer pra sua conta?
            </p>
            <div className="legadobtns">
              <button className="legadobtn destaque" onClick={() => { setS(() => normalizar({ ...legado.estado, onboarded: true })); descartarLegado(legado.chave); setLegado(null); }}>
                Trazer pra minha conta
              </button>
              <button className="legadobtn" onClick={() => { descartarLegado(legado.chave); setLegado(null); }}>
                Não é meu
              </button>
            </div>
          </div>
        )}

        {showInstall && (installEvt || iosHint) && (
          <div className="installbar">
            <div className="installrow">
              <span className="installtxt">Tenha o Linha como app no seu celular</span>
              {installEvt
                ? <button className="installbtn" onClick={doInstall}>Instalar</button>
                : <button className="installbtn" onClick={() => setIosOpen((o) => !o)}>Como instalar</button>}
              <button className="installx" onClick={() => setShowInstall(false)} aria-label="fechar">×</button>
            </div>
            {iosHint && iosOpen && <p className="installhint">No Safari, toque no botão Compartilhar e escolha “Adicionar à Tela de Início”.</p>}
          </div>
        )}

        {tab === "hoje" && (<>
        <section className="hero">
          {/* O nome vem de quem está logado. Antes era "Cleiton" fixo no código —
              com mais gente usando, o app chamava todo mundo pelo nome errado. */}
          <h1 className="hello herohello">{greeting()}, {(usuario?.nome || "").split(" ")[0]}.</h1>
          <p className="herodate">{prettyDate()}</p>
          <p className="herosub">{heroSub}</p>
          <div className="rings">
            <Ring pct={(vitDone / 3) * 100} from="#7FB0FF" to="#1F5FE6" label="vitórias" value={`${vitDone}/3`} onClick={() => scrollToSec("sec-vit")} />
            <Ring pct={((s.water || 0) / 8) * 100} from="#7FE3EE" to="#0FB5C7" label="água" value={`${s.water || 0}/8`} onClick={() => scrollToSec("sec-agua")} />
            <Ring pct={kcalPct} from="#FFD08A" to="#E88A2C" label="energia" value={`${kcalPct}%`} onClick={() => scrollToSec("sec-fuel")} />
          </div>
          {(s.streak > 0 || (s.shields || 0) > 0) && (
            <div className="herochips">
              {s.streak > 0 && <span className="streak"><span className="chama" aria-hidden="true">🔥</span>{s.streak} {s.streak === 1 ? "dia seguido" : "dias seguidos"}</span>}
              {(s.shields || 0) > 0 && <span className="shield"><span aria-hidden="true">🛡</span> {s.shields}</span>}
            </div>
          )}
        </section>
        <section className="card norte">
          <div className="nortehead"><span className="norteeye">Meu norte</span><span className="nortejorney">dia {journeyDay} da jornada</span></div>
          <label className="nlabel">Meu objetivo</label>
          <textarea className="ninput" value={s.goal} placeholder="Onde você quer chegar? Ex.: fazer a Fluxo faturar 50k por mês e chegar aos 62kg com saúde." onChange={(e) => setObjective(e.target.value)} />
          <label className="nlabel">Por que isso importa</label>
          <textarea className="ninput" value={s.why} placeholder="Ex.: dar uma vida melhor pra minha família e provar pra mim mesmo que sou capaz." onChange={(e) => setWhy(e.target.value)} />
        </section>

        <section className="card level">
          <div className="levelrow"><span className="levelnum">Nível {level}</span><span className="leveltitle">{levelTitle}</span></div>
          <div className="leveltrack"><div className="levelfill" style={{ width: levelInto + "%" }} /></div>
          <div className="levelfoot"><span className="levelxp">{xp} XP</span><span className="levelxp">faltam {100 - levelInto} pro nível {level + 1}</span></div>
        </section>

        <section className="tip">
          <div className="tiphead"><span className="tipeye">Pra se sentir bem</span><button className="tipnext" onClick={nextTip}>outra ↻</button></div>
          <p className="tiptext">{TIPS[s.tipIndex]}</p>
        </section>

        <section className="phcard">
          <span className="ember e1" /><span className="ember e2" /><span className="ember e3" /><span className="ember e4" /><span className="ember e5" />
          <PhoenixMascot mood={phMood} />
          <div className="phright">
            <span className="pheye">sua fênix</span>
            <div className="phbubble"><p className="phmsg">{phMsg}</p></div>
            <div className="phbtns">
              <button className="phbtn" onClick={() => setPhIndex((i) => i + 1)}>me motiva de novo ↻</button>
              <button className="phbtn" onClick={() => setBreath(true)}>respira 1 min</button>
              <button className="phbtn phbtn-sos" onClick={() => setSos(true)}>tô num dia difícil</button>
            </div>
          </div>
        </section>

        <section className="card">
          <p className="q">Sua energia hoje</p>
          <div className="energy">
            {[...Array(10)].map((_, i) => { const n = i + 1, on = s.energy != null && n <= s.energy; return <button key={n} className={"pip" + (on ? " pip-on" : "")} style={{ transitionDelay: (on ? i * 16 : 0) + "ms" }} onClick={() => { buzz(6); up({ energy: n }); }}>{n}</button>; })}
          </div>
          <p className="q q-gap">Quantas horas você dormiu?</p>
          <div className="seg">
            {["-6h", "6–7h", "7–8h", "8h+"].map((v) => (
              <button key={v} className={"segbtn" + (s.sleep === v ? " segbtn-on" : "")} onClick={() => setSleep(v)}>{v}</button>
            ))}
          </div>
          <p className="q q-gap">Onde você vai trabalhar</p>
          <div className="seg">
            {[["escritorio", "Escritório"], ["casa", "Casa"], ["cliente", "Cliente"]].map(([v, l]) => (
              <button key={v} className={"segbtn" + (s.location === v ? " segbtn-on" : "")} onClick={() => up({ location: v })}>{l}</button>
            ))}
          </div>
        </section>

        <section className="card chal">
          <div className="secthead nobord"><h2>Desafio do dia</h2><span className="tally">+15 XP</span></div>
          <p className="chaltext">{challengeToday}</p>
          {challengeDone
            ? <div className="chaldone"><span>✓</span> Feito hoje. Boa, isso te leva pra frente.</div>
            : <button className="chalbtn" onClick={doChallenge}>Aceitei e fiz</button>}
        </section>

        <BarrierTool onWin={winBarrier} count={s.barriersWon || 0} />

        <section className="card focus">
          <div className="secthead nobord"><h2>Modo foco</h2><span className="tally">pra quando falta vontade</span></div>
          {focusSecs > 0 || focusRun ? (
            <div className="focusrun">
              <div className="focusringwrap">
                <svg viewBox="0 0 130 130" width="158" height="158">
                  <circle cx="65" cy="65" r="56" stroke="#22355C" strokeWidth="9" fill="none" />
                  <circle cx="65" cy="65" r="56" stroke="#0FB5C7" strokeWidth="9" fill="none" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 56}
                    strokeDashoffset={(2 * Math.PI * 56) * (1 - focusSecs / Math.max(1, focusLen.current || focusSecs))}
                    transform="rotate(-90 65 65)"
                    style={{ transition: "stroke-dashoffset 1s linear" }} />
                </svg>
                <span className="focusclock">{mmss(focusSecs)}</span>
              </div>
              <div className="focusctrl"><button className="fbtn" onClick={focusRun ? pausarFoco : retomarFoco}>{focusRun ? "Pausar" : "Retomar"}</button><button className="fbtn ghost" onClick={stopFocus}>Encerrar</button></div>
            </div>
          ) : focusDone ? (
            <div className="focusdone"><p>Pronto, bloco fechado. O difícil era começar.</p><button className="fbtn" onClick={() => setFocusDone(false)}>Ok</button></div>
          ) : (
            <>
              <p className="sectnote">Quando falta vontade, combina com você mesmo só 2 minutos. Depois que começa, quase sempre você continua.</p>
              <div className="focusbtns">
                <button className="focusstart" onClick={() => startFocus(120)}><span className="fbig">2</span><span className="fsml">só 2 min</span></button>
                <button className="focusstart alt" onClick={() => startFocus(1500)}><span className="fbig">25</span><span className="fsml">foco 25 min · +5 XP</span></button>
              </div>
            </>
          )}
        </section>

        <section id="sec-vit">
          <div className="secthead"><h2>Suas 3 vitórias</h2><span className="tally">{vitDone}/3</span></div>
          {vitDone === 3 ? (
            <div className="celebra">Fechou as três de hoje. {s.streak > 1 ? `${s.streak} dias seguidos.` : "Assim vira hábito."}</div>
          ) : lowEnergy ? (
            <div className="lowbanner">Tá com pouca energia hoje. Escolhe <strong>uma</strong> vitória só e faz o primeiro passo. Já tá ótimo.</div>
          ) : (
            <p className="sectnote">Escolhe três coisas pro dia, não quinze. Fechou as três, já foi um bom dia.</p>
          )}
          <div className="vits">
            {s.vitorias.map((v) => (
              <div key={v.id} className={"vit" + (v.done ? " vit-done" : "")}>
                <button className={"check" + (v.done ? " check-on" : "")} onClick={() => setVit(v.id, { done: !v.done })}>{v.done ? "✓" : ""}</button>
                <div className="vitbody"><span className="vitlabel">{v.label}</span><input className="vitinput" value={v.text} placeholder={v.hint} onChange={(e) => setVit(v.id, { text: e.target.value })} /></div>
              </div>
            ))}
          </div>
        </section>

        {/* Painel semanal */}
        <section className="card ach">
          <div className="secthead nobord"><h2>Conquistas</h2><span className="tally">{ach.filter((a) => a.got).length}/{ach.length}</span></div>
          <div className="achrow">
            {ach.map((a, i) => (
              <div key={i} className={"achitem" + (a.got ? " achitem-on" : "")}>
                <span className="achdot">{a.got ? "★" : "·"}</span><span className="achlabel">{a.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card weekcard">
          <div className="secthead nobord"><h2>Sua semana</h2><span className="tally">últimos 7 dias</span></div>
          <input
            className="wkpriority"
            value={s.weekPriority && s.weekPriority.wk === chaveSemana() ? s.weekPriority.text : ""}
            placeholder="Prioridade da semana. Ex.: fechar o contrato da Red"
            onChange={(e) => setWeekPriority(e.target.value)}
          />
          <div className="weekhero">
            <span className="weekbig">{daysClosed}<span className="weekbigsub">/7</span></span>
            <span className="weekbiglabel">dias fechados<br/>(3 vitórias)</span>
          </div>
          <div className="wkbars">
            {week.map((w, i) => {
              const h = Math.max(6, Math.round((w.vit / 3) * 100));
              return (
                <div key={i} className="wkcol">
                  <div className="wktrack"><div className={"wkfill" + (w.closed ? " full" : w.vit > 0 ? " part" : "")} style={{ height: (w.vit > 0 ? h : 6) + "%" }} /></div>
                  <span className={"wkday" + (w.date === today ? " wkday-now" : "")}>{letraDoDia(w.date)}</span>
                </div>
              );
            })}
          </div>
          <div className="wkstats">
            <div className="wkstat"><span className="wksv">{avgEnergy != null ? avgEnergy.toFixed(1) : "—"}</span><span className="wksl">energia média</span></div>
            <div className="wkstat"><span className="wksv">{avgKcal != null ? avgKcal : "—"}</span><span className="wksl">kcal / dia</span></div>
            <div className="wkstat"><span className="wksv">{wWeekDelta >= 0 ? "+" : ""}{wWeekDelta}</span><span className="wksl">kg na semana</span></div>
          </div>
          <p className="weekread">{weekRead()}</p>
          <p className="weekclose">{weekClose}</p>
          {daysClosed >= 7 && <button className="wkstorybtn" onClick={() => goTab("stories")}>Gerar story da semana →</button>}
        </section>

        <section className="card weight">
          <div className="secthead nobord"><h2>Peso rumo à meta</h2><span className="tally">{temPeso ? `${wNow} kg` : "sem registro"}</span></div>

          {temPeso ? (
            <>
              <div className="wrow">
                <div><span className="wbig">{wGained >= 0 ? "+" : ""}{wGained}</span><span className="wunit"> kg ganhos</span></div>
                <div className="wgoal">
                  meta
                  {/* Rascunho local enquanto digita, valor real ao sair do campo.
                      Era defaultValue (ignorava mudança vinda de outro aparelho) e
                      type=number — que descartava "62,5" antes do código ver. */}
                  <input
                    className="goalinput"
                    type="text"
                    inputMode="decimal"
                    value={wGoalDraft ?? wGoal}
                    onChange={(e) => setWGoalDraft(e.target.value)}
                    onBlur={(e) => { setGoal(e.target.value); setWGoalDraft(null); }}
                    aria-label="Meta de peso em quilos"
                  />
                  kg
                </div>
              </div>
              <div className="track"><div className="fillblue" style={{ width: wPct + "%" }} /></div>
              <p className="whint">{wToGo > 0 ? `Faltam ${wToGo} kg. Ritmo saudável: ~0,5 kg/semana.` : "Meta batida. Agora é manter e ganhar músculo."}</p>
              <Spark log={log} />
            </>
          ) : (
            <p className="sectnote">Registre seu peso pela primeira vez pra eu começar a acompanhar sua evolução.</p>
          )}

          <div className="wadd">
            <input
              className="winput"
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              placeholder="Peso de hoje. Ex.: 52,5"
              value={wInput}
              onChange={(e) => { setWInput(e.target.value); setWAviso(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") logWeight(); }}
              aria-label="Seu peso de hoje em quilos"
            />
            <button className="wbtn" onClick={logWeight}>Registrar</button>
          </div>

          {/* Antes o registro falhava calado: o teclado fechava, nada mudava na
              tela, e parecia app quebrado. */}
          {wAviso && (
            <p className={"waviso " + (wAviso.tipo === "ok" ? "waviso-ok" : "waviso-erro")} role="status">
              {wAviso.txt}
            </p>
          )}
        </section>

        <section className="card fuel" id="sec-fuel">
          <div className="secthead nobord"><h2>Combustível de hoje</h2><span className="tally">{mealsDone}/{meals.length} refeições</span></div>
          <p className="sectnote">Meta pra ganhar peso: comer um pouco acima do que gasta, todo dia. Marque conforme come.</p>
          <div className="bar"><div className="barlabel"><span>Calorias</span><span className="barnum">{kcal} / {KCAL_META} kcal</span></div><div className="track"><div className="fillgold" style={{ width: kcalPct + "%" }} /></div></div>
          <div className="bar"><div className="barlabel"><span>Proteína</span><span className="barnum">{prot} / {PROT_META} g</span></div><div className="track"><div className="fillcyan" style={{ width: protPct + "%" }} /></div></div>
        </section>

        <section className="card watercard" id="sec-agua">
          <div className="secthead nobord"><h2>Água</h2><span className="tally">{s.water || 0}/8 copos</span></div>
          <p className="sectnote">Cansaço à tarde muitas vezes é sede. E pra ganhar peso com treino, hidratação conta.</p>
          <div className="drops">
            {[...Array(8)].map((_, i) => (
              <button key={i} className={"drop" + (i < (s.water || 0) ? " drop-on" : "")} style={{ animationDelay: (i * 30) + "ms" }} onClick={() => { buzz(8); setS((x) => ({ ...x, water: i + 1 === x.water ? i : i + 1 })); }} aria-label={`copo ${i + 1}`} />
            ))}
          </div>
          <div className="waterbtns">
            <button className="waterbtn" onClick={() => addWater(1)}>+1 copo</button>
            <button className="waterbtn ghost" onClick={() => addWater(-1)}>−1</button>
          </div>
          {(s.water || 0) >= 8 && <p className="waterdone">Meta de água batida. Corpo agradece.</p>}
        </section>

        <ReadingCard reading={s.reading || {}} onStart={startBook} onRead={readPages} onNew={newBook} />

        <section>
          <div className="secthead"><h2>A linha do dia</h2><button className="addbtn" onClick={() => setEditing({ mode: "new", draft: { id: genId(), kind: "block", t: "12:00", title: "", detail: "", kcal: 0, prot: 0, done: false } })}>+ tarefa</button></div>
          <div className="timeline">
            {s.items.map((it, idx) => {
              const last = idx === s.items.length - 1;
              const isNow = idx === nowIdx && !it.done;
              return (
                <div key={it.id} className={"row" + (it.done ? " row-done" : "") + (isNow ? " row-now" : "")}>
                  <div className="rail"><span className={"line" + (it.done ? " line-on" : "") + (last ? " line-end" : "")} /><button className={"node " + (it.kind === "meal" ? "node-meal " : "node-block ") + (it.done ? "node-on" : "") + (isNow ? " node-now" : "")} onClick={() => toggle(it.id)}>{it.done ? "✓" : ""}</button></div>
                  <div className="rowbody">
                    <div className="rowtop"><span className="time">{it.t}</span>{isNow && <span className="nowchip">agora</span>}{it.kind === "meal" && (+it.kcal > 0) && <span className="kcalchip">{it.kcal} kcal · {it.prot}g</span>}<button className="editbtn" onClick={() => setEditing({ mode: "edit", draft: { ...it } })}>editar</button></div>
                    <p className="rowtitle">{it.title || "(sem título)"}</p>
                    {it.detail && <p className="rowdetail">{it.detail}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card evolucao">
          <div className="secthead nobord"><h2>Sua evolução</h2></div>
          <p className="evointro">{evoLine}</p>
          <div className="evogrid">
            <div className="evocell"><span className="evonum">{daysShown}</span><span className="evolabel">dias que você apareceu</span></div>
            <div className="evocell"><span className="evonum">{totalVit}</span><span className="evolabel">vitórias fechadas</span></div>
            <div className="evocell"><span className="evonum">{s.barriersWon || 0}</span><span className="evolabel">barreiras vencidas</span></div>
            <div className="evocell"><span className="evonum">{s.streakRecord || 0}</span><span className="evolabel">melhor sequência</span></div>
            <div className="evocell"><span className="evonum">{wGained >= 0 ? "+" : ""}{wGained}</span><span className="evolabel">kg ganhos</span></div>
            <div className="evocell"><span className="evonum">{(s.reading && s.reading.finished) || 0}</span><span className="evolabel">livros lidos</span></div>
            <div className="evocell"><span className="evonum">{(s.reading && s.reading.pagesAllTime) || 0}</span><span className="evolabel">páginas lidas</span></div>
            <div className="evocell"><span className="evonum">Nv {level}</span><span className="evolabel">seu nível</span></div>
          </div>
        </section>

        <section className="card report">
          <h2 className="reporth">Relatório da noite</h2>
          <p className="reportp">Você está em <strong>{locLabel}</strong>{s.energy != null && <> com energia <strong>{s.energy}/10</strong></>}{s.sleep && <>, dormiu <strong>{s.sleep}</strong></>}. Fechou <strong>{vitDone} de 3</strong> vitórias e <strong>{blocksDone} de {blocksTotal}</strong> blocos. Combustível: <strong>{kcal} kcal</strong>, <strong>{prot}g</strong> de proteína e <strong>{s.water || 0} copos</strong> de água.{kcal >= KCAL_META ? " Bateu a meta de hoje, é assim que se ganha peso." : kcal > 0 ? ` Faltam ${KCAL_META - kcal} kcal pra fechar.` : " Você ainda não marcou nenhuma refeição."}</p>
          <label className="gratlabel">O que foi bom hoje?</label>
          <input className="gratinput" value={s.gratitude || ""} placeholder="Uma coisa só. Ex.: almocei com calma" onChange={(e) => setGratitude(e.target.value)} />
          <p className="reporttip">{vitDone === 3 ? `Fechou as três de hoje. Sequência de ${s.streak} ${s.streak === 1 ? "dia" : "dias"}. Continua nesse ritmo.` : "Se não deu tudo hoje, tudo bem. Amanhã você tenta de novo."}</p>

          {/* Confirmação em dois toques. Este botão apaga as vitórias, a água, a
              energia e a gratidão do dia — e ficava logo abaixo do campo de
              gratidão, à espera de um toque errado. */}
          {confirmarDia ? (
            <div className="resetconf">
              <p className="resetconftxt">
                Isso guarda o dia de hoje no histórico e limpa as vitórias, a água, a energia e a gratidão. Sem volta.
              </p>
              <div className="resetbtns">
                <button className="reset perigo" onClick={newDay}>Encerrar mesmo</button>
                <button className="reset" onClick={() => setConfirmarDia(false)}>Deixa pra lá</button>
              </div>
            </div>
          ) : (
            <button className="reset" onClick={() => setConfirmarDia(true)}>Encerrar e começar um novo dia</button>
          )}
        </section>

        <p className="foot">Regra da Linha: não enche mais de 70% do dia. Deixa um espaço pros imprevistos.</p>
        </>)}

        {tab === "treino" && <Treino s={s} setS={setS} iaAtiva={iaAtiva} />}

        {tab === "dicas" && <Guides />}

        {tab === "stories" && <Stories weekComplete={daysClosed >= 7} handle={s.handle || ""} onHandle={setHandle} />}
      </div>

      {editing && <Editor state={editing} onSave={saveItem} onDelete={deleteItem} onClose={() => setEditing(null)} />}
      <nav className="bnav">
        <div className="bnavin bnav4" style={{ "--i": { hoje: 0, treino: 1, dicas: 2, stories: 3 }[tab] ?? 0 }}>
          <button className={"bitem" + (tab === "hoje" ? " bitem-on" : "")} onClick={() => goTab("hoje")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.3l2.3 2.3 4.7-5.1" /></svg>
            Hoje
          </button>
          <button className={"bitem" + (tab === "treino" ? " bitem-on" : "")} onClick={() => goTab("treino")}>
            <IcHalter size={23} sw={2} />
            Treino
          </button>
          <button className={"bitem" + (tab === "dicas" ? " bitem-on" : "")} onClick={() => goTab("dicas")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-3.4 10.9c.7.5 1.1 1.3 1.1 2.1h4.6c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z" /></svg>
            Dicas
          </button>
          <button className={"bitem" + (tab === "stories" ? " bitem-on" : "")} onClick={() => goTab("stories")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4.5l1.8 4.2 4.2 1.8-4.2 1.8L12 16.5l-1.8-4.2L6 10.5l4.2-1.8z" /><path d="M18.7 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></svg>
            Stories
          </button>
        </div>
      </nav>
      {breath && <BreathingModal onClose={() => setBreath(false)} />}
      {sos && <SosModal onBreath={() => { setSos(false); setBreath(true); }} onClose={() => setSos(false)} />}
      {burst && <Burst />}
      {!s.onboarded && !splash && <Onboarding onFinish={finishOnboarding} />}
      {/* A limpeza é por timeout (no useEffect lá em cima), não por onAnimationEnd:
          com "reduzir movimento" ligado a animação não roda, o evento nunca vem,
          e o toast ficava preso na tela pra sempre. */}
      {xpGain && <div key={xpGain.k} className="xptoast" aria-live="polite">+{xpGain.n} XP</div>}
    </div>
  );
}

function Spark({ log }) {
  if (log.length < 2) return <p className="sparkempty">Registre seu peso toda semana pra ver a evolução aqui.</p>;
  const W = 280, H = 46, pad = 4;
  const ks = log.map((e) => e.kg);
  const min = Math.min(...ks), max = Math.max(...ks), span = max - min || 1;
  const pts = log.map((e, i) => [pad + (i / (log.length - 1)) * (W - pad * 2), pad + (1 - (e.kg - min) / span) * (H - pad * 2)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><path d={d} fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />{pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={C.blue} />)}</svg>;
}

function Burst() {
  const colors = ["#1F5FE6", "#0FB5C7", "#F0A63C", "#7FE3EE", "#5A94F2"];
  const pieces = [...Array(38)].map((_, i) => {
    const a = Math.round((i / 38) * 360) + Math.round(Math.random() * 8);
    const d = 90 + Math.round(Math.random() * 130);
    const tam = 6 + Math.round(Math.random() * 6);
    const redondo = i % 3 === 0;
    return (
      <span
        key={i}
        className="confpiece"
        style={{
          "--a": a + "deg",
          "--d": d + "px",
          width: tam + "px",
          height: (redondo ? tam : tam + 5) + "px",
          borderRadius: redondo ? "50%" : "2px",
          background: colors[i % colors.length],
          animationDelay: (Math.random() * 0.14).toFixed(2) + "s",
        }}
      />
    );
  });
  return <div className="burstwrap" aria-hidden="true">{pieces}</div>;
}

function Ring({ pct, from, to, label, value, onClick }) {
  const r = 30, c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const off = c * (1 - clamped / 100);
  const cheio = clamped >= 100;
  const gid = "rg-" + label; // gradiente próprio por anel
  return (
    <button className={"ringbox" + (cheio ? " ring-cheio" : "")} onClick={onClick} type="button">
      <svg viewBox="0 0 80 80" width="80" height="80" role="img" aria-label={`${label}: ${value}`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        {/* trilho */}
        <circle cx="40" cy="40" r={r} stroke="rgba(255,255,255,.14)" strokeWidth="7.5" fill="none" />
        {/* progresso com gradiente; quando cheio, ganha um glow */}
        <circle cx="40" cy="40" r={r} stroke={`url(#${gid})`} strokeWidth="7.5" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.7,.3,1)", filter: cheio ? `drop-shadow(0 0 5px ${to})` : "none" }} />
        {cheio
          ? <path d="M32 40.5l5.2 5.2L49 34" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          : <text x="40" y="42" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontFamily="'Bricolage Grotesque',sans-serif" fontWeight="800" fontSize="15" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</text>}
      </svg>
      <span className="ringlabel">{label}</span>
    </button>
  );
}

function LevelRing({ level, pct }) {  const r = 20, c = 2 * Math.PI * r;
  return (
    <svg className="lvlring" viewBox="0 0 48 48" width="52" height="52" role="img" aria-label={"nível " + level}>
      <defs><linearGradient id="lvlg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0FB5C7" /><stop offset="1" stopColor="#1F5FE6" /></linearGradient></defs>
      <circle cx="24" cy="24" r={r} fill="none" stroke="#D6E0F0" strokeWidth="4" />
      <circle cx="24" cy="24" r={r} fill="none" stroke="url(#lvlg)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 24 24)" />
      <text x="24" y="25" textAnchor="middle" dominantBaseline="middle" fontFamily="'Bricolage Grotesque',sans-serif" fontWeight="800" fontSize="16" fill="#0C1A33">{level}</text>
    </svg>
  );
}

function Editor({ state, onSave, onDelete, onClose }) {
  const [d, setD] = useState(state.draft);
  const set = (p) => setD((x) => ({ ...x, ...p }));
  const isMeal = d.kind === "meal";
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheethandle" />
        <h3 className="sheeth">{state.mode === "new" ? "Nova tarefa" : "Editar tarefa"}</h3>
        <label className="flabel">Tipo</label>
        <div className="seg"><button className={"segbtn" + (!isMeal ? " segbtn-on" : "")} onClick={() => set({ kind: "block" })}>Bloco</button><button className={"segbtn" + (isMeal ? " segbtn-on" : "")} onClick={() => set({ kind: "meal" })}>Refeição</button></div>
        <label className="flabel">Horário</label>
        <input className="finput" type="time" value={d.t} onChange={(e) => set({ t: e.target.value })} />
        <label className="flabel">Título</label>
        <input className="finput" value={d.title} placeholder="Ex.: Deep work da Fluxo" onChange={(e) => set({ title: e.target.value })} />
        <label className="flabel">Detalhe</label>
        <textarea className="finput ftext" value={d.detail} placeholder="O que fazer / o que comer" onChange={(e) => set({ detail: e.target.value })} />
        {isMeal && (<div className="frow"><div><label className="flabel">Calorias</label><input className="finput" type="number" value={d.kcal} onChange={(e) => set({ kcal: +e.target.value })} /></div><div><label className="flabel">Proteína (g)</label><input className="finput" type="number" value={d.prot} onChange={(e) => set({ prot: +e.target.value })} /></div></div>)}
        <div className="sheetbtns"><button className="save" onClick={() => onSave(d)}>Salvar</button>{state.mode === "edit" && <button className="del" onClick={() => onDelete(d.id)}>Excluir</button>}</div>
        <button className="cancel" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

// 100dvh (não vh): no iPhone o vh não encolhe com a barra do Safari e criava um
// salto. position:relative pra ancorar a aurora e o grão que ficam atrás de tudo.
const shell = { minHeight: "100dvh", background: "#E9EFFB", width: "100%", position: "relative", overflowX: "hidden" };

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Sacramento&family=Inter:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
/* Números com largura fixa: não "dançam" ao mudar de 9 pra 10, e alinham em colunas. */
.tally,.weekbig,.evonum,.wksv,.levelxp,.barnum,.streak,.shield,.kcalchip,.focusclock,.nortejorney,.wbig,.lvlring text,.ringbox text{font-variant-numeric:tabular-nums;}

/* ── Camada ambiente: aurora suave + grão ──────────────────────────────────────
   Tira a cara de "flat vetorial de gerador". A aurora respira devagar; o grão é
   um SVG de ruído embutido, fixo, sem custo de rede. Ambos atrás de tudo. */
.aurora{position:fixed;inset:-10% -20% auto -20%;height:70vh;z-index:0;pointer-events:none;
  background:
    radial-gradient(48% 40% at 18% 8%, rgba(63,208,230,.20), transparent 70%),
    radial-gradient(46% 44% at 88% 4%, rgba(31,95,230,.22), transparent 72%),
    radial-gradient(60% 50% at 50% 0%, rgba(122,140,240,.14), transparent 75%);
  filter:blur(8px);animation:auroraflutua 16s ease-in-out infinite;}
@keyframes auroraflutua{0%,100%{transform:translate3d(0,0,0) scale(1);opacity:.9;}50%{transform:translate3d(0,14px,0) scale(1.05);opacity:1;}}
.grao{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.5;mix-blend-mode:soft-light;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
.wrap{position:relative;z-index:1;}
/* env(safe-area-inset-*): o app é standalone com a barra de status translúcida.
   Sem isso, o cabeçalho desenhava ATRÁS do notch / Dynamic Island do iPhone. */
.wrap{max-width:520px;margin:0 auto;padding:calc(26px + env(safe-area-inset-top)) 18px calc(128px + env(safe-area-inset-bottom));color:${C.ink};font-family:Inter,system-ui,sans-serif;}
.head{margin-bottom:18px;padding-top:4px;}
.headtop{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}

/* ── conta, avisos e dados legados ─────────────────────────────────────────── */
.headright{display:flex;align-items:center;gap:10px;}
.headmenu{width:44px;height:44px;border-radius:50%;border:1px solid ${C.faint};background:${C.surface};cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex:none;}
.headinicial{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:17px;color:${C.blue};}
.conta{background:${C.surface};border:1px solid ${C.faint};border-radius:16px;padding:16px;margin-bottom:18px;box-shadow:0 6px 20px rgba(12,26,51,.10);}
.contanome{font-weight:700;font-size:15px;margin:0;}
.contaemail{font-size:13px;color:${C.muted};margin:2px 0 12px;word-break:break-all;}
.contabtns{display:flex;flex-wrap:wrap;gap:7px;}
.contabtn{min-height:44px;padding:0 14px;display:flex;align-items:center;background:transparent;border:1px solid ${C.faint};color:${C.ink};border-radius:11px;font-family:Inter,sans-serif;font-size:13px;font-weight:600;cursor:pointer;}
.contabtn:hover{border-color:${C.blue};color:${C.blue};}
.contabtn.destaque{background:${C.blue};border-color:${C.blue};color:#fff;}
.contabtn.sair{color:#C0453F;border-color:#E9B4B1;}

.avisoruim{background:#FDECEC;border:1px solid #E9B4B1;border-radius:13px;padding:12px 14px;font-size:13.5px;line-height:1.5;color:#96322C;font-weight:500;margin-bottom:18px;}
.avisocalmo{background:${C.goldSoft};border:1px solid ${C.gold}55;border-radius:13px;padding:11px 14px;font-size:13px;line-height:1.5;color:#7A5A12;margin-bottom:18px;}

.legado{background:${C.blueSoft};border:1px solid ${C.blue}55;border-radius:14px;padding:14px;margin-bottom:18px;}
.legadotxt{font-size:13.5px;line-height:1.55;color:${C.ink};margin:0 0 10px;}
.legadobtns{display:flex;gap:8px;flex-wrap:wrap;}
.legadobtn{min-height:44px;padding:0 14px;background:${C.surface};border:1px solid ${C.faint};border-radius:11px;color:${C.ink};font-family:Inter,sans-serif;font-size:13px;font-weight:600;cursor:pointer;}
.legadobtn.destaque{background:${C.blue};border-color:${C.blue};color:#fff;}
.brandmark{display:flex;align-items:center;gap:10px;}
.brandmark svg.phoenixsvg{width:46px;height:46px;}
.brandtext{display:flex;flex-direction:column;line-height:1;}
.brand{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;letter-spacing:-.02em;background:linear-gradient(100deg,${C.blue},${C.cyan});-webkit-background-clip:text;background-clip:text;color:transparent;}
.brandsub{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${C.muted};margin-top:3px;}
.lvlring{flex:none;filter:drop-shadow(0 2px 6px rgba(31,95,230,.18));}
.headmeta{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:7px;}
/* Chip de sequência: chama quente que tremula, sobre o hero escuro. */
.streak{display:inline-flex;align-items:center;gap:5px;font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:#FFE7C2;background:linear-gradient(120deg,rgba(232,138,44,.28),rgba(240,166,60,.16));padding:5px 12px 5px 10px;border-radius:99px;box-shadow:0 0 0 1px rgba(240,166,60,.4),0 4px 14px -4px rgba(232,138,44,.6);}
.chama{display:inline-block;font-size:13px;transform-origin:50% 90%;animation:tremula 1.5s ease-in-out infinite;filter:drop-shadow(0 0 4px rgba(255,150,40,.7));}
@keyframes tremula{0%,100%{transform:scale(1) rotate(-2deg);}25%{transform:scale(1.14) rotate(2deg);}50%{transform:scale(.96) rotate(-1deg);}75%{transform:scale(1.08) rotate(1deg);}}
.hello{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:30px;line-height:1.08;letter-spacing:-.025em;margin:0;}
.date{margin:0;color:${C.muted};font-size:14px;text-transform:capitalize;}

.tip{background:${C.cyanSoft};border:1px solid ${C.cyan}44;border-radius:16px;padding:16px 18px;margin-bottom:22px;}
.tiphead{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.tipeye{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#0A8A99;font-weight:700;}
.tipnext{background:transparent;border:none;color:#0A8A99;font-size:13px;font-family:Inter,sans-serif;cursor:pointer;font-weight:600;min-height:44px;padding:0 8px;margin:-8px -8px -8px 0;}
.tiptext{margin:0;font-size:15px;line-height:1.55;color:${C.ink};}

.phcard{display:flex;gap:14px;align-items:center;background:linear-gradient(135deg,#E7F0FF,#EAFAFB);border:1px solid ${C.cyan}33;border-radius:16px;padding:16px;margin-bottom:22px;}
.phoenixsvg{flex:none;filter:drop-shadow(0 5px 12px rgba(15,181,199,.30));}
.phbob{transform-origin:60px 84px;animation:phbob 3.4s ease-in-out infinite;}
.ph-happy .phbob{animation:phrise .8s ease;}
.phright{flex:1;min-width:0;}
.pheye{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${C.blue};font-weight:700;margin-bottom:6px;}
.phbubble{position:relative;background:#fff;border:1px solid ${C.faint};border-radius:12px;padding:10px 12px;box-shadow:0 1px 2px rgba(12,26,51,.05);}
.phbubble::before{content:"";position:absolute;left:-7px;top:16px;width:12px;height:12px;background:#fff;border-left:1px solid ${C.faint};border-bottom:1px solid ${C.faint};transform:rotate(45deg);}
.phmsg{margin:0;font-size:14px;line-height:1.45;color:${C.ink};font-weight:500;}
/* Eram três textos de 12px colados, sem área de toque e com contraste fraco.
   "Tô num dia difícil" é justamente o botão que alguém aperta num dia ruim —
   tem que ser fácil de acertar. */
.phbtn{margin-top:8px;min-height:44px;padding:0 12px;display:inline-flex;align-items:center;background:${C.surface};border:1px solid ${C.faint};border-radius:11px;color:${C.blue};font-size:13.5px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;}
.phbtn:hover{border-color:${C.blue};}
@keyframes phbob{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}
@keyframes phrise{0%{transform:translateY(0) scale(1);}40%{transform:translateY(-11px) scale(1.06);}100%{transform:translateY(0) scale(1);}}

.tabs{display:flex;gap:6px;background:rgba(226,236,252,.85);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);padding:5px;border-radius:13px;margin-bottom:22px;position:sticky;top:8px;z-index:30;box-shadow:0 2px 10px rgba(12,26,51,.06);}
.tab{flex:1;padding:11px 0;border:none;background:transparent;border-radius:9px;font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:${C.muted};cursor:pointer;transition:all .15s;}
.tab-on{background:#fff;color:${C.blue};box-shadow:0 1px 3px rgba(12,26,51,.1);}
.wkstorybtn{margin-top:12px;width:100%;background:linear-gradient(120deg,${C.blue},${C.cyan});color:#fff;border:none;border-radius:11px;padding:12px;font-weight:700;font-size:14px;cursor:pointer;font-family:Inter,sans-serif;}

.weekstory{background:linear-gradient(120deg,${C.blue},${C.cyan});color:#fff;border-radius:16px;padding:16px 18px;margin-bottom:20px;}
.wseye{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;opacity:.9;}
.wstext{margin:6px 0 12px;font-size:15px;line-height:1.4;}
.wsbtn{background:#fff;color:${C.blue};border:none;border-radius:10px;padding:10px 16px;font-weight:700;font-size:14px;cursor:pointer;font-family:Inter,sans-serif;}
.storypreview{display:flex;justify-content:center;margin-bottom:18px;}
.storypreview img{width:250px;max-width:70%;border-radius:16px;box-shadow:0 8px 26px rgba(12,26,51,.22);}
.storyload{width:250px;height:444px;border-radius:16px;background:${C.faint};display:flex;align-items:center;justify-content:center;color:${C.muted};font-size:13px;}
.chips{display:flex;gap:6px;margin-bottom:10px;}
.chip{flex:1;padding:9px 0;border:1px solid ${C.faint};background:transparent;border-radius:99px;font-size:13px;font-weight:600;color:${C.muted};cursor:pointer;font-family:Inter,sans-serif;}
.chip-on{background:${C.blueSoft};border-color:${C.blue};color:${C.blue};}
.bigbtn{width:100%;background:${C.blue};color:#fff;border:none;border-radius:12px;padding:13px;font-weight:600;font-size:15px;cursor:pointer;font-family:Inter,sans-serif;margin-bottom:18px;}
.ctrllabel{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};font-weight:600;margin:0 0 8px;}
.bgrow{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;}
.bgsw{width:44px;height:44px;border-radius:10px;border:2px solid transparent;cursor:pointer;}
.bgsw-on{border-color:${C.ink};box-shadow:0 0 0 2px #fff inset;}
.storyinput{width:100%;min-height:64px;border:1px solid ${C.faint};border-radius:11px;padding:12px 13px;font-family:Inter,sans-serif;font-size:16px;color:${C.ink};background:${C.surface};outline:none;resize:vertical;line-height:1.4;margin-bottom:16px;}
.storyinput:focus{border-color:${C.blue};}
.savebtn{width:100%;background:${C.cyan};color:#04323a;border:none;border-radius:12px;padding:14px;font-weight:800;font-size:15px;cursor:pointer;font-family:Inter,sans-serif;}
.savehint{font-size:12px;color:${C.muted};text-align:center;line-height:1.5;margin:10px 4px 0;}

.why{border-left:3px solid ${C.blue};}
.whyeye{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${C.blue};font-weight:700;margin-bottom:8px;}
.whyinput{width:100%;border:none;background:transparent;font-family:Inter,sans-serif;font-size:16px;line-height:1.45;color:${C.ink};font-weight:500;outline:none;resize:vertical;min-height:46px;}
.whyinput::placeholder{color:#9DAEC9;font-weight:400;}

.phbtns{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}

.barrierq{background:${C.blueSoft};border-radius:10px;padding:11px 13px;font-size:13.5px;color:${C.blue};font-weight:600;line-height:1.45;margin:8px 0 6px;}
.barrierbtn{width:100%;background:${C.blue};color:#fff;border:none;border-radius:11px;padding:13px;font-weight:600;font-size:15px;cursor:pointer;font-family:Inter,sans-serif;margin-top:8px;}
.barrierbtn:disabled{background:${C.faint};color:#9DAEC9;cursor:default;}
.barrierwin{background:linear-gradient(120deg,${C.blue},${C.cyan});color:#fff;font-weight:600;font-size:14px;line-height:1.45;padding:14px;border-radius:12px;margin:6px 0 12px;}
.barrierreset{width:100%;background:transparent;border:1px solid ${C.faint};color:${C.blue};border-radius:11px;padding:11px;font-weight:600;font-size:14px;cursor:pointer;font-family:Inter,sans-serif;}

.achrow{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;}
.achitem{display:flex;align-items:center;gap:7px;background:${C.bg};border:1px solid ${C.faint};border-radius:99px;padding:7px 12px;opacity:.5;}
.achitem-on{opacity:1;background:${C.blueSoft};border-color:${C.blue};}
.achdot{color:${C.muted};font-size:13px;}
.achitem-on .achdot{color:${C.blue};}
.achlabel{font-size:12.5px;font-weight:600;color:${C.ink};}

.breatheoverlay{position:fixed;inset:0;background:rgba(12,26,51,.80);display:flex;align-items:center;justify-content:center;z-index:60;animation:fade .2s;}
.breathe{display:flex;flex-direction:column;align-items:center;gap:16px;padding:30px;}
.breathecircle{width:180px;height:180px;border-radius:50%;background:radial-gradient(circle at 40% 35%, ${C.cyan}, ${C.blue});display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:20px;animation:breathe 16s ease-in-out infinite;box-shadow:0 0 50px rgba(15,181,199,.5);}
.breathecount{color:#DDE6F5;font-family:'Space Mono',monospace;font-size:13px;margin:0;}
.breathehint{color:#8FA0BE;font-size:12px;margin:0;text-align:center;}
.breatheclose{margin-top:6px;background:#fff;color:${C.blue};border:none;border-radius:11px;padding:12px 30px;font-weight:700;font-size:15px;cursor:pointer;font-family:Inter,sans-serif;}
@keyframes breathe{0%{transform:scale(.55);}25%{transform:scale(1);}50%{transform:scale(1);}75%{transform:scale(.55);}100%{transform:scale(.55);}}

.shield{display:inline-flex;align-items:center;gap:5px;font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:#CFE0FF;background:rgba(127,179,255,.16);padding:5px 12px;border-radius:99px;box-shadow:0 0 0 1px rgba(127,179,255,.3) inset;}
.level{position:relative;overflow:hidden;background:radial-gradient(120% 140% at 85% 0%,#22508F,${C.navy} 60%);border-color:${C.navy};box-shadow:0 14px 34px -14px rgba(12,26,51,.6);}
.levelrow{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px;}
.levelnum{font-family:'Bricolage Grotesque',sans-serif;font-size:23px;font-weight:800;color:#fff;}
.leveltitle{font-size:13px;color:${C.cyan};font-weight:600;text-transform:uppercase;letter-spacing:.06em;}
.leveltrack{position:relative;height:11px;background:rgba(255,255,255,.13);border-radius:99px;overflow:hidden;}
/* brilho que corre na ponta preenchida da barra */
.levelfill{position:relative;height:100%;background:linear-gradient(90deg,${C.cyan},${C.blue});border-radius:99px;transition:width .6s cubic-bezier(.3,1.1,.4,1);box-shadow:0 0 12px ${C.cyan}99;}
.levelfill::after{content:"";position:absolute;right:0;top:50%;transform:translate(50%,-50%);width:14px;height:14px;border-radius:50%;background:#EAFBFE;box-shadow:0 0 10px 2px ${C.cyan};}
.levelfoot{display:flex;justify-content:space-between;margin-top:8px;}
.levelxp{font-family:'Space Mono',monospace;font-size:11.5px;color:#9FB4D6;}
.chaltext{font-size:16px;line-height:1.5;color:${C.ink};font-weight:600;margin:6px 0 14px;}
.chalbtn{width:100%;background:${C.blue};color:#fff;border:none;border-radius:11px;padding:13px;font-weight:600;font-size:15px;cursor:pointer;font-family:Inter,sans-serif;}
.chaldone{display:flex;align-items:center;gap:8px;background:${C.blueSoft};border:1px solid ${C.blue};border-radius:11px;padding:12px 14px;color:${C.blue};font-weight:600;font-size:14px;}

.norte{border-left:3px solid ${C.blue};}
.nortehead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;}
.norteeye{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${C.blue};font-weight:700;}
.nortejorney{font-family:'Space Mono',monospace;font-size:11px;color:${C.muted};}
.nlabel{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.muted};font-weight:600;margin:0 0 6px;}
.ninput{width:100%;border:none;background:transparent;font-family:Inter,sans-serif;font-size:16px;line-height:1.45;color:${C.ink};font-weight:500;outline:none;resize:vertical;min-height:44px;}
.ninput::placeholder{color:#9DAEC9;font-weight:400;}
.norte .ninput{margin-bottom:14px;}
.norte .ninput:last-child{margin-bottom:0;}

.evolucao{background:linear-gradient(180deg,#F1F6FF,${C.surface});}
.evointro{font-size:14px;line-height:1.55;color:${C.ink};margin:8px 0 16px;font-weight:500;}
.evogrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.evocell{background:${C.surface};border:1px solid ${C.faint};border-radius:12px;padding:12px 8px;text-align:center;}
.evonum{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:800;color:${C.blue};letter-spacing:-.01em;}
.evolabel{display:block;font-size:11.5px;color:${C.muted};margin-top:5px;line-height:1.35;}

.handleinput{width:100%;border:1px solid ${C.faint};border-radius:11px;padding:12px 13px;font-family:Inter,sans-serif;font-size:16px;color:${C.ink};background:${C.surface};outline:none;margin-bottom:16px;}
.handleinput:focus{border-color:${C.blue};}

.installbar{background:${C.navy};border-radius:14px;padding:12px 14px;margin-bottom:20px;box-shadow:0 4px 16px rgba(12,26,51,.14);}
.installrow{display:flex;align-items:center;gap:10px;}
.installtxt{flex:1;color:#fff;font-size:13.5px;font-weight:500;line-height:1.35;}
.installbtn{background:linear-gradient(120deg,${C.cyan},${C.blue});color:#fff;border:none;border-radius:9px;padding:9px 15px;font-weight:700;font-size:13px;cursor:pointer;font-family:Inter,sans-serif;white-space:nowrap;}
.installx{background:transparent;border:none;color:#7E93B8;font-size:20px;line-height:1;cursor:pointer;padding:0 2px;}
.installhint{color:#A9BBD8;font-size:12.5px;line-height:1.5;margin:10px 0 0;}

.splash{position:fixed;inset:0;z-index:100;background:radial-gradient(circle at 50% 38%,#123056,#0C1A33);display:flex;align-items:center;justify-content:center;animation:splashout .5s ease .8s forwards;}
.splashinner{display:flex;flex-direction:column;align-items:center;gap:6px;animation:splashpop .6s cubic-bezier(.2,.8,.2,1.2);}
.splashinner svg.phoenixsvg{width:112px;height:112px;filter:drop-shadow(0 6px 22px rgba(15,181,199,.45));}
.splashword{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:34px;letter-spacing:-.02em;background:linear-gradient(100deg,#7FE3EE,#5A94F2);-webkit-background-clip:text;background-clip:text;color:transparent;margin-top:6px;}
.splashtag{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#7E93B8;}
@keyframes splashout{to{opacity:0;visibility:hidden;}}
@keyframes splashpop{from{transform:scale(.85);opacity:0;}to{transform:scale(1);opacity:1;}}

.row-now .rowtitle{color:${C.blue};}
.node-now{border-color:${C.cyan};box-shadow:0 0 0 0 rgba(15,181,199,.5);animation:nowpulse 1.8s ease-out infinite;}
.nowchip{font-family:'Space Mono',monospace;font-size:10px;font-weight:700;color:#fff;background:linear-gradient(120deg,${C.cyan},${C.blue});padding:2px 8px;border-radius:99px;text-transform:uppercase;letter-spacing:.06em;}
@keyframes nowpulse{0%{box-shadow:0 0 0 0 rgba(15,181,199,.45);}70%{box-shadow:0 0 0 10px rgba(15,181,199,0);}100%{box-shadow:0 0 0 0 rgba(15,181,199,0);}}

.burstwrap{position:fixed;left:50%;top:36%;width:0;height:0;z-index:90;pointer-events:none;}
.confpiece{position:absolute;width:8px;height:13px;border-radius:2px;transform:rotate(var(--a)) translateY(0);animation:confgo 1.25s cubic-bezier(.15,.65,.4,1) forwards;}
@keyframes confgo{0%{transform:rotate(var(--a)) translateY(0) rotate(0);opacity:1;}100%{transform:rotate(var(--a)) translateY(var(--d)) rotate(300deg);opacity:0;}}

.phbtn-sos{color:#B0651E;}
.sostext{font-size:15px;line-height:1.6;color:${C.ink};margin:0 0 16px;}
.sossteps{display:flex;flex-direction:column;gap:9px;margin-bottom:18px;}
.sosstep{display:flex;gap:12px;align-items:flex-start;background:${C.surface};border:1px solid ${C.faint};border-radius:13px;padding:13px 14px;font-size:14px;line-height:1.5;color:${C.ink};text-align:left;font-family:Inter,sans-serif;cursor:default;}
button.sosstep{cursor:pointer;}
button.sosstep:hover{border-color:${C.blue};}
.sosnum{flex:none;width:24px;height:24px;border-radius:50%;background:linear-gradient(120deg,${C.cyan},${C.blue});color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;}
.sosnote{background:${C.goldSoft};border:1px solid ${C.gold}44;border-radius:13px;padding:13px 15px;}
.sosnote p{font-size:13px;line-height:1.6;color:#6B4E13;margin:0 0 8px;}
.sosnote p:last-child{margin:0;}
.sosnote strong{color:#8A5E0E;}

.tip{border-radius:18px;}
.phcard{border-radius:18px;}
.storypreview img{width:262px;border-radius:18px;box-shadow:0 14px 34px rgba(12,26,51,.28);}
.chips{flex-wrap:wrap;}
.chip{flex:1 1 40%;min-width:100px;}

.guidesintro{font-size:14.5px;line-height:1.6;color:${C.ink};margin:0 0 14px;}
.guidechips{margin-bottom:16px;}
.guidechips .chip{flex:1 1 30%;min-width:90px;}
.guidelist{display:flex;flex-direction:column;gap:10px;}
.guide{background:${C.surface};border:1px solid ${C.faint};border-radius:15px;overflow:hidden;box-shadow:0 1px 4px rgba(12,26,51,.04);}
.guide-open{border-color:${C.blue};}
.guidehead{width:100%;display:flex;align-items:center;gap:10px;background:transparent;border:none;padding:15px 16px;cursor:pointer;font-family:Inter,sans-serif;text-align:left;}
.guidecat{flex:none;font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:${C.blue};background:${C.blueSoft};padding:3px 8px;border-radius:99px;}
.guidetitle{flex:1;font-size:15px;font-weight:600;color:${C.ink};}
.guidechev{flex:none;font-size:20px;color:${C.muted};line-height:1;}
.guidebody{padding:0 16px 16px;}
.guidewhy{font-size:13.5px;line-height:1.6;color:${C.muted};margin:0 0 12px;border-left:3px solid ${C.cyan};padding-left:12px;}
.guidesteps{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:7px;}
.guidesteps li{font-size:14px;line-height:1.55;color:${C.ink};}
.guidesteps li::marker{color:${C.blue};font-weight:700;}
.guidesfoot{font-size:12.5px;color:${C.muted};line-height:1.6;text-align:center;margin:20px 8px 0;}

/* entrada em cascata dos cartões */
.wrap>section,.wrap>div.installbar{animation:cardin .45s cubic-bezier(.2,.7,.3,1) both;}
.wrap>section:nth-of-type(1){animation-delay:.02s}
.wrap>section:nth-of-type(2){animation-delay:.06s}
.wrap>section:nth-of-type(3){animation-delay:.10s}
.wrap>section:nth-of-type(4){animation-delay:.14s}
.wrap>section:nth-of-type(5){animation-delay:.18s}
.wrap>section:nth-of-type(6){animation-delay:.22s}
.wrap>section:nth-of-type(7){animation-delay:.26s}
.wrap>section:nth-of-type(8){animation-delay:.30s}
@keyframes cardin{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}

/* toast de XP */
.xptoast{position:fixed;top:74px;right:22px;z-index:95;background:linear-gradient(120deg,${C.cyan},${C.blue});color:#fff;font-family:'Space Mono',monospace;font-weight:700;font-size:15px;padding:9px 16px;border-radius:99px;box-shadow:0 6px 20px rgba(31,95,230,.35);animation:xpfloat 1.5s cubic-bezier(.2,.7,.3,1) forwards;pointer-events:none;}
@keyframes xpfloat{0%{opacity:0;transform:translateY(14px) scale(.85);}18%{opacity:1;transform:translateY(0) scale(1.05);}30%{transform:translateY(0) scale(1);}75%{opacity:1;}100%{opacity:0;transform:translateY(-26px);}}

/* brasas da fênix */
.phcard{position:relative;overflow:hidden;}
.ember{position:absolute;bottom:-8px;width:6px;height:6px;border-radius:50%;background:${C.cyan};opacity:0;animation:emberup 4.6s ease-in infinite;pointer-events:none;}
.e1{left:14%;animation-delay:0s;}
.e2{left:26%;width:4px;height:4px;background:#F0A63C;animation-delay:1.3s;}
.e3{left:38%;animation-delay:2.4s;}
.e4{left:8%;width:4px;height:4px;animation-delay:3.2s;background:#7FE3EE;}
.e5{left:31%;width:5px;height:5px;animation-delay:.7s;}
@keyframes emberup{0%{opacity:0;transform:translateY(0) scale(1);}12%{opacity:.75;}100%{opacity:0;transform:translateY(-118px) scale(.4);}}

/* check com pop */
.check-on,.node-on{animation:popcheck .28s cubic-bezier(.2,.9,.3,1.4);}
@keyframes popcheck{0%{transform:scale(.7);}60%{transform:scale(1.16);}100%{transform:scale(1);}}

/* brilho correndo na barra de nível */
.levelfill{background:linear-gradient(90deg,${C.cyan},${C.blue},${C.cyan});background-size:220% 100%;animation:levelslide 3.2s linear infinite;}
@keyframes levelslide{from{background-position:0% 0;}to{background-position:220% 0;}}

/* acordeão das dicas */
.guidebody{animation:fadedown .24s ease;}
@keyframes fadedown{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}

/* Hero com profundidade: base navy + um brilho de aurora que respira por trás
   dos anéis. overflow:hidden pra o glow não escapar do card. */
.hero{position:relative;overflow:hidden;background:radial-gradient(130% 150% at 18% 0%,#1B3C77 0%,${C.navy} 58%);border-radius:24px;padding:22px 20px 20px;margin-bottom:20px;color:#fff;box-shadow:0 18px 40px -12px rgba(12,26,51,.5),0 1px 0 rgba(255,255,255,.06) inset;}
.hero::before{content:"";position:absolute;inset:-40% -10% auto -10%;height:150%;pointer-events:none;
  background:radial-gradient(45% 42% at 30% 18%,rgba(63,208,230,.28),transparent 70%),radial-gradient(42% 40% at 82% 8%,rgba(90,148,242,.30),transparent 72%);
  animation:auroraflutua 12s ease-in-out infinite;}
.hero>*{position:relative;}
.herohello{color:#fff;}
.herodate{color:#8FA5C8;font-size:13px;margin:5px 0 3px;text-transform:capitalize;}
.herosub{color:#7FE3EE;font-size:14px;font-weight:600;margin:0 0 18px;}
.rings{display:flex;justify-content:space-between;gap:6px;}
.ringbox{flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;}
.ringbox svg circle,.ringbox svg path{transition:all .3s;}
.ring-cheio svg{animation:ringpop .5s cubic-bezier(.2,.9,.3,1.5);}
@keyframes ringpop{0%{transform:scale(1);}40%{transform:scale(1.12);}100%{transform:scale(1);}}
.ringlabel{font-size:11px;color:#A9BBD8;letter-spacing:.05em;text-transform:uppercase;font-weight:600;}
.ring-cheio .ringlabel{color:#7FE3EE;}
.herochips{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;}

/* Glassmorphism de verdade: blur + saturação + um fio de luz na borda de cima
   (a "refração" da beirada de vidro), em vez de só um blur chapado. */
.bnav{position:fixed;left:0;right:0;bottom:0;z-index:45;display:flex;justify-content:center;background:rgba(249,251,255,.72);-webkit-backdrop-filter:blur(20px) saturate(1.6);backdrop-filter:blur(20px) saturate(1.6);border-top:1px solid rgba(255,255,255,.7);box-shadow:0 -8px 24px -12px rgba(31,74,150,.25);padding:7px 6px calc(9px + env(safe-area-inset-bottom));}
.bnavin{position:relative;display:flex;width:100%;max-width:520px;}
/* pílula que desliza pra aba ativa (posicionada por --i via style inline).
   --n = quantas abas (3 padrão, 4 quando tem a de treino). */
.bnavin{--n:3;}
.bnavin.bnav4{--n:4;}
.bnavin::before{content:"";position:absolute;top:0;left:calc(var(--i,0) * (100% / var(--n)));width:calc(100% / var(--n));height:100%;padding:3px;background:linear-gradient(180deg,${C.blueSoft},rgba(226,236,252,.4));border-radius:14px;transition:left .32s cubic-bezier(.35,1.1,.4,1);z-index:0;}
.bitem{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;background:transparent;border:none;color:${C.muted};font-family:Inter,sans-serif;font-size:11px;font-weight:600;cursor:pointer;padding:6px 0 4px;transition:color .2s,transform .15s;}
.bitem svg{width:23px;height:23px;transition:transform .25s cubic-bezier(.2,.9,.3,1.5);}
.bitem:active{transform:scale(.92);}
.bitem-on{color:${C.blue};}
.bitem-on svg{transform:translateY(-1px) scale(1.08);filter:drop-shadow(0 4px 8px rgba(31,95,230,.4));}

button{touch-action:manipulation;}
.wrap button:not(.pip):not(.node):active{transform:scale(.96);}
.card{transition:box-shadow .2s,transform .2s;}
.vit-done .vitinput{text-decoration:line-through;text-decoration-color:${C.blue}88;color:#6E86B5;transition:color .3s;}
.line{transition:background-color .45s;}
.ringbox{background:transparent;border:none;cursor:pointer;font-family:Inter,sans-serif;padding:0;}
.ringbox:active{transform:scale(.94);}
.focusringwrap{position:relative;display:flex;align-items:center;justify-content:center;}
.focusringwrap .focusclock{position:absolute;font-size:34px;}

.onb{position:fixed;inset:0;z-index:96;background:rgba(12,26,51,.82);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fade .25s;}
.onbcard{background:${C.bg};border-radius:22px;padding:26px 22px;width:100%;max-width:400px;max-height:88dvh;overflow-y:auto;overscroll-behavior:contain;animation:rise .3s cubic-bezier(.2,.8,.2,1);}
.onbdots{display:flex;gap:7px;justify-content:center;margin-bottom:18px;}
.onbdot{width:8px;height:8px;border-radius:50%;background:${C.faint};transition:all .2s;}
.onbdot-on{background:${C.blue};width:22px;border-radius:99px;}
.onbstep{display:flex;flex-direction:column;align-items:center;text-align:center;}
.onbstep .flabel{align-self:flex-start;text-align:left;}
.onbstep .frow{width:100%;text-align:left;}
.onbh{font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;margin:10px 0 8px;letter-spacing:-.02em;}
.onbp{font-size:14.5px;line-height:1.6;color:${C.muted};margin:0 0 16px;}
.onbinput{width:100%;border:1px solid ${C.faint};border-radius:11px;padding:12px 13px;font-family:Inter,sans-serif;font-size:16px;color:${C.ink};background:${C.surface};outline:none;resize:vertical;min-height:44px;margin-bottom:4px;text-align:left;}
.onbinput:focus{border-color:${C.blue};}
.onbbtn{width:100%;margin-top:14px;background:linear-gradient(120deg,${C.cyan},${C.blue});color:#fff;border:none;border-radius:12px;padding:14px;font-weight:700;font-size:15px;cursor:pointer;font-family:Inter,sans-serif;}
.onbskip{background:transparent;border:none;color:${C.muted};font-size:13px;margin-top:10px;cursor:pointer;font-family:Inter,sans-serif;}
.onbfirst{font-size:12.5px;color:${C.blue};margin:12px 0 0;font-weight:600;}

.datarow{display:flex;gap:8px;justify-content:center;margin-top:14px;}
.databtn{background:transparent;border:1px solid ${C.faint};color:${C.muted};font-size:12px;font-weight:600;padding:9px 14px;border-radius:99px;cursor:pointer;font-family:Inter,sans-serif;}
.databtn:hover{border-color:${C.blue};color:${C.blue};}

.watercard{background:linear-gradient(180deg,#EDFBFD,${C.surface});}
/* CONSERTO do mobile: eram 8 gotas numa fileira e o aspect-ratio:1 brigava com o
   min-height:44px que eu tinha posto pro toque — as gotas esticavam e "quebravam".
   Agora 2 fileiras de 4: cada gota fica ~70px (bem acima de 44) e volta redonda. */
.drops{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:8px 0 14px;}
.drop{aspect-ratio:1;border-radius:50% 50% 50% 50% / 62% 62% 38% 38%;border:2px solid ${C.cyan}66;background:transparent;cursor:pointer;transition:transform .2s cubic-bezier(.2,.9,.3,1.4),background .2s,border-color .2s,box-shadow .2s;padding:0;}
.drop:hover{border-color:${C.cyan};}
.drop-on{background:radial-gradient(120% 100% at 40% 25%,#9DEBF3,${C.cyan});border-color:${C.cyan};box-shadow:0 6px 14px -4px rgba(15,181,199,.5);animation:popcheck .3s;}
.waterbtns{display:flex;gap:8px;}
.waterbtn{flex:1;background:${C.cyan};color:#04323a;border:none;border-radius:11px;padding:12px;font-weight:700;font-size:14px;cursor:pointer;font-family:Inter,sans-serif;}
.waterbtn.ghost{flex:0 0 64px;background:transparent;border:1px solid ${C.faint};color:${C.muted};font-weight:600;}
.waterdone{margin:12px 0 0;font-size:13px;color:#0A8A99;font-weight:600;text-align:center;}

.wkpriority{width:100%;border:1px dashed ${C.blue}66;border-radius:11px;padding:11px 13px;font-family:Inter,sans-serif;font-size:16px;font-weight:500;color:${C.ink};background:${C.blueSoft}55;outline:none;margin:4px 0 12px;}
.wkpriority:focus{border-style:solid;border-color:${C.blue};}
.wkpriority::placeholder{color:#8FA5C8;font-weight:400;}

.gratlabel{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.cyan};font-weight:700;margin:2px 0 7px;}
.gratinput{width:100%;border:1px solid #34456A;border-radius:11px;padding:12px 13px;font-family:Inter,sans-serif;font-size:16px;color:#EAF0FB;background:rgba(255,255,255,.06);outline:none;margin-bottom:14px;}
.gratinput::placeholder{color:#7E93B8;}
.gratinput:focus{border-color:${C.cyan};}

.readcard{background:linear-gradient(180deg,#F3F5FF,${C.surface});}
.readinput{width:100%;border:1px solid ${C.faint};border-radius:11px;padding:12px 13px;font-family:Inter,sans-serif;font-size:16px;color:${C.ink};background:${C.surface};outline:none;margin-bottom:10px;}
.readinput:focus{border-color:${C.blue};}
.readbtn{width:100%;background:${C.blue};color:#fff;border:none;border-radius:11px;padding:13px;font-weight:600;font-size:15px;cursor:pointer;font-family:Inter,sans-serif;margin-top:4px;}
.readbtn:disabled{background:${C.faint};color:#9DAEC9;cursor:default;}
.readtitle{font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700;margin:4px 0 10px;letter-spacing:-.01em;}
.readbtns{display:flex;gap:8px;margin-top:14px;align-items:stretch;}
.readquick{flex:1;background:${C.blueSoft};border:1px solid ${C.blue}55;color:${C.blue};border-radius:10px;padding:11px 0;font-weight:700;font-size:13px;cursor:pointer;font-family:Inter,sans-serif;}
.readquick.alt{background:${C.blue};border-color:${C.blue};color:#fff;}
.readnum{flex:0 0 64px;margin:0;padding:11px 8px;text-align:center;}
.readtoday{margin:12px 0 0;font-size:13px;color:${C.blue};font-weight:600;text-align:center;}
.readdone{background:linear-gradient(120deg,${C.blue},${C.cyan});color:#fff;font-size:14px;line-height:1.5;padding:14px;border-radius:12px;margin:6px 0 12px;animation:pop .35s cubic-bezier(.2,.9,.3,1.3);}
.readdone strong{font-weight:700;}

/* Sombra tintada de azul (não preto), um fio de luz no topo e um brilho que
   sobe no toque: dá o acabamento "caro" sem pesar. */
.card{position:relative;background:${C.surface};border:1px solid ${C.faint};border-radius:20px;padding:19px;margin-bottom:20px;
  box-shadow:0 1px 0 rgba(255,255,255,.9) inset, 0 6px 22px -8px rgba(31,74,150,.20), 0 2px 6px -2px rgba(31,74,150,.10);
  transition:box-shadow .25s ease, transform .2s ease;}
.wrap>section.card:active{transform:translateY(1px);}
.q{font-size:13px;font-weight:600;color:${C.muted};margin:0 0 10px;}
.q-gap{margin-top:18px;}
/* Dez pips numa fileira davam ~27x34px num iPhone. Duas fileiras de cinco dão
   ~57x44px cada: o polegar acerta o número que queria. */
.energy{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;}
.pip{font-family:'Space Mono',monospace;font-size:14px;border:1px solid ${C.faint};background:${C.surface};color:${C.muted};border-radius:10px;height:44px;cursor:pointer;transition:transform .2s cubic-bezier(.2,.9,.3,1.5),background .2s,color .2s,border-color .2s,box-shadow .2s;}
.pip:hover{border-color:${C.blue};}
.pip-on{background:linear-gradient(135deg,${C.blue},#3E7BF0);color:#fff;border-color:transparent;box-shadow:0 5px 12px -4px ${C.blue}88;transform:translateY(-1px);}
.seg{display:flex;gap:6px;}
.segbtn{flex:1;padding:11px 0;border:1px solid ${C.faint};background:transparent;border-radius:10px;font-size:14px;font-weight:500;color:${C.muted};cursor:pointer;transition:all .15s;font-family:Inter,sans-serif;}
.segbtn:hover{border-color:${C.blue};}
.segbtn-on{background:${C.blueSoft};border-color:${C.blue};color:${C.blue};font-weight:600;}

.focus{background:${C.navy};border-color:${C.navy};}
.focus h2{color:#fff;}
.focus .tally{color:#7E93B8;}
.focus .sectnote{color:#A9BBD8;}
.focusbtns{display:flex;gap:12px;margin-top:14px;}
.focusstart{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:16px 0;border-radius:14px;border:1px solid ${C.blue};background:${C.blue}22;color:#fff;cursor:pointer;transition:all .15s;font-family:Inter,sans-serif;}
.focusstart.alt{border-color:${C.cyan};background:${C.cyan}1F;}
.focusstart:hover{transform:translateY(-2px);}
.fbig{font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:800;}
.fsml{font-size:12px;color:#A9BBD8;}
.focusrun{display:flex;flex-direction:column;align-items:center;gap:14px;padding:8px 0 4px;}
.focusclock{font-family:'Space Mono',monospace;font-size:52px;font-weight:700;color:${C.cyan};letter-spacing:.02em;}
.focusctrl{display:flex;gap:10px;}
.fbtn{background:${C.blue};color:#fff;border:none;border-radius:10px;padding:10px 20px;font-weight:600;font-size:14px;cursor:pointer;font-family:Inter,sans-serif;}
.fbtn.ghost{background:transparent;border:1px solid #3A4A6A;color:#A9BBD8;}
.focusdone{text-align:center;color:#DDE6F5;padding:8px 0;}
.focusdone p{margin:0 0 14px;font-size:15px;}

.secthead{display:flex;align-items:baseline;justify-content:space-between;border-bottom:1.5px solid ${C.ink};padding-bottom:7px;margin-bottom:4px;}
.secthead.nobord{border:none;padding-bottom:0;margin-bottom:8px;}
.secthead h2{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:17px;letter-spacing:-.01em;margin:0;}
.tally{font-family:'Space Mono',monospace;font-size:12px;color:${C.muted};}
.sectnote{font-size:13px;color:${C.muted};line-height:1.5;margin:8px 0 14px;}
.addbtn{background:${C.blueSoft};border:1px solid ${C.blue}55;color:${C.blue};font-size:13px;font-weight:600;min-height:40px;padding:0 14px;border-radius:99px;cursor:pointer;font-family:Inter,sans-serif;align-self:center;}

.celebra{position:relative;overflow:hidden;background:linear-gradient(100deg,${C.blue},${C.cyan});color:#fff;font-weight:700;font-size:14px;padding:13px 15px;border-radius:13px;margin:10px 0 14px;box-shadow:0 10px 24px -10px ${C.blue}99;animation:pop .35s cubic-bezier(.2,.9,.3,1.3);}
/* brilho diagonal que varre a faixa, uma vez a cada ciclo */
.celebra::after{content:"";position:absolute;top:0;left:-60%;width:50%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-18deg);animation:varre 2.6s ease-in-out .3s infinite;}
@keyframes varre{0%{left:-60%;}55%,100%{left:130%;}}
.lowbanner{background:${C.goldSoft};border:1px solid ${C.gold}55;color:#7A5A12;font-size:13px;line-height:1.5;padding:11px 14px;border-radius:12px;margin:10px 0 14px;}
.lowbanner strong{color:${C.gold};}

.vits{display:flex;flex-direction:column;gap:9px;}
.vit{position:relative;overflow:hidden;display:flex;gap:12px;align-items:center;background:${C.surface};border:1px solid ${C.faint};border-radius:14px;padding:13px 14px;transition:background .3s,border-color .3s,box-shadow .3s;}
.vit-done{background:linear-gradient(100deg,${C.blueSoft},#EAF6FF);border-color:${C.blue}77;box-shadow:0 6px 16px -8px ${C.blue}55;}
.vitbody{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
.vitlabel{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${C.muted};font-weight:600;}
.vit-done .vitlabel{color:${C.blue};}
.vitinput{border:none;background:transparent;font-family:Inter,sans-serif;font-size:16px;font-weight:500;color:${C.ink};width:100%;padding:0;outline:none;}
.vitinput::placeholder{color:#9DAEC9;font-weight:400;}
/* O botão mais tocado do app. Continua com o visual pequeno (28px), mas: a área
   de toque real é 44px (::after invisível), e ao marcar dá um pop de mola + um
   anel que irradia (::before). Marcar uma vitória tem que dar gostinho. */
.check{position:relative;flex:none;width:28px;height:28px;border-radius:9px;border:1.5px solid ${C.faint};background:transparent;cursor:pointer;color:#fff;font-size:15px;font-weight:700;transition:transform .2s cubic-bezier(.2,.9,.3,1.5),background .2s,border-color .2s,box-shadow .2s;display:flex;align-items:center;justify-content:center;}
.check::after{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:44px;height:44px;}
.check::before{content:"";position:absolute;inset:-4px;border-radius:12px;border:2px solid ${C.cyan};opacity:0;pointer-events:none;}
.check:hover{border-color:${C.blue};}
.check-on{background:linear-gradient(135deg,${C.blue},${C.cyan});border-color:transparent;box-shadow:0 6px 16px -5px ${C.blue}cc;}
.check-on::before{animation:irradia .55s ease-out;}
@keyframes irradia{0%{opacity:.65;transform:scale(.9);}100%{opacity:0;transform:scale(2);}}

.weekcard{background:linear-gradient(180deg,#F1F6FF,${C.surface});}
.weekhero{display:flex;align-items:center;gap:16px;margin:14px 0 16px;}
.weekbig{font-family:'Bricolage Grotesque',sans-serif;font-size:52px;font-weight:800;line-height:.9;background:linear-gradient(120deg,${C.blue},${C.cyan});-webkit-background-clip:text;background-clip:text;color:transparent;}
.weekbigsub{font-size:24px;color:${C.muted};-webkit-text-fill-color:${C.muted};}
.weekbiglabel{font-size:13px;color:${C.muted};line-height:1.35;font-weight:500;}
.wkbars{display:flex;gap:8px;align-items:flex-end;height:84px;margin-bottom:14px;}
.wkcol{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end;}
.wktrack{width:100%;flex:1;background:${C.faint}77;border-radius:7px;display:flex;align-items:flex-end;overflow:hidden;}
.wkfill{width:100%;background:${C.faint};border-radius:7px;transition:height .4s;}
.wkfill.part{background:${C.blueSoft};}
.wkfill.full{background:linear-gradient(180deg,${C.cyan},${C.blue});}
.wkday{font-family:'Space Mono',monospace;font-size:11px;color:${C.muted};}
.wkday-now{color:${C.blue};font-weight:700;}
.wkstats{display:flex;gap:8px;margin-bottom:14px;}
.wkstat{flex:1;background:${C.surface};border:1px solid ${C.faint};border-radius:11px;padding:10px 8px;text-align:center;}
.wksv{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:800;color:${C.ink};}
.wksl{display:block;font-size:11.5px;color:${C.muted};margin-top:3px;letter-spacing:.02em;line-height:1.3;}
.weekread{font-size:13.5px;line-height:1.6;color:${C.ink};margin:0 0 8px;}
.weekclose{font-size:13px;font-style:italic;color:${C.blue};line-height:1.5;margin:0;}

.weight .wrow{display:flex;justify-content:space-between;align-items:flex-end;margin:6px 0 12px;}
.wbig{font-family:'Bricolage Grotesque',sans-serif;font-size:30px;font-weight:800;color:${C.blue};letter-spacing:-.02em;}
.wunit{font-size:13px;color:${C.muted};}
.wgoal{font-size:13px;color:${C.muted};}
.goalinput{width:48px;font-family:'Space Mono',monospace;font-size:16px;border:none;border-bottom:1.5px solid ${C.faint};background:transparent;text-align:center;color:${C.ink};padding:2px 0;}
.whint{font-size:12px;color:${C.muted};margin:10px 0 8px;line-height:1.5;}
.spark{width:100%;height:46px;display:block;margin:6px 0 10px;}
.sparkempty{font-size:12px;color:${C.muted};font-style:italic;margin:6px 0 10px;}
.wadd{display:flex;gap:8px;}
.winput{flex:1;border:1px solid ${C.faint};border-radius:10px;padding:10px 12px;font-family:Inter,sans-serif;font-size:16px;color:${C.ink};background:${C.bg};outline:none;}
.wbtn{background:${C.blue};color:#fff;border:none;border-radius:10px;padding:0 18px;font-weight:600;font-size:14px;cursor:pointer;font-family:Inter,sans-serif;}

.fuel{background:linear-gradient(180deg,#F4F8FF,${C.surface});}
.bar{margin-top:12px;}
.barlabel{display:flex;justify-content:space-between;font-size:12px;color:${C.muted};margin-bottom:6px;}
.barnum{font-family:'Space Mono',monospace;}
.track{height:9px;background:${C.faint};border-radius:99px;overflow:hidden;}
.fillgold{height:100%;background:${C.gold};border-radius:99px;transition:width .4s;}
.fillcyan{height:100%;background:${C.cyan};border-radius:99px;transition:width .4s;}
.fillblue{height:100%;background:linear-gradient(90deg,${C.blue},${C.cyan});border-radius:99px;transition:width .4s;}

.timeline{margin-top:6px;}
.row{display:flex;gap:14px;}
.rail{position:relative;width:26px;flex:none;display:flex;justify-content:center;}
.line{position:absolute;top:0;bottom:0;width:2px;background:${C.faint};}
.line-on{background:${C.blue};}
.line-end{bottom:50%;}
.node{position:relative;margin-top:16px;width:24px;height:24px;border-radius:50%;border:2px solid ${C.faint};background:${C.bg};cursor:pointer;z-index:2;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;transition:all .15s;padding:0;}
/* Mesma ideia do .check: o nó continua pequeno, mas o dedo acerta numa área de 44px. */
.node::after{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:44px;height:44px;border-radius:50%;}
.node-meal{border-color:${C.gold};}
.node-block{border-color:${C.blue};}
.node:hover{transform:scale(1.12);}
.node-on{background:${C.blue};border-color:${C.blue};}
.rowbody{flex:1;padding:12px 0 14px;min-width:0;}
.row-done .rowbody{opacity:.5;}
.rowtop{display:flex;align-items:center;gap:9px;margin-bottom:3px;}
.time{font-family:'Space Mono',monospace;font-size:13px;color:${C.ink};font-weight:700;}
/* "700 kcal · 32g" é dado que se confere todo dia, com o celular na mão comendo.
   Estava em 10px. Piso de 12px pra qualquer número que a pessoa realmente lê. */
.kcalchip{font-family:'Space Mono',monospace;font-size:12px;color:#8A5E0E;background:${C.goldSoft};padding:3px 8px;border-radius:99px;}
/* Margem negativa: a área de toque cresce pra 44px sem empurrar o layout. */
.editbtn{margin-left:auto;padding:12px 10px;margin-top:-12px;margin-bottom:-12px;margin-right:-10px;background:transparent;border:none;color:${C.muted};font-size:13px;cursor:pointer;font-family:Inter,sans-serif;text-decoration:underline;text-underline-offset:2px;}
.editbtn:hover{color:${C.blue};}
.rowtitle{font-weight:600;font-size:15px;margin:0 0 3px;}
.rowdetail{font-size:13px;color:${C.muted};line-height:1.5;margin:0;}

.report{background:${C.navy};border-color:${C.navy};}
.reporth{font-family:'Bricolage Grotesque',sans-serif;color:#fff;font-size:16px;margin:0 0 10px;font-weight:700;}
.reportp{color:#C3D0E6;font-size:14px;line-height:1.65;margin:0 0 12px;}
.reportp strong{color:#fff;font-weight:600;}
.reporttip{color:${C.cyan};font-size:13px;font-style:italic;line-height:1.5;margin:0 0 16px;}
.reset{width:100%;min-height:48px;padding:12px;background:transparent;border:1px solid #34456A;color:#DDE6F5;border-radius:11px;font-family:Inter,sans-serif;font-size:14px;font-weight:500;cursor:pointer;transition:all .15s;}
.reset:hover{background:#152641;}
.reset.perigo{background:#C0453F;border-color:#C0453F;color:#fff;font-weight:600;}
.resetconf{background:rgba(192,69,63,.14);border:1px solid #8D3C38;border-radius:12px;padding:13px;}
.resetconftxt{font-size:13px;line-height:1.55;color:#F0D2D0;margin:0 0 11px;}
.resetbtns{display:flex;gap:8px;}
.foot{text-align:center;font-size:12px;color:${C.muted};line-height:1.55;margin:22px 4px 0;}

.waviso{margin:10px 0 0;font-size:13px;line-height:1.5;font-weight:600;}
.waviso-ok{color:#0A8A99;}
.waviso-erro{color:#96322C;}

.overlay{position:fixed;inset:0;background:rgba(12,26,51,.55);display:flex;align-items:flex-end;justify-content:center;z-index:50;animation:fade .2s;}
/* dvh, não vh: no iPhone, o teclado subindo não encolhe o vh, e o botão "Salvar"
   ficava escondido atrás do teclado. overscroll-behavior impede o scroll de vazar
   pro fundo quando a folha chega no fim. */
.sheet{background:${C.bg};width:100%;max-width:520px;border-radius:20px 20px 0 0;padding:10px 20px calc(26px + env(safe-area-inset-bottom));max-height:92dvh;overflow-y:auto;overscroll-behavior:contain;animation:rise .25s cubic-bezier(.2,.8,.2,1);}
.sheethandle{width:40px;height:4px;border-radius:99px;background:${C.faint};margin:8px auto 14px;}
.sheeth{font-family:'Bricolage Grotesque',sans-serif;font-size:19px;font-weight:700;margin:0 0 16px;}
.flabel{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};font-weight:600;margin:14px 0 6px;}
.finput{width:100%;border:1px solid ${C.faint};border-radius:11px;padding:12px 13px;font-family:Inter,sans-serif;font-size:16px;color:${C.ink};background:${C.surface};outline:none;}
.finput:focus{border-color:${C.blue};}
.ftext{min-height:64px;resize:vertical;line-height:1.5;}
.frow{display:flex;gap:12px;}
.frow>div{flex:1;}
.sheetbtns{display:flex;gap:10px;margin-top:22px;}
.save{flex:1;background:${C.blue};color:#fff;border:none;border-radius:12px;padding:14px;font-weight:600;font-size:15px;cursor:pointer;font-family:Inter,sans-serif;}
.del{background:transparent;border:1px solid #D08A8A;color:#C0453F;border-radius:12px;padding:14px 18px;font-weight:600;font-size:15px;cursor:pointer;font-family:Inter,sans-serif;}
.cancel{width:100%;background:transparent;border:none;color:${C.muted};padding:14px;margin-top:8px;font-size:14px;cursor:pointer;font-family:Inter,sans-serif;}

@keyframes fade{from{opacity:0;}to{opacity:1;}}
@keyframes rise{from{transform:translateY(30px);}to{transform:translateY(0);}}
@keyframes pop{from{transform:scale(.9);opacity:0;}to{transform:scale(1);opacity:1;}}
button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid ${C.blue};outline-offset:2px;}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}}
/* Numa tela de 360px o texto encolhe, mas o alvo de toque NÃO: 44px continua 44px. */
@media (max-width:380px){.hello{font-size:26px;}.focusclock{font-size:44px;}.weekbig{font-size:44px;}.pip{font-size:13px;}}
`;
