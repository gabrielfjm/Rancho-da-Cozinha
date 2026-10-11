# Plano do Rancho da Cozinha

## Telas

| Tela | Uso principal |
| --- | --- |
| Início | Receita do dia, últimas fichas, favoritas e acesso rápido |
| Caderno | Busca por nome, ingrediente ou tag; filtros e coleções |
| Ficha da receita | Ingredientes, preparo, porções, medidas, nutrição, histórico e impressão |
| Nova/editar receita | Dados, fotos, ingredientes, grupos, passos, dicas e rascunho automático |
| Modo cozinha | Um passo por vez, timers, ingredientes e tela acesa |
| Despensa | Escolher ingredientes disponíveis e ordenar receitas por cobertura |
| Lista de compras | Agregar receitas, agrupar por setor e marcar comprados |
| Ajustes | Conta, modo noturno, backup JSON e sincronização |

No computador, a ficha aberta usa duas páginas; no celular, ingredientes e preparo ficam em abas. A navegação principal mantém três entradas visíveis: Início, Caderno e Compras.

## Modelo de dados

- `IngredientBase`: nome, sinônimos, categoria, unidades válidas, fatores em gramas e nutrição por 100 g. O catálogo global vem da TACO e de curadoria; itens pessoais ficam isolados por usuário.
- `Recipe`: metadados, fotos, história, ingredientes ordenados com grupos, passos ordenados, utensílios, dicas, avaliação e estado de rascunho.
- `Collection`: nome e IDs das receitas.
- `ShoppingItem`: ingrediente, quantidade, unidade, setor e estado de compra.
- `CookLog`: data e nota de um preparo.

As tabelas pessoais têm `owner_id`, `payload` JSONB, data da última alteração e tombstone para exclusão offline. RLS compara `owner_id` com `auth.uid()`. O catálogo de ingredientes é somente leitura pública. Fotos ficam em bucket privado, sob pasta do ID do usuário.

## Sincronização

Dexie guarda documentos e uma fila de alterações. O app registra mudanças primeiro no dispositivo. Quando há sessão e conexão, envia a fila ao Supabase e baixa a versão mais recente de cada documento. A resolução de conflito usa a última edição por documento. Para usar a mesma conta no PC e no celular, configure o mesmo projeto Supabase nos dois. O modo sem Supabase é um caderno local de demonstração.

## Direção visual

Papel creme `#F5ECD7`, vermelho celeiro `#9B2D20`, jeans `#3E5C76`, couro `#6B4226`, trigo `#D4A23A`, sálvia `#7D8F69` e tinta `#2E1F14`. Rye assina os títulos; Zilla Slab os subtítulos; Lora lê bem em receitas longas; Caveat dá voz às notas. Fichas pautadas, etiqueta de fita, divisores ornamentais e barra xadrez compõem a tela inicial de referência. O tema escuro é “Noite no Rancho”.
