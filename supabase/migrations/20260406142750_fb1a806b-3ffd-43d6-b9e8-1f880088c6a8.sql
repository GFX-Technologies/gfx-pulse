INSERT INTO whatsapp_checks (subarea_id, check_date, check_time_slot, status, checked_by, observacao, bulk_action, bulk_scope)
VALUES 
('91819794-cf95-4e6d-a351-cc97c040b3c2', CURRENT_DATE, '08:30', 'operational', '403006e4-abfb-4d04-ba39-5a9dc8d83d69', 'Check automático - teste', true, 'auto'),
('6a552226-aa5b-4b45-90aa-679afb3540fd', CURRENT_DATE, '08:30', 'operational', '403006e4-abfb-4d04-ba39-5a9dc8d83d69', 'Check automático - teste', true, 'auto')
ON CONFLICT (subarea_id, check_date, check_time_slot) 
DO UPDATE SET status = 'operational', bulk_scope = 'auto', bulk_action = true, observacao = 'Check automático - teste';