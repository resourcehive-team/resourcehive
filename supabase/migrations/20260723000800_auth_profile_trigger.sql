-- ResourceHive migration 08: create an application profile after Auth signup

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.person(person_id, full_name, email, email_verified_at)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New user'),
    new.email,
    new.email_confirmed_at
  );
  insert into public.point_wallet(person_id, current_balance) values (new.id, 0);
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();
