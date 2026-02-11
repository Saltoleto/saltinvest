# SaltInvest (React + Supabase + PWA)

Este projeto foi gerado a partir do arquivo anexado **SaltInvestFirebase.tsx** (apesar do nome, é Supabase) mantendo:
- lógica e regras
- estilos (Tailwind)
- UX/telas/formulários/botões
- navegação por abas e gamificação

## 1) Pré-requisitos
- Node.js 18+ (recomendado 20+)
- Um projeto no Supabase com **Email Auth** habilitado (ou use anônimo, se disponível)

## 2) Configurar variáveis de ambiente
1. Copie `.env.example` para `.env`
2. Ajuste as variáveis se necessário:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY` (para gerar os insights de IA na tela inicial)
   - `VITE_GEMINI_MODEL` (opcional)

> Obs: este zip já contém um `.env` preenchido com os valores do Supabase do anexo.
> A chave do Gemini **não** vem preenchida por segurança.

## 3) Criar o schema no Supabase
No SQL Editor do seu Supabase, execute:

- `supabase/schema.sql` (recomendado — inclui pgcrypto + políticas com WITH CHECK)
- ou `supabase/SupabaseSql.original.sql` (o original do anexo)

## 4) Rodar localmente
```bash
npm install
npm run dev
```

Build:
```bash
npm run build
npm run preview
```

## PWA
O projeto usa `vite-plugin-pwa` e registra SW automaticamente (`src/main.tsx`).
Em produção/preview, o app pode ser instalado como PWA (Chrome/Edge/Android, e iOS via "Adicionar à Tela de Início").


