-- Linha — schema inicial.
-- Fica num schema proprio ("linha") porque o banco "dados" e compartilhado com o Typebot.

create schema if not exists linha;

create table if not exists linha.users (
  id            uuid primary key,
  email         text not null,
  nome          text not null,
  senha_hash    text not null,
  role          text not null default 'user',
  status        text not null default 'pendente',
  criado_em     timestamptz not null default now(),
  liberado_em   timestamptz,
  liberado_por  uuid references linha.users (id) on delete set null,
  ultimo_login  timestamptz,
  constraint users_role_valido   check (role in ('user', 'admin')),
  constraint users_status_valido check (status in ('pendente', 'ativo', 'bloqueado'))
);

-- E-mail e sempre gravado em minusculas pela aplicacao; o indice unico e a garantia final.
create unique index if not exists users_email_uniq on linha.users (email);
create index if not exists users_status_idx on linha.users (status);

-- Sessao opaca: o cookie carrega o token cru, o banco guarda so o sha256.
-- Vazar um dump do banco nao da acesso a nenhuma sessao.
create table if not exists linha.sessions (
  token_hash   text primary key,
  user_id      uuid not null references linha.users (id) on delete cascade,
  criado_em    timestamptz not null default now(),
  expira_em    timestamptz not null,
  ultimo_uso   timestamptz not null default now(),
  user_agent   text,
  ip           text
);

create index if not exists sessions_user_idx    on linha.sessions (user_id);
create index if not exists sessions_expira_idx  on linha.sessions (expira_em);

-- O estado do app (rotina, vitorias, dieta, peso, historico) de cada usuario.
-- "versao" e o controle de concorrencia otimista entre dispositivos.
create table if not exists linha.app_state (
  user_id       uuid primary key references linha.users (id) on delete cascade,
  data          jsonb not null default '{}'::jsonb,
  versao        bigint not null default 0,
  atualizado_em timestamptz not null default now()
);

-- Trilha de auditoria: quem liberou/bloqueou quem, e quando.
create table if not exists linha.audit_log (
  id        bigserial primary key,
  ator_id   uuid references linha.users (id) on delete set null,
  acao      text not null,
  alvo_id   uuid,
  meta      jsonb,
  ip        text,
  em        timestamptz not null default now()
);

create index if not exists audit_em_idx on linha.audit_log (em desc);
