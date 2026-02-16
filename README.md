# SaltInvest (Supabase)

## Requisitos
- Node 18+

## 1) Criar projeto no Supabase
1. Crie um projeto no Supabase
2. Abra o **SQL Editor** e execute: `supabase/schema.sql`

## 2) Variáveis de ambiente
Crie um arquivo `.env` na raiz:

```bash
cp .env.example .env
```

Preencha:

```env
VITE_SUPABASE_URL="https://xxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="xxxx"
```

## 3) Rodar local
```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

## Observações
- O layout/UX foi preservado; apenas a camada de dados migrou de Firebase para Supabase.
- Rotas via React Router foram aplicadas para cada tela.
