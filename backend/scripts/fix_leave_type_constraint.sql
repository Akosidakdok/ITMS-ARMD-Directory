-- Expands the leaves_leaveType_check constraint to accept all current leave types.
-- Run once in the Supabase SQL Editor (Dashboard > SQL Editor > New Query).

ALTER TABLE public.leaves
  DROP CONSTRAINT IF EXISTS "leaves_leaveType_check",
  ADD CONSTRAINT "leaves_leaveType_check"
    CHECK ("leaveType" IN (
      -- Current canonical leave types
      'Vacation Leave',
      'Sick Leave',
      'Maternity Leave',
      'Paternity Leave',
      'Calamity Leave',
      'Special Leave for Women (Magna Carta of Women)',
      'Compensatory Time Off (CTO)',
      -- Legacy full-name leave types
      'Service Leave',
      'Mandatory Leave',
      'Special Privilege Leave',
      'Study Leave',
      'Emergency Leave',
      -- Legacy short-form values (existing rows may still use these)
      'Vacation',
      'Sick',
      'Maternity',
      'Paternity',
      'Special'
    ));
