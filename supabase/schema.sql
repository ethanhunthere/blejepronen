-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  first_name text not null,
  last_name text not null,
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

-- Listings table
create table public.listings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  price numeric not null,
  city text not null check (city in ('Prishtinë', 'Prizren', 'Pejë', 'Gjakovë', 'Gjilan', 'Mitrovicë', 'Ferizaj')),
  address text not null,
  rooms integer not null,
  area_m2 numeric not null,
  type text not null check (type in ('shitje', 'qira')),
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
  insert into public.profiles (id, first_name, last_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
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
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Listings policies
create policy "Active listings are viewable by everyone"
  on public.listings for select using (is_active = true);

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
    bucket_id = 'listings' and auth.role() = 'authenticated'
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
