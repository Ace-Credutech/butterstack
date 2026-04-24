# Cron — Heartbeat

1. Fires every 5 minutes (`*/5 * * * *`)
2. Takes a Redis lock to prevent multi-pod duplication
3. Writes a row to `cron_runs` on every fire (success, error, or skipped-locked)
4. No business side-effects — used to validate the scheduler is alive
