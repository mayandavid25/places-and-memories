
-- Restrict EXECUTE on security definer helpers
revoke execute on function public.current_couple_id() from public, anon, authenticated;
revoke execute on function public.is_in_couple(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- Keep execute for postgres role (default) so RLS policies that reference them still work via the planner

-- Tighten couples insert: only authenticated users
drop policy "create couple" on public.couples;
create policy "create couple" on public.couples for insert to authenticated with check (auth.uid() is not null);

-- Restrict bucket listing: only allow selecting individual objects (still public via signed URLs / direct path)
-- Keep public read but disallow listing by requiring a path-based filter? Simpler: keep as-is since URLs are not enumerable easily. We'll narrow to auth users for listing and public for direct read by name remains via public URL endpoint.
-- Actually with public buckets, the public URL endpoint bypasses RLS. The SELECT policy controls API listing only. So restrict listing to authenticated users.
drop policy "public read photos" on storage.objects;
create policy "authed list photos" on storage.objects for select to authenticated using (bucket_id = 'photos');
