-- Add province column for property ID format (01-07 by Costa Rica province)
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "province" text DEFAULT '01';

-- Sequence for global consecutive number (independent of province)
CREATE SEQUENCE IF NOT EXISTS "property_consecutive_seq";

-- Seed sequence: setval so next nextval() = count+1 (first new property gets correct consecutive)
SELECT setval('property_consecutive_seq', (SELECT COALESCE(COUNT(*), 0) FROM properties));
