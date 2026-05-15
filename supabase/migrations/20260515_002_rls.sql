alter table users enable row level security;
alter table practice_sessions enable row level security;
alter table content_items enable row level security;
alter table rak_prompts enable row level security;
alter table rak_logs enable row level security;
alter table privacy_jobs enable row level security;

create policy users_select_own on users for select using (auth.uid() = id);
create policy users_update_own on users for update using (auth.uid() = id) with check (auth.uid() = id);
create policy sessions_select_own on practice_sessions for select using (auth.uid() = user_id);
create policy sessions_insert_own on practice_sessions for insert with check (auth.uid() = user_id);
create policy content_select_authenticated on content_items for select to authenticated using (true);
create policy rak_prompts_select_authenticated on rak_prompts for select to authenticated using (true);
create policy rak_logs_select_own on rak_logs for select using (auth.uid() = user_id);
create policy rak_logs_insert_own on rak_logs for insert with check (auth.uid() = user_id);
create policy privacy_jobs_select_own on privacy_jobs for select using (auth.uid() = user_id);
create policy privacy_jobs_insert_own on privacy_jobs for insert with check (auth.uid() = user_id);
