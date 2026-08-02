-- Aggregate outbound queue delivery stats per marketing campaign.
-- Used by GET /api/marketing/campaigns to show "really sent" vs "still queued".

CREATE OR REPLACE FUNCTION marketing_campaign_queue_stats(p_campaign_ids uuid[])
RETURNS TABLE (
  campaign_id uuid,
  delivered_count bigint,
  pending_count bigint,
  cancelled_count bigint,
  failed_count bigint,
  sending_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (q.context_data->>'campaign_id')::uuid AS campaign_id,
    COUNT(*) FILTER (WHERE q.status = 'sent') AS delivered_count,
    COUNT(*) FILTER (WHERE q.status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE q.status = 'cancelled') AS cancelled_count,
    COUNT(*) FILTER (WHERE q.status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE q.status = 'sending') AS sending_count
  FROM outbound_messages_queue q
  WHERE q.context_data->>'type' = 'marketing'
    AND (q.context_data->>'campaign_id')::uuid = ANY (p_campaign_ids)
  GROUP BY 1;
$$;

REVOKE ALL ON FUNCTION marketing_campaign_queue_stats(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION marketing_campaign_queue_stats(uuid[]) TO service_role;
