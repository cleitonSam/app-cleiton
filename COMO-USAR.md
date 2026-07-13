# Linha — copiloto de rotina

App de rotina instalável no celular (PWA), agora com **login, aprovação de acesso e sincronismo entre aparelhos**. O que você marca no celular aparece no computador, e vice-versa.

Quem se cadastra entra como **pendente**: só passa a usar depois que um administrador libera na tela de administração.

---

## Como rodar na sua máquina

Precisa de Node 20+ e Docker.

```bash
npm install
cp .env.example .env       # e edite os valores
npm run db:local           # sobe um Postgres descartável na porta 55432
npm run dev                # API (3000) + front (5173) juntos
```

Abra `http://localhost:5173`. O primeiro administrador é criado a partir de `ADMIN_EMAIL`/`ADMIN_SENHA` do `.env`.

No `.env` local, deixe `DATABASE_URL=postgres://linha:linha@localhost:55432/linha` e `COOKIE_SECURE=false` (você está em `http://`, sem HTTPS).

Para parar e apagar o banco de teste: `npm run db:local:down`.

---

## Deploy no EasyPanel

O app roda num **único container** que serve a API e o app já compilado. É um serviço só, um domínio só.

### 1. Crie o serviço a partir deste repositório

- Tipo **App**, fonte no GitHub (este repositório).
- Build: **Dockerfile** (já está na raiz). Não precisa configurar comando de build nem start — o Dockerfile cuida de tudo.
- Porta interna: **3000**.

### 2. Ligue no mesmo projeto do Postgres

O banco é o `typebot_dados`, que é **interno** do EasyPanel: só resolve se este serviço estiver no **mesmo projeto/rede** do Postgres. Se estiverem separados, o container sobe mas não acha o banco.

> O app cria e usa um schema próprio, **`linha`**, dentro do banco `dados`. Ele **não encosta** nas tabelas do Typebot.

### 3. Variáveis de ambiente (aba *Environment*)

Obrigatórias:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `postgres://postgress:SUA_SENHA@typebot_dados:5432/dados?sslmode=disable` |
| `SESSION_SECRET` | um valor aleatório de 32+ caracteres (gere abaixo) |
| `ADMIN_EMAIL` | seu e-mail — é a conta que libera os outros |
| `ADMIN_SENHA` | senha forte (10+ caracteres, com letra e número) |
| `ADMIN_NOME` | seu nome |

Gere o `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> **Use só letras e números no `SESSION_SECRET` e na `ADMIN_SENHA`.** Caracteres como `#`, `$`, `&` são cortados pelo painel (o `#` vira comentário) e a variável chega quebrada.

Opcional — **aba Treino com IA** (personal + nutricionista):

| Variável | Valor |
|---|---|
| `OPENROUTER_API_KEY` | sua chave do [OpenRouter](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | `google/gemini-2.5-flash` (padrão, pode omitir) |

Sem essas, a aba Treino ainda funciona (plano, vídeos de execução, biblioteca de exercícios) — só os dois **chats de IA** ficam desligados. A chave fica só no servidor; o navegador nunca a vê.

Em produção, `NODE_ENV=production` já vem da imagem, e o cookie vira `secure` sozinho (só trafega em HTTPS). Não precisa mexer em `COOKIE_SECURE`.

### 4. Domínio e HTTPS

Aponte um domínio no EasyPanel (ele resolve o HTTPS via Let's Encrypt). **PWA precisa de HTTPS** pra instalar como app no celular.

### 5. Suba

Na primeira subida o app cria o schema, as tabelas e o seu usuário administrador. O EasyPanel usa o `HEALTHCHECK` do container (`/api/health`, que dá um `select 1` no banco) pra saber se subiu de verdade.

---

## Primeiro acesso

1. Entre com o `ADMIN_EMAIL` / `ADMIN_SENHA` que você definiu.
2. No menu (canto superior direito) → **Liberar acessos**.
3. Quem se cadastrar aparece ali como *esperando*. Toque em **Liberar acesso**.

Pelo painel você também: bloqueia e desbloqueia, cria alguém já liberado, redefine senha, promove a admin e vê o histórico de quem liberou quem.

---

## Instalar no celular

- **Android (Chrome):** abra o link → menu ⋮ → "Instalar app".
- **iPhone (Safari):** abra o link → Compartilhar → "Adicionar à Tela de Início".

O app abre em tela cheia, funciona offline e sincroniza sozinho quando a rede volta.

---

## Segurança — o que já está feito e o que é com você

Já está no código:

- Senha guardada com **scrypt** (nunca em texto puro).
- Sessão fica no banco (só o hash do token) — bloquear alguém **derruba a sessão na hora**.
- Cada usuário só enxerga os próprios dados; as rotas de admin exigem ser admin.
- Cookie `httpOnly` + `SameSite=Lax` + checagem de origem (anti-CSRF).
- Rate limit no login e no cadastro.
- O app roda como usuário **não-root** dentro do container.

Com você:

- **Troque a senha do Postgres** que apareceu no chat, depois que estiver tudo no ar.
- Guarde o `SESSION_SECRET` num lugar seguro. Trocá-lo desconecta todo mundo (não perde dados, só exige entrar de novo).

### Perdeu a senha do admin?

Suba uma vez com `RESETAR_SENHA_ADMIN=true` (junto de `ADMIN_EMAIL` e `ADMIN_SENHA`), entre, e **remova essa variável** logo depois — enquanto ela existir, a senha é redefinida a cada restart.

---

## Backup

- Cada usuário baixa os próprios dados em **menu → Baixar meus dados** (um arquivo JSON).
- Dá pra restaurar em **menu → Importar backup**.
- O histórico também vive no Postgres; um backup do banco leva junto os dados de todos.
