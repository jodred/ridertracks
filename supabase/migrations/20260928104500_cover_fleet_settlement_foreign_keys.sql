-- Cover the composite foreign keys used to keep every settlement row within
-- its owning fleet partner. These indexes also make cascades and integrity
-- checks predictable as fleet data grows.

CREATE INDEX fleet_driver_sources_driver_owner_idx
  ON public.fleet_driver_sources (driver_id, fleet_user_id);
CREATE INDEX fleet_driver_sources_source_owner_idx
  ON public.fleet_driver_sources (source_id, fleet_user_id);
CREATE INDEX fleet_entry_earnings_entry_owner_idx
  ON public.fleet_entry_earnings (entry_id, fleet_user_id);
CREATE INDEX fleet_entry_earnings_source_owner_idx
  ON public.fleet_entry_earnings (source_id, fleet_user_id);
CREATE INDEX fleet_entry_adjustments_entry_owner_idx
  ON public.fleet_entry_adjustments (entry_id, fleet_user_id);
CREATE INDEX fleet_entry_adjustments_type_owner_idx
  ON public.fleet_entry_adjustments (adjustment_type_id, fleet_user_id);
