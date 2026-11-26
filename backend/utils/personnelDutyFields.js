const kinds = new Set(['Main', 'Detail', 'Additional', 'Technical assistance']);
const text = value => String(value ?? '').trim();
export function getPersonnelDutyDesignations(person) {
  return [...new Set([person.designation, ...(person.additionalDesignations || [])].map(text).filter(Boolean))].join(' / ');
}
export function isRetiredPersonnel(person) {
  return /^retired$|^(optional|compulsory) retirement$/i.test(text(person.status || person.pstatus));
}
function invalid(message) { const error = new Error(message); error.statusCode = 400; throw error; }
export function sanitizePersonnelDutyFields(data) {
  const result = {};
  if (Object.hasOwn(data, 'countedUnit')) {
    if (typeof data.countedUnit !== 'string' || data.countedUnit.length > 250) invalid('Count under must be a unit name of at most 250 characters.');
    result.countedUnit = text(data.countedUnit);
  }
  if (Object.hasOwn(data, 'additionalDesignations')) {
    if (!Array.isArray(data.additionalDesignations) || data.additionalDesignations.length > 50 || data.additionalDesignations.some(v => typeof v !== 'string' || v.length > 250)) invalid('Additional designations must be a list of titles of at most 250 characters each.');
    result.additionalDesignations = [...new Set(data.additionalDesignations.map(text).filter(Boolean))];
  }
  if (Object.hasOwn(data, 'dutyAssignments')) {
    if (!Array.isArray(data.dutyAssignments) || data.dutyAssignments.length > 50) invalid('Duty assignments must be a list of at most 50 assignments.');
    result.dutyAssignments = data.dutyAssignments.map(a => {
      if (!a || !kinds.has(a.kind) || typeof a.unit !== 'string' || !a.unit.trim() || a.unit.length > 250) invalid('Each duty assignment needs a valid kind and unit.');
      if (['designation', 'orderRef'].some(k => a[k] != null && (typeof a[k] !== 'string' || a[k].length > 500))) invalid('Assignment titles and order references must be text of at most 500 characters.');
      return { kind: a.kind, unit: text(a.unit), designation: text(a.designation), orderRef: text(a.orderRef) };
    });
    if (result.dutyAssignments.filter(a => a.kind === 'Main').length > 1) invalid('Only one duty assignment can be marked Main.');
  }
  return result;
}
