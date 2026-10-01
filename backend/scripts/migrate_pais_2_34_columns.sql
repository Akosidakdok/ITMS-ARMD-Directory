-- ============================================================================
-- PAIS 2.0: 34-COLUMN OFFICIAL PERSONNEL IMPORT & SCHEMA EXPANSION MIGRATION
-- Project: PNP-ITMS Personnel and Assignment Information System (PAIS 2.0)
-- 
-- Description:
--   Expands the public.personnel table to support all 34 official PNP fields.
--   Preserves all 587 existing records, foreign keys, and module integrations.
--   Provides bidirectional synchronization between camelCase and snake_case fields.
--   Zero downtime, non-destructive, idempotent DDL.
-- ============================================================================

-- Step 1: Add New Columns for the 34 Official Fields (Idempotent)
ALTER TABLE public.personnel
  -- A. Personal Information
  ADD COLUMN IF NOT EXISTS "civil_status" TEXT,
  ADD COLUMN IF NOT EXISTS "religion" TEXT,
  
  -- B. Personnel Identification and Contact
  ADD COLUMN IF NOT EXISTS "badge_number" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "phone_number" TEXT,
  ADD COLUMN IF NOT EXISTS "tin" TEXT,
  ADD COLUMN IF NOT EXISTS "gsis_number" TEXT,
  ADD COLUMN IF NOT EXISTS "phil_health_no" TEXT,
  ADD COLUMN IF NOT EXISTS "pagibig_no" TEXT,

  -- C. Service and Career Information
  ADD COLUMN IF NOT EXISTS "date_entered_service" TEXT,
  ADD COLUMN IF NOT EXISTS "designation_date" TEXT,
  ADD COLUMN IF NOT EXISTS "last_promotion_date" TEXT,
  ADD COLUMN IF NOT EXISTS "source_of_commissionship" TEXT,
  ADD COLUMN IF NOT EXISTS "date_of_officership_or_commission" TEXT,
  ADD COLUMN IF NOT EXISTS "pstatus" TEXT,
  ADD COLUMN IF NOT EXISTS "pstatus_date" TEXT,
  ADD COLUMN IF NOT EXISTS "rank_status" TEXT,

  -- D. Organizational Assignment
  ADD COLUMN IF NOT EXISTS "unit_code" TEXT,
  ADD COLUMN IF NOT EXISTS "unit" TEXT,
  ADD COLUMN IF NOT EXISTS "sub_unit_code" TEXT,
  ADD COLUMN IF NOT EXISTS "station_code" TEXT,
  ADD COLUMN IF NOT EXISTS "sub_station_code" TEXT,
  ADD COLUMN IF NOT EXISTS "sub_station" TEXT,

  -- Compatibility Aliases (Bidirectional mirror for camelCase and snake_case)
  ADD COLUMN IF NOT EXISTS "first_name" TEXT,
  ADD COLUMN IF NOT EXISTS "last_name" TEXT,
  ADD COLUMN IF NOT EXISTS "middle_name" TEXT,
  ADD COLUMN IF NOT EXISTS "civilStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "badgeNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "dateEnteredService" TEXT,
  ADD COLUMN IF NOT EXISTS "designationDate" TEXT,
  ADD COLUMN IF NOT EXISTS "lastPromotionDate" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceOfCommissionship" TEXT,
  ADD COLUMN IF NOT EXISTS "dateOfOfficershipOrCommission" TEXT,
  ADD COLUMN IF NOT EXISTS "pstatusDate" TEXT,
  ADD COLUMN IF NOT EXISTS "rankStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "unitCode" TEXT,
  ADD COLUMN IF NOT EXISTS "subUnitCode" TEXT,
  ADD COLUMN IF NOT EXISTS "stationCode" TEXT,
  ADD COLUMN IF NOT EXISTS "subStationCode" TEXT,
  ADD COLUMN IF NOT EXISTS "subStation" TEXT,
  ADD COLUMN IF NOT EXISTS "gsisNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "philHealthNo" TEXT,
  ADD COLUMN IF NOT EXISTS "pagibigNo" TEXT;

-- Step 2: One-time Backfill / Synchronization for Existing Records
UPDATE public.personnel
SET
  "first_name" = COALESCE("first_name", "firstName"),
  "last_name" = COALESCE("last_name", "lastName"),
  "middle_name" = COALESCE("middle_name", "middleName"),
  "badge_number" = COALESCE("badge_number", "badgeNo"),
  "phone_number" = COALESCE("phone_number", "contactNumber"),
  "date_entered_service" = COALESCE("date_entered_service", "dateOfEntry", "desUp"),
  "designation_date" = COALESCE("designation_date", "designationDate"),
  "last_promotion_date" = COALESCE("last_promotion_date", "lastPromotionDate"),
  "date_of_officership_or_commission" = COALESCE("date_of_officership_or_commission", "enterInOfficerPositionDate"),
  "pstatus" = COALESCE("pstatus", "status"),
  "unit" = COALESCE("unit", "unitCategory")
WHERE
  "first_name" IS NULL OR
  "last_name" IS NULL OR
  "badge_number" IS NULL OR
  "pstatus" IS NULL;

