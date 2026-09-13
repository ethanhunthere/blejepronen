-- ============================================================================
-- BLEJE PRONEN — FOLLOWS TABLE (INSTAGRAM-STYLE FOLLOW/UNFOLLOW SYSTEM)
-- ============================================================================

create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

-- Indexes for rapid lookup of follower & following counts
create index if not exists follows_follower_id_idx on public.follows(follower_id);
create index if not exists follows_following_id_idx on public.follows(following_id);

-- Enable Row Level Security
alter table public.follows enable row level security;

-- Policy 1: Anyone can read follows (to show counts, follower lists, following lists)
drop policy if exists "Follows are viewable by everyone" on public.follows;
create policy "Follows are viewable by everyone"
  on public.follows for select
  using (true);

-- Policy 2: Authenticated users can insert their own follow records
drop policy if exists "Users can follow others" on public.follows;
create policy "Users can follow others"
  on public.follows for insert
  with check (auth.uid() = follower_id and follower_id <> following_id);

-- Policy 3: Users can unfollow (delete their own follow records)
drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);
