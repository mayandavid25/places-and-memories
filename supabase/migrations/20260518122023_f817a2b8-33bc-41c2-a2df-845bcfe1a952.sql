
-- Enums
create type place_category as enum ('restaurante', 'cafe', 'bar', 'viagem');
create type wishlist_status as enum ('queremos_visitar', 'planejado', 'visitado');
create type entertainment_type as enum ('filme', 'serie', 'jogo', 'livro');
create type entertainment_status as enum ('quero_consumir', 'consumindo', 'concluido');
create type event_status as enum ('futuro', 'aconteceu', 'cancelado');

-- Couples
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamptz not null default now()
);

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username text unique,
  avatar_url text,
  couple_id uuid references public.couples(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Couple invites
create table public.couple_invites (
  code text primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz
);

-- Security definer helper
create or replace function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_in_couple(_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and couple_id = _couple_id
  )
$$;

-- Places
create table public.places (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  category place_category not null,
  location text,
  visited_at date,
  photos text[] not null default '{}',
  favorited boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.places (couple_id);

create table public.place_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (place_id, user_id)
);
create index on public.place_reviews (place_id);

-- Wishlist
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  category place_category,
  note text,
  priority int not null default 2 check (priority between 1 and 3),
  status wishlist_status not null default 'queremos_visitar',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.wishlist_items (couple_id);

-- Entertainment
create table public.entertainment_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  type entertainment_type not null,
  title text not null,
  cover_url text,
  status entertainment_status not null default 'quero_consumir',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.entertainment_items (couple_id);

create table public.entertainment_reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.entertainment_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (item_id, user_id)
);

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  description text,
  date date not null,
  time time,
  location text,
  status event_status not null default 'futuro',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.events (couple_id, date);

-- Enable RLS
alter table public.couples enable row level security;
alter table public.profiles enable row level security;
alter table public.couple_invites enable row level security;
alter table public.places enable row level security;
alter table public.place_reviews enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.entertainment_items enable row level security;
alter table public.entertainment_reviews enable row level security;
alter table public.events enable row level security;

-- Profiles: users see profiles in their couple + their own
create policy "view own profile" on public.profiles for select using (id = auth.uid());
create policy "view couple profiles" on public.profiles for select using (
  couple_id is not null and couple_id = public.current_couple_id()
);
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid());

-- Couples
create policy "view own couple" on public.couples for select using (public.is_in_couple(id));
create policy "create couple" on public.couples for insert with check (true);
create policy "update own couple" on public.couples for update using (public.is_in_couple(id));

-- Couple invites
create policy "view invites for own couple" on public.couple_invites for select using (
  public.is_in_couple(couple_id) or used_at is null
);
create policy "create invite for own couple" on public.couple_invites for insert with check (
  public.is_in_couple(couple_id) and created_by = auth.uid()
);
create policy "update invite when joining" on public.couple_invites for update using (auth.uid() is not null);

-- Generic couple-scoped tables
create policy "couple select places" on public.places for select using (public.is_in_couple(couple_id));
create policy "couple insert places" on public.places for insert with check (public.is_in_couple(couple_id) and created_by = auth.uid());
create policy "couple update places" on public.places for update using (public.is_in_couple(couple_id));
create policy "couple delete places" on public.places for delete using (public.is_in_couple(couple_id));

create policy "couple select place reviews" on public.place_reviews for select using (
  exists (select 1 from public.places p where p.id = place_id and public.is_in_couple(p.couple_id))
);
create policy "user insert own place review" on public.place_reviews for insert with check (user_id = auth.uid());
create policy "user update own place review" on public.place_reviews for update using (user_id = auth.uid());
create policy "user delete own place review" on public.place_reviews for delete using (user_id = auth.uid());

create policy "couple select wishlist" on public.wishlist_items for select using (public.is_in_couple(couple_id));
create policy "couple insert wishlist" on public.wishlist_items for insert with check (public.is_in_couple(couple_id) and created_by = auth.uid());
create policy "couple update wishlist" on public.wishlist_items for update using (public.is_in_couple(couple_id));
create policy "couple delete wishlist" on public.wishlist_items for delete using (public.is_in_couple(couple_id));

create policy "couple select entertainment" on public.entertainment_items for select using (public.is_in_couple(couple_id));
create policy "couple insert entertainment" on public.entertainment_items for insert with check (public.is_in_couple(couple_id) and created_by = auth.uid());
create policy "couple update entertainment" on public.entertainment_items for update using (public.is_in_couple(couple_id));
create policy "couple delete entertainment" on public.entertainment_items for delete using (public.is_in_couple(couple_id));

create policy "couple select entertainment reviews" on public.entertainment_reviews for select using (
  exists (select 1 from public.entertainment_items i where i.id = item_id and public.is_in_couple(i.couple_id))
);
create policy "user insert own ent review" on public.entertainment_reviews for insert with check (user_id = auth.uid());
create policy "user update own ent review" on public.entertainment_reviews for update using (user_id = auth.uid());
create policy "user delete own ent review" on public.entertainment_reviews for delete using (user_id = auth.uid());

create policy "couple select events" on public.events for select using (public.is_in_couple(couple_id));
create policy "couple insert events" on public.events for insert with check (public.is_in_couple(couple_id) and created_by = auth.uid());
create policy "couple update events" on public.events for update using (public.is_in_couple(couple_id));
create policy "couple delete events" on public.events for delete using (public.is_in_couple(couple_id));

-- Profile auto-create trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "public read photos" on storage.objects for select using (bucket_id = 'photos');
create policy "authed upload photos" on storage.objects for insert with check (bucket_id = 'photos' and auth.uid() is not null);
create policy "owner update photos" on storage.objects for update using (bucket_id = 'photos' and auth.uid() = owner);
create policy "owner delete photos" on storage.objects for delete using (bucket_id = 'photos' and auth.uid() = owner);
