-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Restaurants Table
create table public.restaurants (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text not null,
    logo_url text,
    primary_color text default '#000000'
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

-- Enable RLS
alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;

-- Policies for public access (since this is an MVP without auth, we allow public read)
-- For a real application, you would restrict these
create policy "Allow public read access on restaurants"
    on public.restaurants for select
    using (true);

create policy "Allow public read access on categories"
    on public.categories for select
    using (true);

create policy "Allow public read access on menu items"
    on public.menu_items for select
    using (true);

-- For MVP purposes, allow all operations. 
-- In production, these should be restricted to authenticated users (owners).
create policy "Allow public insert on restaurants" on public.restaurants for insert with check (true);
create policy "Allow public update on restaurants" on public.restaurants for update using (true);
create policy "Allow public delete on restaurants" on public.restaurants for delete using (true);

create policy "Allow public insert on categories" on public.categories for insert with check (true);
create policy "Allow public update on categories" on public.categories for update using (true);
create policy "Allow public delete on categories" on public.categories for delete using (true);

create policy "Allow public insert on menu items" on public.menu_items for insert with check (true);
create policy "Allow public update on menu items" on public.menu_items for update using (true);
create policy "Allow public delete on menu items" on public.menu_items for delete using (true);

-- Create a storage bucket for menu images
insert into storage.buckets (id, name, public) 
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- Storage Policies for 'menu-images' bucket
-- Allow public access to view images
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'menu-images' );

-- For MVP purposes, allow all uploads to the bucket
create policy "Allow public uploads" 
on storage.objects for insert 
with check ( bucket_id = 'menu-images' );

create policy "Allow public updates" 
on storage.objects for update 
using ( bucket_id = 'menu-images' );

create policy "Allow public deletes" 
on storage.objects for delete 
using ( bucket_id = 'menu-images' );
