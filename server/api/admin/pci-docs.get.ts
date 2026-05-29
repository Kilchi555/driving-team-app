// server/api/admin/pci-docs.get.ts
// Super-admin only: returns a printable HTML page with the two per-tenant PCI
// documents (Compliance Policy + Incident Response Plan), filled with the
// tenant's legal data. The browser "Drucken / Als PDF speichern" turns it into
// a PDF — no server-side Chromium needed.
//
// Query params:
//   tenant_id   (required) tenant UUID
//   approver    (optional) signatory name      e.g. "Pascal Kilchenmann"
//   title       (optional) signatory function  e.g. "Geschäftsführer"

import { defineEventHandler, getQuery, createError, setHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  PCI_DOCS,
  buildReplacements,
  fillTemplate,
  mdToHtml,
  htmlDocument,
} from '~/server/templates/pci-templates.mjs'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super-Admin role required' })
  }

  const query = getQuery(event)
  const tenantId = String(query.tenant_id || '').trim()
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'tenant_id erforderlich' })

  const approver = query.approver ? String(query.approver).trim() : undefined
  const title = query.title ? String(query.title).trim() : undefined

  const supabase = getSupabaseAdmin()
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('name, legal_company_name, address, contact_email, contact_person_first_name, contact_person_last_name, uid_number, wallee_uid_number')
    .eq('id', tenantId)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!tenant) throw createError({ statusCode: 404, statusMessage: 'Tenant nicht gefunden' })

  const approverFromDb = [tenant.contact_person_first_name, tenant.contact_person_last_name]
    .filter(Boolean).join(' ').trim()

  const replacements = buildReplacements({
    company: tenant.legal_company_name || tenant.name,
    address: tenant.address,
    uid: tenant.uid_number || tenant.wallee_uid_number,
    email: tenant.contact_email,
    approver: approver || approverFromDb || undefined,
    title,
  })

  const body = PCI_DOCS
    .map((doc) => `<section class="pci-doc">${mdToHtml(fillTemplate(doc.template, replacements))}</section>`)
    .join('\n')

  const companyName = tenant.legal_company_name || tenant.name
  const html = htmlDocument(body, {
    title: `PCI-Dokumente — ${companyName}`,
    includePrintButton: true,
  })

  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-store')
  return html
})
