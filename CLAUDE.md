# Rancho da Cozinha — guia de colaboração

## Projeto

- Repositório: `https://github.com/gabrielfjm/Rancho-da-Cozinha.git`
- Produção: `https://rancho-da-cozinha.vercel.app`
- Aplicação: React 19, TypeScript e Vite
- Dados e autenticação: Supabase
- Hospedagem: Vercel, com deploy automático a partir da branch `main`

## Regras do projeto

- Não ativar planos pagos, assinaturas, Analytics ou recursos que exijam cartão.
- Não incluir chaves, tokens ou senhas no repositório.
- Manter o acesso obrigatório por login.
- Manter a tela de Ajustes exclusiva do administrador configurado em `VITE_ADMIN_EMAIL`.
- Preservar os créditos da Jess Branding no rodapé.
- Preservar a experiência visual country premium e a responsividade.
- Consultar localização apenas com autorização do navegador e manter alternativa quando o acesso for negado.

## Fluxo recomendado para colaborar

1. Atualize a branch antes de começar: `git pull --rebase origin main`.
2. Trabalhe em uma branch própria, por exemplo `claude/nome-da-tarefa`.
3. Rode `npm install` quando necessário.
4. Valide toda alteração com `npm run build`.
5. Envie a branch e abra um pull request para evitar conflitos com outros agentes.
6. Depois do merge em `main`, a Vercel publica automaticamente.

## Estrutura principal

- `src/App.tsx`: navegação, autenticação e páginas principais.
- `src/components/`: formulário, cards e visualização de receitas.
- `src/data/brazilianRecipes.ts`: base brasileira curada do Rancho.
- `src/lib/nutrition.ts`: cálculo automático de calorias e nutrientes.
- `src/lib/weather.ts`: localização e clima para recomendações.
- `src/lib/store.ts`: cache local, Supabase e upload de imagens.
- `src/styles.css`: identidade visual e responsividade.

## App Android

- O APK é uma Trusted Web Activity (Bubblewrap): abre `https://rancho-da-cozinha.vercel.app` em tela cheia, então mudanças no site chegam ao app sem reinstalar.
- Pacote `app.vercel.rancho_da_cozinha.twa`. O projeto Gradle e a chave de assinatura ficam fora do repositório, em `../android/`; nunca versione a chave.
- `public/.well-known/assetlinks.json` precisa conter a impressão SHA-256 da chave; sem ele o app mostra a barra de endereço.
- `public/rancho-da-cozinha.apk` é o arquivo baixado pelo botão “Baixar o app Android”. Só gere um novo APK se mudar nome, ícone ou cores; aumente `appVersionCode` ao fazer isso.

## Variáveis necessárias

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAIL`

Use os valores já configurados no ambiente da Vercel. Não copie valores secretos para commits, issues ou mensagens.