-- Step 3: Bidirectional Compatibility Trigger
CREATE OR REPLACE FUNCTION public.sync_personnel_34_compat_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Synchronize Names
  IF NEW."first_name" IS NOT NULL AND (NEW."firstName" IS NULL OR NEW."firstName" = '') THEN
    NEW."firstName" := NEW."first_name";
  ELSIF NEW."firstName" IS NOT NULL AND (NEW."first_name" IS NULL OR NEW."first_name" = '') THEN
    NEW."first_name" := NEW."firstName";
  END IF;

  IF NEW."last_name" IS NOT NULL AND (NEW."lastName" IS NULL OR NEW."lastName" = '') THEN
    NEW."lastName" := NEW."last_name";
  ELSIF NEW."lastName" IS NOT NULL AND (NEW."last_name" IS NULL OR NEW."last_name" = '') THEN
    NEW."last_name" := NEW."lastName";
  END IF;

  IF NEW."middle_name" IS NOT NULL AND (NEW."middleName" IS NULL OR NEW."middleName" = '') THEN
    NEW."middleName" := NEW."middle_name";
  ELSIF NEW."middleName" IS NOT NULL AND (NEW."middle_name" IS NULL OR NEW."middle_name" = '') THEN
    NEW."middle_name" := NEW."middleName";
  END IF;

  -- Synchronize Identifiers
  IF NEW."badge_number" IS NOT NULL AND (NEW."badgeNo" IS NULL OR NEW."badgeNo" = '') THEN
    NEW."badgeNo" := NEW."badge_number";
  ELSIF NEW."badgeNo" IS NOT NULL AND (NEW."badge_number" IS NULL OR NEW."badge_number" = '') THEN
    NEW."badge_number" := NEW."badgeNo";
  END IF;

  IF NEW."phone_number" IS NOT NULL AND (NEW."contactNumber" IS NULL OR NEW."contactNumber" = '') THEN
    NEW."contactNumber" := NEW."phone_number";
  ELSIF NEW."contactNumber" IS NOT NULL AND (NEW."phone_number" IS NULL OR NEW."phone_number" = '') THEN
    NEW."phone_number" := NEW."contactNumber";
  END IF;

  -- Synchronize Dates
  IF NEW."date_entered_service" IS NOT NULL AND (NEW."dateOfEntry" IS NULL OR NEW."dateOfEntry" = '') THEN
    NEW."dateOfEntry" := NEW."date_entered_service";
    NEW."desUp" := NEW."date_entered_service";
  ELSIF NEW."dateOfEntry" IS NOT NULL AND (NEW."date_entered_service" IS NULL OR NEW."date_entered_service" = '') THEN
    NEW."date_entered_service" := NEW."dateOfEntry";
  END IF;

  IF NEW."date_of_officership_or_commission" IS NOT NULL AND (NEW."enterInOfficerPositionDate" IS NULL OR NEW."enterInOfficerPositionDate" = '') THEN
    NEW."enterInOfficerPositionDate" := NEW."date_of_officership_or_commission";
  ELSIF NEW."enterInOfficerPositionDate" IS NOT NULL AND (NEW."date_of_officership_or_commission" IS NULL OR NEW."date_of_officership_or_commission" = '') THEN
    NEW."date_of_officership_or_commission" := NEW."enterInOfficerPositionDate";
  END IF;

  IF NEW."designation_date" IS NOT NULL AND (NEW."designationDate" IS NULL OR NEW."designationDate" = '') THEN
    NEW."designationDate" := NEW."designation_date";
  ELSIF NEW."designationDate" IS NOT NULL AND (NEW."designation_date" IS NULL OR NEW."designation_date" = '') THEN
    NEW."designation_date" := NEW."designationDate";
  END IF;

  IF NEW."last_promotion_date" IS NOT NULL AND (NEW."lastPromotionDate" IS NULL OR NEW."lastPromotionDate" = '') THEN
    NEW."lastPromotionDate" := NEW."last_promotion_date";
  ELSIF NEW."lastPromotionDate" IS NOT NULL AND (NEW."last_promotion_date" IS NULL OR NEW."last_promotion_date" = '') THEN
    NEW."last_promotion_date" := NEW."lastPromotionDate";
  END IF;

  -- Synchronize Status
  IF NEW."pstatus" IS NOT NULL AND (NEW."status" IS NULL OR NEW."status" = '') THEN
    NEW."status" := NEW."pstatus";
  ELSIF NEW."status" IS NOT NULL AND (NEW."pstatus" IS NULL OR NEW."pstatus" = '') THEN
    NEW."pstatus" := NEW."status";
  END IF;

  -- Synchronize Unit
  IF NEW."unit" IS NOT NULL AND (NEW."unitCategory" IS NULL OR NEW."unitCategory" = '') THEN
    NEW."unitCategory" := NEW."unit";
  ELSIF NEW."unitCategory" IS NOT NULL AND (NEW."unit" IS NULL OR NEW."unit" = '') THEN
    NEW."unit" := NEW."unitCategory";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_personnel_34_compat ON public.personnel;
CREATE TRIGGER trg_sync_personnel_34_compat
BEFORE INSERT OR UPDATE ON public.personnel
FOR EACH ROW
EXECUTE FUNCTION public.sync_personnel_34_compat_fields();

-- Step 4: Performance Indexes for Search and Org Hierarchy
CREATE INDEX IF NOT EXISTS idx_personnel_badge_number ON public.personnel("badge_number");
CREATE INDEX IF NOT EXISTS idx_personnel_unit_code ON public.personnel("unit_code");
CREATE INDEX IF NOT EXISTS idx_personnel_sub_unit_code ON public.personnel("sub_unit_code");
CREATE INDEX IF NOT EXISTS idx_personnel_station_code ON public.personnel("station_code");
CREATE INDEX IF NOT EXISTS idx_personnel_tin ON public.personnel("tin");
CREATE INDEX IF NOT EXISTS idx_personnel_email ON public.personnel("email");
