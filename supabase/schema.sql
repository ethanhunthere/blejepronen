-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  email_verified boolean default false,
  avatar_url text,
  verification_code text,
  verification_code_expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migration for existing profiles tables
-- ALTER TABLE public.profiles
--   ADD COLUMN IF NOT EXISTS verification_code text,
--   ADD COLUMN IF NOT EXISTS verification_code_expires_at timestamp with time zone;

-- Migration for existing listings tables
-- ALTER TABLE public.listings
--   ADD COLUMN IF NOT EXISTS condition text,
--   ADD COLUMN IF NOT EXISTS floor text,
--   ADD COLUMN IF NOT EXISTS apartment_type text,
--   ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}',
--   ADD COLUMN IF NOT EXISTS neighborhood text;

-- Listings table
create table public.listings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  price numeric not null,
  city text not null,
  neighborhood text,
  address text not null,
  rooms integer not null,
  area_m2 numeric not null,
  type text not null check (type in ('shitje', 'qira')),
  condition text,
  floor text,
  apartment_type text,
  features text[] default '{}',
  images text[] default '{}',
  is_active boolean default true,
  is_featured boolean default false,
  free_trial_until timestamp with time zone default (now() + interval '30 days'),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_updated_at_profiles
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at_listings
  before update on public.listings
  for each row execute procedure public.handle_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.listings enable row level security;

-- Profiles policies
-- Drop the old overly permissive public policy if re-running this migration.
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Profiles are viewable by everyone" on public.profiles;

-- Public reads should go through the profiles_public view below, which exposes
-- only non-sensitive columns. Direct table access is limited to the owner.
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Public view that excludes sensitive columns (verification_code, phone, email, etc.)
create or replace view public.profiles_public as
  select id, first_name, last_name, avatar_url, email_verified, created_at
  from public.profiles;

grant select on public.profiles_public to anon, authenticated;

-- Listings policies
create policy "Active listings are viewable by everyone"
  on public.listings for select using (is_active = true);

create policy "Users can view their own listings"
  on public.listings for select using (auth.uid() = user_id);

create policy "Users can insert their own listings"
  on public.listings for insert with check (auth.uid() = user_id);

create policy "Users can update their own listings"
  on public.listings for update using (auth.uid() = user_id);

create policy "Users can delete their own listings"
  on public.listings for delete using (auth.uid() = user_id);

-- Storage bucket for listing images
insert into storage.buckets (id, name, public) values ('listings', 'listings', true);

create policy "Anyone can view listing images"
  on storage.objects for select using (bucket_id = 'listings');

create policy "Authenticated users can upload listing images"
  on storage.objects for insert with check (
    bucket_id = 'listings'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own listing images"
  on storage.objects for delete using (
    bucket_id = 'listings' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage bucket for user avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own avatar"
  on storage.objects for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- Conversations & Messages (manually created in Supabase dashboard — captured
-- here for version control and reproducibility)
-- ============================================================================

-- Conversations table
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages table
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_read boolean default false
);

-- Indexes for common query patterns
create index if not exists idx_messages_conversation_id on public.messages(conversation_id, created_at);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_conversations_buyer_id on public.conversations(buyer_id);
create index if not exists idx_conversations_seller_id on public.conversations(seller_id);
create index if not exists idx_conversations_listing_id on public.conversations(listing_id);

-- Updated_at trigger for conversations
create trigger handle_updated_at_conversations
  before update on public.conversations
  for each row execute procedure public.handle_updated_at();

-- Enable RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- --------------------------------------------------------------------------
-- Conversations policies
-- --------------------------------------------------------------------------

-- Participants can view their own conversations
create policy "Participants can view their conversations"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Participants can create conversations
create policy "Users can create conversations"
  on public.conversations for insert
  with check (auth.uid() = buyer_id);

-- Participants can update the updated_at timestamp
create policy "Participants can update their conversations"
  on public.conversations for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- --------------------------------------------------------------------------
-- Messages policies
-- --------------------------------------------------------------------------

-- Participants can view messages in their conversations
create policy "Participants can view messages"
  on public.messages for select
  using (
    conversation_id in (
      select id from public.conversations
      where buyer_id = auth.uid() or seller_id = auth.uid()
    )
  );

-- Participants can insert messages into their conversations
create policy "Participants can insert messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and conversation_id in (
      select id from public.conversations
      where buyer_id = auth.uid() or seller_id = auth.uid()
    )
  );

-- Participants can mark messages as read in their conversations
create policy "Users can mark messages as read"
  on public.messages for update
  using (
    conversation_id in (
      select id from public.conversations
      where buyer_id = auth.uid() or seller_id = auth.uid()
    )
  )
  with check (
    conversation_id in (
      select id from public.conversations
      where buyer_id = auth.uid() or seller_id = auth.uid()
    )
  );

-- Performance indexes for search and common queries
CREATE INDEX IF NOT EXISTS idx_listings_title_gin ON public.listings USING gin(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS idx_listings_description_gin ON public.listings USING gin(to_tsvector('simple', description));
CREATE INDEX IF NOT EXISTS idx_listings_address_gin ON public.listings USING gin(to_tsvector('simple', coalesce(address, '')));
CREATE INDEX IF NOT EXISTS idx_profiles_name_gin ON public.profiles USING gin(to_tsvector('simple', coalesce(first_name, '') || ' ' || coalesce(last_name, '')));
CREATE INDEX IF NOT EXISTS idx_listings_active_city_type ON public.listings(is_active, city, type) WHERE is_active = true;
