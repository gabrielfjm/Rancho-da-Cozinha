# Rancho da Cozinha

Caderno de receitas pessoal com visual inspirado em fichas antigas, diners e cozinhas de rancho. Funciona como PWA no computador e no celular, guarda alterações offline e sincroniza dados com Supabase quando configurado.

## O que já funciona

- Home, caderno com busca fuzzy e filtros, receita do dia e favoritas.
- Cadastro de receitas com fotos comprimidas no navegador, ingredientes, grupos, frações, passos reordenáveis, timers, utensílios, história, dicas e rascunho automático.
- 833 ingredientes iniciais: 597 registros da TACO/UNICAMP e 236 ingredientes internacionais ou culinários complementares.
- Visualização em caderno aberto, ajuste de porções, conversão para métricas, cálculo nutricional, checkboxes, histórico de preparos, impressão e PDF pelo navegador.
- Modo cozinha com Wake Lock, passos grandes, painel de ingredientes e vários timers.
- “O que faço com o que tenho?”, lista de compras agrupada e agregação de itens repetidos.
- Login com e-mail/senha e Google, RLS, Storage privado, cache Dexie e fila de sincronização.
- Tema “Noite no Rancho”, backup JSON, PWA e layout responsivo.

O plano de telas e o modelo de dados estão em [docs/PLANO.md](docs/PLANO.md). O schema versionado está em [supabase/migrations/202610100001_initial.sql](supabase/migrations/202610100001_initial.sql).

## Instalar no telefone

Abra `https://rancho-da-cozinha.vercel.app` no celular. Na tela de entrada, toque em **Instalar aplicativo**. Se o navegador não mostrar essa opção, toque em **Como instalar** para ver o caminho no menu do Chrome ou no compartilhamento do Safari. Depois, abra o ícone do Rancho na tela inicial e entre com a mesma conta usada no site.

O aplicativo instalado usa a mesma versão publicada no site: procura atualizações quando volta ao primeiro plano e periodicamente enquanto está aberto. Receitas e lista de compras são sincronizadas com o Supabase ao abrir, ao reconectar e a cada minuto em primeiro plano. Alterações feitas sem conexão ficam no aparelho e são enviadas quando a internet volta.

## Rodar localmente

Requer Node.js 20 ou superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sem variáveis de ambiente, o app abre em modo local e já contém três receitas de exemplo. Os dados ficam no IndexedDB do navegador.

## Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor**, cole o conteúdo de `supabase/migrations/202610100001_initial.sql` e execute.
3. Em **Authentication → Providers**, mantenha e-mail ativo. Para Google, ative o provedor e informe as credenciais OAuth do Google.
4. Em **Authentication → URL Configuration**, cadastre a URL local e a URL final da Vercel em **Redirect URLs**.
5. Copie a URL do projeto e a chave pública `anon` para `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

6. Para popular o catálogo no Supabase, defina temporariamente a chave de serviço no terminal e execute `npm run seed`. A chave de serviço é usada somente pelo script e nunca deve receber o prefixo `VITE_` nem ir para o Git.

PowerShell:

```powershell
$env:VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
npm run seed
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
```

## Fonte TACO

A base oficial pode ser atualizada pela página de [publicações do NEPA/UNICAMP](https://nepa.unicamp.br/publicacoes/). Baixe a “Tabela TACO (Excel)” como `taco.xlsx` na raiz e rode:

```bash
python scripts/extract_taco.py
```

O script lê a planilha sem bibliotecas externas, normaliza as informações nutricionais e recria `src/data/ingredients.json` junto da curadoria complementar. Depois rode `npm run seed` para atualizar o Supabase.

## Deploy na Vercel

1. Importe este repositório na Vercel.
2. Use o framework **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em **Project Settings → Environment Variables**.
4. Faça o deploy e depois acrescente a URL publicada às Redirect URLs do Supabase.

O `vercel.json` já redireciona as rotas para a aplicação e evita cache antigo do service worker.

## Verificação

```bash
npm run build
```

O comando executa o TypeScript em modo estrito, gera o bundle e monta o service worker e o manifesto da PWA.
