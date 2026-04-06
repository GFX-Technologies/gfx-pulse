DELETE FROM whatsapp_checks WHERE check_date = '2026-04-11' AND bulk_scope = 'auto';
DELETE FROM status_logs WHERE is_auto_generated = true AND reference_date = '2026-04-11';