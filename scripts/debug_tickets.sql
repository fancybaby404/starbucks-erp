-- Check distinct statuses
select status, count(*) from support_cases group by status;

-- Check RLS policies
select * from pg_policies where tablename = 'support_cases';
