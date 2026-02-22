# SaltInvest Premium (Baseado no projeto anexado)

Aplicação PWA para **gestão centralizada de investimentos** com UX profissional (tema claro, Material-like), cards, badges, modais e feedback via toasts.

## Requisitos
- Node.js 18+
- Conta e projeto no Supabase

## Setup
1) Copie o arquivo `.env.example` para `.env` e preencha:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

2) Instale e rode:
```bash
npm install
npm run dev
```

## Banco de dados
Os scripts SQL de referência (modelo, views, policies e seeds) estão em `./supabase/schema.sql` (e `schema-performance.sql`).

> Dica: execute no Supabase SQL Editor na ordem do arquivo.

## Rotas
- Rotas públicas: `/login`, `/signup`, `/reset`, `/app/reset-password`
- Área protegida: `/app/*`

---


# SaltInvest (React + Supabase + PWA)

Aplicação PWA para **gestão de investimentos centralizada**, com experiência premium no **web** e **mobile**.

## Stack
- React + TypeScript + Vite
- Supabase (Auth + Postgres + RLS)
- TailwindCSS
- PWA (vite-plugin-pwa)

## Como rodar

### 1) Banco/Supabase
1. Crie um projeto no Supabase.
2. No SQL Editor, execute o script: `supabase/schema.sql`.

> O schema inclui tabelas, views e políticas RLS por `user_id`.

### 2) Variáveis de ambiente
Crie um arquivo `.env.local` na raiz:

```bash
VITE_SUPABASE_URL=SUASUPABASEURL
VITE_SUPABASE_ANON_KEY=SUAANONKEY
```

### 3) Instalar e rodar
```bash
npm i
npm run dev
```

### 4) Build
```bash
npm run build
npm run preview
```

## Rotas protegidas
- Todas as rotas em `/app/*` são protegidas por sessão via `ProtectedRoute`.
- Se não houver sessão, o usuário é redirecionado para `/login`.

## UX profissional
- Layout responsivo (Material light) com AppShell (sidebar no desktop + bottom nav no mobile)
- Dashboard com estatísticas, gráficos, progresso de metas e exposição FGC
- Planejamento mensal com **Total sugerido** baseado nas metas `is_monthly_plan = true`

## Observações importantes
- A chave **anon** do Supabase fica no cliente por padrão (ok). **Nunca** use `service_role` no front-end.
- Se o app mostrar aviso de configuração, verifique `.env.local` e reinicie o dev server.
