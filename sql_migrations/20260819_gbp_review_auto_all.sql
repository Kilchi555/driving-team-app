-- Default review replies to auto-publish. Existing tenants only had off | suggest
-- in the UI; "on" meant suggest (human send). Product now answers automatically.
UPDATE gbp_automation_settings
SET review_reply_mode = 'auto_all',
    updated_at = now()
WHERE review_reply_mode = 'suggest';
