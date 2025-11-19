create table if not exists public.menu_accounts (
    username text primary key,
    role text not null default 'editor',
    created_at timestamptz not null default now()
);

alter table public.menu_accounts enable row level security;

-- reset policies
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'menu_accounts' AND policyname = 'menu_accounts_select'
    ) THEN
        DROP POLICY "menu_accounts_select" ON public.menu_accounts;
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'menu_accounts' AND policyname = 'menu_accounts_modify'
    ) THEN
        DROP POLICY "menu_accounts_modify" ON public.menu_accounts;
    END IF;
END $$;

create policy "menu_accounts_select" on public.menu_accounts for select using (true);
create policy "menu_accounts_modify" on public.menu_accounts
    for all
    using (true)
    with check (true);
