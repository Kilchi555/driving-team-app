-- ============================================================
-- AFFILIATE SYSTEM – VOLLSTÄNDIGER TEST
-- ============================================================
-- ANLEITUNG:
-- 1. Ersetze AFFILIATE_USER_EMAIL mit dem Email eines echten Schülers (der Affiliate-Partner)
-- 2. Ersetze REFERRED_USER_EMAIL mit einem echten neu-registrierten Schüler
-- 3. Führe die Blöcke nacheinander aus
-- ============================================================

-- ── SETUP: Echte User-IDs holen ─────────────────────────────
-- Passe diese zwei Emails an:

DO $$
DECLARE
  v_affiliate_user_id   UUID;
  v_referred_user_id    UUID;
  v_tenant_id           UUID;
  v_code                TEXT := 'TESTCODE1';
  v_affiliate_code_id   UUID;
  v_referral_id         UUID;
  v_appointment_id      UUID;
  v_balance_before      INT;
  v_balance_after       INT;
  v_reward_rappen       INT;
BEGIN

  -- ── 1. User-IDs laden ──────────────────────────────────────
  SELECT id, tenant_id INTO v_affiliate_user_id, v_tenant_id
  FROM users
  WHERE email = 'AFFILIATE_USER_EMAIL'  -- ← Email des Affiliate-Partners eintragen
  LIMIT 1;

  IF v_affiliate_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Affiliate-User nicht gefunden. Email anpassen!';
  END IF;

  SELECT id INTO v_referred_user_id
  FROM users
  WHERE email = 'REFERRED_USER_EMAIL'   -- ← Email des geworbenen Schülers eintragen
  AND tenant_id = v_tenant_id
  LIMIT 1;

  IF v_referred_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Geworbener User nicht gefunden. Email anpassen!';
  END IF;

  RAISE NOTICE '✅ Affiliate-User: %', v_affiliate_user_id;
  RAISE NOTICE '✅ Geworbener User: %', v_referred_user_id;
  RAISE NOTICE '✅ Tenant: %', v_tenant_id;

  -- ── 2. Affiliate-Code erstellen (falls noch keiner existiert) ──
  INSERT INTO affiliate_codes (tenant_id, user_id, code, is_active)
  VALUES (v_tenant_id, v_affiliate_user_id, v_code, true)
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET code = affiliate_codes.code
  RETURNING id, code INTO v_affiliate_code_id, v_code;

  RAISE NOTICE '✅ Affiliate-Code: % (ID: %)', v_code, v_affiliate_code_id;

  -- ── 3. referred_by_code beim geworbenen User setzen ────────
  UPDATE users
  SET referred_by_code = v_code
  WHERE id = v_referred_user_id;

  RAISE NOTICE '✅ referred_by_code gesetzt auf: %', v_code;

  -- ── 4. affiliate_referrals Eintrag erstellen ───────────────
  INSERT INTO affiliate_referrals (
    tenant_id, affiliate_code_id, affiliate_user_id,
    referred_user_id, status
  )
  VALUES (
    v_tenant_id, v_affiliate_code_id, v_affiliate_user_id,
    v_referred_user_id, 'pending'
  )
  ON CONFLICT (tenant_id, referred_user_id) DO UPDATE
    SET status = 'pending'
  RETURNING id INTO v_referral_id;

  RAISE NOTICE '✅ Referral-Eintrag erstellt: %', v_referral_id;

  -- ── 5. Einen Termin des geworbenen Schülers holen ──────────
  SELECT id INTO v_appointment_id
  FROM appointments
  WHERE student_id = v_referred_user_id
  AND tenant_id = v_tenant_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_appointment_id IS NULL THEN
    RAISE NOTICE '⚠️  Kein Termin gefunden – Reward-Simulation wird übersprungen.';
    RAISE NOTICE '   Erstelle manuell einen Termin oder nutze einen vorhandenen.';
  ELSE
    RAISE NOTICE '✅ Termin gefunden: %', v_appointment_id;

    -- ── 6. Reward-Betrag aus tenant_settings lesen ───────────
    SELECT COALESCE(setting_value::INT, 5000) INTO v_reward_rappen
    FROM tenant_settings
    WHERE tenant_id = v_tenant_id
    AND category = 'affiliate'
    AND setting_key = 'reward_rappen';

    RAISE NOTICE '✅ Reward-Betrag: % Rappen (CHF %)', v_reward_rappen, (v_reward_rappen / 100.0);

    -- ── 7. Guthaben des Affiliates vor dem Reward ────────────
    SELECT COALESCE(balance_rappen, 0) INTO v_balance_before
    FROM student_credits
    WHERE user_id = v_affiliate_user_id AND tenant_id = v_tenant_id;

    RAISE NOTICE '💰 Guthaben vorher: % Rappen (CHF %)', v_balance_before, (v_balance_before / 100.0);

    -- ── 8. Guthaben gutschreiben ─────────────────────────────
    INSERT INTO student_credits (user_id, tenant_id, balance_rappen)
    VALUES (v_affiliate_user_id, v_tenant_id, v_reward_rappen)
    ON CONFLICT (user_id, tenant_id) DO UPDATE
      SET balance_rappen = student_credits.balance_rappen + v_reward_rappen,
          updated_at     = NOW();

    v_balance_after := v_balance_before + v_reward_rappen;

    -- ── 9. credit_transactions Eintrag ──────────────────────
    INSERT INTO credit_transactions (
      user_id, tenant_id, transaction_type,
      amount_rappen, balance_before_rappen, balance_after_rappen,
      payment_method, reference_type, reference_id, notes
    ) VALUES (
      v_affiliate_user_id, v_tenant_id, 'affiliate_reward',
      v_reward_rappen, v_balance_before, v_balance_after,
      'affiliate', 'appointment', v_appointment_id,
      'TEST: Affiliate-Prämie Simulation'
    );

    -- ── 10. Referral als credited markieren ──────────────────
    UPDATE affiliate_referrals
    SET status                = 'credited',
        reward_rappen         = v_reward_rappen,
        first_appointment_id  = v_appointment_id,
        credited_at           = NOW(),
        updated_at            = NOW()
    WHERE id = v_referral_id;

    -- ── 11. affiliate_codes Zähler aktualisieren ─────────────
    UPDATE affiliate_codes
    SET total_referrals       = total_referrals + 1,
        total_credited_rappen = total_credited_rappen + v_reward_rappen,
        updated_at            = NOW()
    WHERE id = v_affiliate_code_id;

    RAISE NOTICE '✅ Guthaben nachher: % Rappen (CHF %)', v_balance_after, (v_balance_after / 100.0);
    RAISE NOTICE '';
    RAISE NOTICE '🎉 TEST ERFOLGREICH ABGESCHLOSSEN!';
    RAISE NOTICE '   Affiliate %  hat CHF % gutgeschrieben bekommen.', v_affiliate_user_id, (v_reward_rappen / 100.0);
  END IF;

END $$;

-- ── VERIFIZIERUNG: Ergebnisse anzeigen ──────────────────────
-- Nach dem Test diese Queries ausführen:

/*
-- Affiliate-Code prüfen:
SELECT code, total_referrals, total_credited_rappen
FROM affiliate_codes
WHERE user_id = (SELECT id FROM users WHERE email = 'AFFILIATE_USER_EMAIL');

-- Referral-Status prüfen:
SELECT ar.status, ar.reward_rappen, ar.credited_at
FROM affiliate_referrals ar
JOIN users u ON u.id = ar.referred_user_id
WHERE u.email = 'REFERRED_USER_EMAIL';

-- Guthaben prüfen:
SELECT balance_rappen
FROM student_credits
WHERE user_id = (SELECT id FROM users WHERE email = 'AFFILIATE_USER_EMAIL');

-- Transaktion prüfen:
SELECT transaction_type, amount_rappen, notes, created_at
FROM credit_transactions
WHERE user_id = (SELECT id FROM users WHERE email = 'AFFILIATE_USER_EMAIL')
ORDER BY created_at DESC
LIMIT 5;
*/
