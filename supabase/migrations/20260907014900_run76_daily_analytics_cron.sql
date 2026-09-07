create extension if not exists pg_cron;
select cron.schedule('ateek-analytics-daily','17 2 * * *','select public.ateek_refresh_all_analytics_cache();');
