-- Cover both composite ownership foreign keys used by draft cleanup.
CREATE INDEX fleet_entry_earning_drafts_driver_owner_idx
  ON public.fleet_entry_earning_drafts (driver_id, fleet_user_id);

CREATE INDEX fleet_entry_earning_drafts_source_owner_idx
  ON public.fleet_entry_earning_drafts (source_id, fleet_user_id);
