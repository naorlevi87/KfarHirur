-- supabase/schema.sql
-- Timeline DB schema. Two tables: timeline_items (containers) + timeline_item_blocks (ordered content blocks).
-- Run this once in the Supabase SQL Editor before seeding.

-- ── timeline_items ────────────────────────────────────────────────────────────

create table if not exists timeline_items (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  date          date not null,
  event_type    text not null default 'milestone',
  size          text not null default 'standard',
  min_scale     float not null default 0,
  initial_view  boolean not null default false,
  status        text not null default 'published',
  visibility    text not null default 'both',
  locale        text not null default 'he',
  naor_title    text,
  shay_title    text,
  naor_label    text,
  shay_label    text,
  created_by    uuid references auth.users(id),
  updated_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── timeline_item_blocks ──────────────────────────────────────────────────────
-- content JSONB is always structured as { naor: {...}, shay: {...} }

create table if not exists timeline_item_blocks (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references timeline_items(id) on delete cascade,
  block_type  text not null,
  sort_order  integer not null default 0,
  visibility  text not null default 'both',
  content     jsonb not null default '{}'
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index if not exists timeline_items_date_idx      on timeline_items(date);
create index if not exists timeline_items_status_idx    on timeline_items(status);
create index if not exists timeline_blocks_item_idx     on timeline_item_blocks(item_id);
create index if not exists timeline_blocks_order_idx    on timeline_item_blocks(item_id, sort_order);

-- ── Auto-update updated_at on timeline_items ──────────────────────────────────

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on timeline_items;
create trigger set_updated_at
  before update on timeline_items
  for each row execute function update_updated_at();
