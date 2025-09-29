-- Remove all stored event titles from external_busy_times (anonymize)
UPDATE external_busy_times SET event_title = 'Privat' WHERE event_title IS DISTINCT FROM 'Privat';


