-- Wipe existing tables
drop table if exists public.menu_items cascade;
drop table if exists public.categories cascade;
drop table if exists public.restaurants cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Restaurants Table
create table public.restaurants (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    owner_id uuid references auth.users(id) not null default auth.uid(),
    name text not null,
    logo_url text,
    primary_color text default '#000000',
    currency_symbol text default '$',
    plan_tier text not null default 'free' check (plan_tier in ('free', 'pro')),
    stripe_customer_id text unique,
    stripe_subscription_id text unique,
    stripe_price_id text,
    subscription_status text,
    subscription_current_period_end timestamp with time zone
);

-- Categories Table
create table public.categories (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    restaurant_id uuid references public.restaurants(id) on delete cascade not null,
    name text not null,
    order_index integer default 0 not null
);

-- Menu Items Table
create table public.menu_items (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    category_id uuid references public.categories(id) on delete cascade not null,
    name text not null,
    description text,
    price numeric(10, 2) not null,
    image_url text,
    is_available boolean default true not null,
    order_index integer default 0 not null
);

-- Menu Views Table (Analytics)
create table public.menu_views (
    id uuid default uuid_generate_v4() primary key,
    restaurant_id uuid references public.restaurants(id) on delete cascade not null,
    viewed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_views enable row level security;

-- Policies for public access (Read-Only)
create policy "Allow public read access on restaurants"
    on public.restaurants for select
    using (true);

create policy "Allow public read access on categories"
    on public.categories for select
    using (true);

create policy "Allow public read access on menu items"
    on public.menu_items for select
    using (true);

-- Policies for authenticated owners
-- Restaurants
create policy "Allow owners to insert restaurants" 
    on public.restaurants for insert 
    with check (auth.uid() = owner_id);

create policy "Allow owners to update restaurants" 
    on public.restaurants for update 
    using (auth.uid() = owner_id);

create policy "Allow owners to delete restaurants" 
    on public.restaurants for delete 
    using (auth.uid() = owner_id);

-- Categories
create policy "Allow owners to insert categories" 
    on public.categories for insert 
    with check (
        exists (select 1 from public.restaurants where id = restaurant_id and owner_id = auth.uid())
    );

create policy "Allow owners to update categories" 
    on public.categories for update 
    using (
        exists (select 1 from public.restaurants where id = restaurant_id and owner_id = auth.uid())
    );

create policy "Allow owners to delete categories" 
    on public.categories for delete 
    using (
        exists (select 1 from public.restaurants where id = restaurant_id and owner_id = auth.uid())
    );

-- Menu Items
create policy "Allow owners to insert menu items" 
    on public.menu_items for insert 
    with check (
        exists (select 1 from public.categories c join public.restaurants r on c.restaurant_id = r.id where c.id = category_id and r.owner_id = auth.uid())
    );

create policy "Allow owners to update menu items" 
    on public.menu_items for update 
    using (
        exists (select 1 from public.categories c join public.restaurants r on c.restaurant_id = r.id where c.id = category_id and r.owner_id = auth.uid())
    );

create policy "Allow owners to delete menu items" 
    on public.menu_items for delete 
    using (
        exists (select 1 from public.categories c join public.restaurants r on c.restaurant_id = r.id where c.id = category_id and r.owner_id = auth.uid())
    );

-- Policies for menu views
create policy "Allow public to insert menu views"
    on public.menu_views for insert
    with check (true);

create policy "Allow owners to read menu views"
    on public.menu_views for select
    using (
        exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
    );

-- Create a storage bucket for menu images
insert into storage.buckets (id, name, public) 
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- Storage Policies for 'menu-images' bucket
-- Drop existing policies if they exist to prevent errors during rerun
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Allow public uploads" on storage.objects;
drop policy if exists "Allow public updates" on storage.objects;
drop policy if exists "Allow public deletes" on storage.objects;
drop policy if exists "Allow authenticated uploads" on storage.objects;
drop policy if exists "Allow authenticated updates" on storage.objects;
drop policy if exists "Allow authenticated deletes" on storage.objects;

-- Allow public access to view images
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'menu-images' );

-- Allow authenticated users to upload images
create policy "Allow authenticated uploads" 
on storage.objects for insert 
with check ( bucket_id = 'menu-images' and auth.role() = 'authenticated' );

create policy "Allow authenticated updates" 
on storage.objects for update 
using ( bucket_id = 'menu-images' and auth.role() = 'authenticated' );

create policy "Allow authenticated deletes" 
on storage.objects for delete 
using ( bucket_id = 'menu-images' and auth.role() = 'authenticated' );
