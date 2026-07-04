-- FIX 1: Storage RLS Policy — Ownership enforcement
-- Run this in Supabase SQL Editor (https://tjpxxtkebindirhpthhg.supabase.co)

-- Drop the broken INSERT policy (any authenticated user can upload to any folder)
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;

-- Replace with ownership-enforced policy
CREATE POLICY "Users can upload to their own folder"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'listings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- FIX 2: Admin RLS — let admin see all listings (active + inactive)
DROP POLICY IF EXISTS "Active listings are viewable by everyone" ON public.listings;

CREATE POLICY "Listings viewable by everyone or owner"
  ON public.listings FOR SELECT USING (
    is_active = true OR auth.uid() = user_id
  );

-- FIX 3: Database indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_city ON public.listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_type ON public.listings(type);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_rooms ON public.listings(rooms);
CREATE INDEX IF NOT EXISTS idx_listings_active_featured ON public.listings(is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
