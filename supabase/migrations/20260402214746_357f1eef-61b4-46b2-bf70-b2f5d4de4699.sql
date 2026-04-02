DELETE FROM whatsapp_checks WHERE check_date = CURRENT_DATE;
DELETE FROM status_logs WHERE created_at::date = CURRENT_DATE;