// Newer client instructions take precedence over the October reference roster.
// Match the complete identity and only fill missing fields; never bulk replace a roster.
const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
const instructions = [
  { firstName: 'NECILDA', middleName: 'JAVINIAR', lastName: 'GONZALES', patch: { countedUnit: 'DICTM', dutyAssignments: [{ kind: 'Detail', unit: 'DICTM' }] } },
  { firstName: 'JAN MICHAEL', middleName: 'PONTILA', lastName: 'ORNIDO', patch: { countedUnit: 'NCRPO', dutyAssignments: ['NCRPO', 'SAF', 'EOD/K9'].map(unit => ({ kind: 'Detail', unit })) } },
  { firstName: 'JAY WALTER', middleName: 'SANTIAGO', lastName: 'SANTOS', patch: { countedUnit: 'FS', dutyAssignments: [{ kind: 'Main', unit: 'RICTMD', designation: 'Assistant Chief, RICTMD' }, { kind: 'Additional', unit: 'FS' }] } },
  { firstName: 'MOISES REUEL', middleName: 'DE ASIS', lastName: 'SANTIAGO', patch: { sub_unit: 'Administrative and Resource Management Division', subUnitCode: 'C0216', station: 'Logistics Section', countedUnit: 'ARMD', dutyAssignments: [{ kind: 'Technical assistance', unit: 'ITSD' }] } },
  { firstName: 'RUEL', middleName: 'AMPIS', lastName: 'APALLA', patch: { additionalDesignations: ['PAIS Encoder', 'Focal Person', 'OJT Coordinator', 'Alternate Secretary'] } }
];
export function getClientPersonnelCorrections(personnel) {
  return instructions.map(instruction => {
    const matches = personnel.filter(person => ['firstName', 'middleName', 'lastName'].every(field => normalize(person[field]) === instruction[field]));
    if (matches.length !== 1) return { name: `${instruction.firstName} ${instruction.middleName} ${instruction.lastName}`, error: `Expected one identity match; found ${matches.length}.` };
    const person = matches[0];
    const patch = Object.fromEntries(Object.entries(instruction.patch).filter(([field]) => Array.isArray(person[field]) ? person[field].length === 0 : !String(person[field] || '').trim()));
    return { id: person.id, name: person.fullName, patch };
  });
}
