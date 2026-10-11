-- Rancho da Cozinha: aplicar no SQL Editor ou via Supabase CLI.
create extension if not exists pg_trgm;

create table if not exists public.ingredients (
  id text primary key,
  name text not null,
  aliases text[] not null default '{}',
  category text not null,
  units text[] not null,
  default_unit text not null,
  grams_per_unit jsonb not null default '{}'::jsonb,
  nutrition jsonb,
  source text not null check (source in ('TACO', 'Curada'))
);
create index if not exists ingredients_search_trgm on public.ingredients using gin (lower(name) gin_trgm_ops);
alter table public.ingredients enable row level security;
create policy "Catálogo público de ingredientes" on public.ingredients for select using (true);

-- Cada entidade é um documento versionado. A fila IndexedDB replica documentos,
-- inclusive tombstones, ao voltar a conexão.
create table if not exists public.recipes (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  shared boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists recipes_owner_updated on public.recipes(owner_id, updated_at desc);
alter table public.recipes enable row level security;
create policy "Minhas receitas" on public.recipes for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Receitas compartilhadas" on public.recipes for select to anon using (shared and deleted_at is null);

create table if not exists public.personal_ingredients (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.personal_ingredients enable row level security;
create policy "Meus ingredientes" on public.personal_ingredients for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table if not exists public.collections (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.collections enable row level security;
create policy "Minhas coleções" on public.collections for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table if not exists public.shopping_items (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.shopping_items enable row level security;
create policy "Minhas compras" on public.shopping_items for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table if not exists public.cook_logs (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.cook_logs enable row level security;
create policy "Meu histórico" on public.cook_logs for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "Ler minhas fotos" on storage.objects for select to authenticated
using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Enviar minhas fotos" on storage.objects for insert to authenticated
with check (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Atualizar minhas fotos" on storage.objects for update to authenticated
using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Excluir minhas fotos" on storage.objects for delete to authenticated
using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- RLS define quais linhas cada papel enxerga; os grants liberam o acesso às tabelas.
grant usage on schema public to anon, authenticated;
grant select on table public.ingredients to anon, authenticated;
grant select on table public.recipes to anon;
grant select, insert, update, delete on table
  public.recipes,
  public.personal_ingredients,
  public.collections,
  public.shopping_items,
  public.cook_logs
to authenticated;
