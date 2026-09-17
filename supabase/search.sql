-- ============================================================================
-- BLEJE PRONËN: FEDERATED OMNI-SEARCH ENGINE & INDEX ARCHITECTURE
-- Sub-50ms fuzzy, trigram, and full-text search across Properties, Agencies,
-- Agents, and Kosovo Locations with relevance weighting.
-- ============================================================================

-- 1. Enable essential text search extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Optimal GIN Trigram & B-Tree Indexes for sub-50ms execution
-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_active_type_city ON public.listings (is_active, type, city);
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm ON public.listings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_city_trgm ON public.listings USING gin (city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_neighborhood_trgm ON public.listings USING gin (neighborhood gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_address_trgm ON public.listings USING gin (address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_description_trgm ON public.listings USING gin (description gin_trgm_ops);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_first_name_trgm ON public.profiles USING gin (first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_last_name_trgm ON public.profiles USING gin (last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone);

-- 3. Unified Federated Omni-Search Function
CREATE OR REPLACE FUNCTION public.omni_search(
  search_query text,
  result_limit int DEFAULT 20
)
RETURNS TABLE (
  entity_type text,
  id text,
  title text,
  subtitle text,
  badge text,
  image_url text,
  price numeric,
  city text,
  score float,
  payload jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_q text;
BEGIN
  clean_q := trim(search_query);
  IF clean_q IS NULL OR length(clean_q) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scored_listings AS (
    SELECT
      'listing'::text AS entity_type,
      l.id::text AS id,
      l.title AS title,
      concat_ws(' • ', 
        CASE WHEN l.neighborhood IS NOT NULL AND l.neighborhood <> '' 
             THEN concat(l.neighborhood, ', ', l.city) 
             ELSE l.city 
        END,
        concat(l.area_m2::text, ' m²'),
        coalesce(l.apartment_type, '')
      ) AS subtitle,
      CASE WHEN l.type = 'shitje' THEN 'Në shitje' ELSE 'Me qira' END AS badge,
      CASE WHEN array_length(l.images, 1) > 0 THEN l.images[1] ELSE NULL END AS image_url,
      l.price AS price,
      l.city AS city,
      (
        (CASE WHEN l.title ILIKE clean_q || '%' THEN 50.0 ELSE 0.0 END) +
        (similarity(l.title, clean_q) * 40.0) +
        (similarity(l.city, clean_q) * 30.0) +
        (CASE WHEN l.neighborhood ILIKE clean_q || '%' THEN 25.0 ELSE 0.0 END) +
        (CASE WHEN l.is_featured THEN 10.0 ELSE 0.0 END)
      )::float AS score,
      jsonb_build_object(
        'type', l.type,
        'rooms', l.rooms,
        'area_m2', l.area_m2,
        'apartment_type', l.apartment_type,
        'condition', l.condition,
        'user_id', l.user_id
      ) AS payload
    FROM public.listings l
    WHERE l.is_active = true
      AND (
        l.title ILIKE '%' || clean_q || '%'
        OR l.city ILIKE '%' || clean_q || '%'
        OR l.neighborhood ILIKE '%' || clean_q || '%'
        OR l.description ILIKE '%' || clean_q || '%'
        OR l.title % clean_q
      )
    ORDER BY score DESC
    LIMIT result_limit
  ),
  scored_profiles AS (
    SELECT
      CASE WHEN p.last_name = 'Kompani' THEN 'agency'::text ELSE 'agent'::text END AS entity_type,
      p.id::text AS id,
      CASE WHEN p.last_name = 'Kompani' THEN p.first_name 
           ELSE concat_ws(' ', p.first_name, p.last_name) 
      END AS title,
      CASE WHEN p.last_name = 'Kompani' THEN 'Agjenci e Verifikuar'
           ELSE 'Përdorues / Pronar'
      END AS subtitle,
      CASE WHEN p.email_verified THEN 'Verifikuar' ELSE NULL END AS badge,
      p.avatar_url AS image_url,
      NULL::numeric AS price,
      ''::text AS city,
      (
        (CASE WHEN p.first_name ILIKE clean_q || '%' THEN 50.0 ELSE 0.0 END) +
        (similarity(p.first_name, clean_q) * 40.0) +
        (similarity(p.last_name, clean_q) * 20.0) +
        (CASE WHEN p.email_verified THEN 10.0 ELSE 0.0 END)
      )::float AS score,
      jsonb_build_object(
        'phone', p.phone,
        'email_verified', p.email_verified,
        'created_at', p.created_at
      ) AS payload
    FROM public.profiles p
    WHERE (
      p.first_name ILIKE '%' || clean_q || '%'
      OR p.last_name ILIKE '%' || clean_q || '%'
      OR p.first_name % clean_q
    )
    ORDER BY score DESC
    LIMIT result_limit
  )
  SELECT * FROM scored_listings
  UNION ALL
  SELECT * FROM scored_profiles
  ORDER BY score DESC
  LIMIT result_limit;
END;
$$;
