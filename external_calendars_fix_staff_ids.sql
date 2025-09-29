-- Fix staff_id values that accidentally stored auth user id instead of users.id

-- Update external_calendars.staff_id
UPDATE external_calendars ec
SET staff_id = u.id
FROM users u
WHERE ec.staff_id = u.auth_user_id;

-- Update external_busy_times.staff_id
UPDATE external_busy_times ebt
SET staff_id = u.id
FROM users u
WHERE ebt.staff_id = u.auth_user_id;


