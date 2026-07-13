-- Fotos de check-in do treino (o "diário": foto pra marcar que treinou).
-- Guardadas como base64 (o app comprime pra ~50-100 KB antes de mandar).
create table if not exists linha.treino_fotos (
  id       bigserial primary key,
  user_id  uuid not null references linha.users (id) on delete cascade,
  tipo     text not null default 'checkin',
  imagem   text not null,
  nota     text,
  em       timestamptz not null default now()
);

create index if not exists treino_fotos_user_idx on linha.treino_fotos (user_id, em desc);
