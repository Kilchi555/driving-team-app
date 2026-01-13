#!/bin/bash

# MFA Enforcement System - Setup Script
# Führt alle erforderlichen SQL-Migrationen aus

echo "🔐 MFA Enforcement System Setup"
echo "==============================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

echo "📋 SQL Migrations auszuführen:"
echo ""

# Read the migrations
MIGRATION1=$(cat sql_migrations/20250229_add_mfa_enforcement_tracking.sql)
MIGRATION2=$(cat sql_migrations/20250229_create_mfa_login_tables.sql)

echo "1. Migration: MFA Enforcement Tracking"
echo "   - Neue Spalten in users tabelle"
echo "   - login_security_rules tabelle"
echo "   - Security functions (check_login_security_status, record_failed_login, etc.)"
echo ""

echo "2. Migration: MFA Login Tables"
echo "   - mfa_methods tabelle"
echo "   - mfa_login_codes tabelle"
echo "   - mfa_failed_attempts tabelle"
echo "   - RLS Policies"
echo ""

echo "📝 Manuelle Schritte:"
echo "1. Öffne https://supabase.com/dashboard/project/unyjaetebnaexaflpyoc/sql"
echo "2. Klicke 'New query'"
echo "3. Kopiere den Inhalt von: sql_migrations/20250229_add_mfa_enforcement_tracking.sql"
echo "4. Klicke 'Run'"
echo "5. Wiederhole für: sql_migrations/20250229_create_mfa_login_tables.sql"
echo ""

echo "✅ Nach den Migrationen:"
echo "1. Login-Seite wird MFA-Eingabe zeigen nach 5 Versuchen"
echo "2. Account wird nach 10 Versuchen gesperrt"
echo "3. IP wird nach 20 Versuchen blockiert"
echo ""

echo "🔧 Konfigurierbare Einstellungen (in login_security_rules):"
echo "   - max_failed_attempts_before_mfa (default: 5)"
echo "   - max_failed_attempts_before_lockout (default: 10)"
echo "   - lockout_duration_minutes (default: 30)"
echo "   - mfa_required_duration_minutes (default: 60)"
echo "   - auto_block_ip_after_attempts (default: 20)"
echo ""

echo "📚 Dokumentation: MFA_ENFORCEMENT_PLAN.md"



