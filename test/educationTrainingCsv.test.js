import assert from 'node:assert/strict';
import test from 'node:test';

import { parseEducationCsv } from '../src/utils/educationCsv.ts';
import { parseTrainingCsv } from '../src/utils/trainingCsv.ts';

test('maps the academic-attainment columns to an education record', () => {
  const csv = [
    'personnelId,academicLevel,school,course,major,startYear,endYear,grade,highest,ranking',
    'pnp-001,College,ICCT College,BS Criminology,Information Technology,2015,2018,Passed,Yes,1'
  ].join('\n');

  const result = parseEducationCsv(csv);

  assert.equal(result.invalidRows.length, 0);
  assert.deepEqual(result.validRows[0], {
    personnelId: 'pnp-001',
    fullName: undefined,
    academicLevel: 'College',
    degree: 'BS Criminology',
    institution: 'ICCT College',
    major: 'Information Technology',
    startYear: 2015,
    yearGraduated: 2018,
    honors: 'Passed',
    highest: true,
    ranking: 1,
    certifications: undefined
  });
});

test('maps the specialized-training columns to a training record', () => {
  const csv = [
    'personnelId,trainingType,trainingTitle,school,location,inclusiveStartDate,inclusiveEndDate,numberOfHours,source,authNumber,authDate,issuedBy,attachment',
    'pnp-001,Specialized,PNP Basic Essentials Computer Course,ITMS,Camp Crame,2024-05-27,2024-06-14,112,GO,2024-286,2024-06-14,PNP TS,order.pdf'
  ].join('\n');

  const result = parseTrainingCsv(csv);

  assert.equal(result.invalidRows.length, 0);
  assert.deepEqual(result.validRows[0], {
    personnelId: 'pnp-001',
    fullName: undefined,
    courseName: 'PNP Basic Essentials Computer Course',
    category: 'Specialized',
    provider: 'ITMS',
    location: 'Camp Crame',
    startDate: '2024-05-27',
    completionDate: '2024-06-14',
    hours: 112,
    source: 'GO',
    certificateNo: '2024-286',
    authorityDate: '2024-06-14',
    issuedBy: 'PNP TS',
    attachment: 'order.pdf'
  });
});
