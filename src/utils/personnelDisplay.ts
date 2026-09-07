/**
 * Formats the organizational assignment display for personnel.
 * New structure: SUB-UNIT - DETAILS - STATION
 * 
 * Rules:
 * 1. If all exist:
 *    "Network Operations Section - Network Monitoring - Camp Crame"
 * 2. If Sub-Unit exists but Details is empty:
 *    "Network Operations Section - No Details recorded - Camp Crame"
 * 3. If both Sub-Unit and Details are empty:
 *    "No Details recorded - Camp Crame"
 * 4. If Station is empty:
 *    Replaced with "No Station recorded"
 *    e.g. "No Details recorded - No Station recorded"
 * 
 * Display-only fallbacks; these are NEVER saved to the database.
 */
export function formatPersonnelOrgDisplay(
  subUnit?: string | null,
  details?: string | null,
  station?: string | null
): string {
  const su = (subUnit || '').trim();
  const dt = (details || '').trim();
  const st = (station || '').trim();

  let orgPart: string;
  if (su && dt) {
    orgPart = `${su} - ${dt}`;
  } else if (su && !dt) {
    orgPart = `${su} - No Details recorded`;
  } else if (!su && dt) {
    orgPart = dt;
  } else {
    orgPart = 'No Details recorded';
  }

  const stationPart = st ? st : 'No Station recorded';

  return `${orgPart} - ${stationPart}`;
}
