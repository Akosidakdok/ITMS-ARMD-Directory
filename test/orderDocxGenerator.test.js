import assert from 'node:assert/strict';
import test from 'node:test';
import mammoth from 'mammoth';
import { strFromU8, unzipSync } from 'fflate';
import { formatDocumentOrderNumber, generateOrderDocx } from '../backend/services/orderDocxGenerator.js';
import { isDocxZip } from '../backend/services/orderDocumentStorage.js';

test('generates a reference-based DOCX with order and personnel content', async () => {
  const { buffer, manifest } = await generateOrderDocx({
    id: 'order-travel-1',
    orderNumber: 'ITMS-SO-TR-2026-0001',
    series: 'SO',
    purposeCode: 'TR',
    issuedDate: '2026-09-22',
    subject: 'Official Travel',
    signatoryRank: 'Police Lieutenant General',
    certifyingOfficial: 'COLONEL TEST CERTIFIER',
    certifyingOfficialRank: 'Police Lieutenant Colonel',
    certifyingOfficialPosition: 'Acting Chief, Resource Management Division',
    purposeData: {
      destinations: ['Manila', 'Cebu'],
      travelStartDate: '2026-10-01',
      travelEndDate: '2026-10-03',
      activity: 'ITMS coordination conference'
    },
    personnelSnapshot: [
      { personnelId: 'p-1', role: 'traveler', sequence: 1, rank: 'PSSG', fullName: 'JUAN DELA CRUZ' },
      { personnelId: 'p-2', role: 'driver', sequence: 2, rank: 'PCPL', fullName: 'MARIA SANTOS' }
    ]
  });

  assert.equal(isDocxZip(buffer), true);
  assert.equal(manifest.templateKey, 'pnp-itms-letter-orders');
  assert.equal(manifest.templateVersion, '1.8.0');
  assert.equal(manifest.personnelSnapshot.length, 2);

  const converted = await mammoth.convertToHtml({ buffer });
  assert.match(converted.value, /NUMBER ITMS-SO-TR-2026-0001/);
  assert.doesNotMatch(converted.value, /NUMBER 2026-0001/);
  assert.match(converted.value, /OFFICIAL TRAVEL/i);
  assert.match(converted.value, /JUAN DELA CRUZ/);
  assert.match(converted.value, /MARIA SANTOS/);
  assert.match(converted.value, /COLONEL TEST CERTIFIER/);
  assert.match(converted.value, /Police Lieutenant Colonel/);
  assert.match(converted.value, /Acting Chief, Resource Management Division/);
  assert.match(converted.value, /Police Lieutenant General/);

  const xml = strFromU8(unzipSync(buffer)['word/document.xml']);
  const authorityStart = xml.lastIndexOf('<w:p', xml.indexOf('BY COMMAND'));
  const authorityEnd = xml.indexOf('</w:p>', xml.indexOf('BY COMMAND')) + '</w:p>'.length;
  assert.match(xml.slice(authorityStart, authorityEnd), /<w:jc w:val="center"\/>/, 'the command line is centered');
  const signatureTableStart = xml.indexOf('<w:tbl>', authorityEnd);
  const paragraphsAfterCommand = [...xml.slice(authorityEnd, signatureTableStart).matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map(match => match[0]);
  assert.equal(paragraphsAfterCommand.length, 4, 'four paragraphs separate the command line from the signature table');
  assert.ok(paragraphsAfterCommand.every(item => !item.includes('<w:r>')), 'all four paragraphs are empty');

  const firstOfficerTableEnd = xml.indexOf('</w:tbl>', signatureTableStart) + '</w:tbl>'.length;
  const firstOfficerTable = xml.slice(signatureTableStart, firstOfficerTableEnd);
  const firstOfficerCells = [...firstOfficerTable.matchAll(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g)].map(match => match[0]);
  assert.match(firstOfficerCells[2], /Police Lieutenant General/);

  const officialIndex = xml.indexOf('OFFICIAL:', firstOfficerTableEnd);
  const officialStart = xml.lastIndexOf('<w:p', officialIndex);
  const officialEnd = xml.indexOf('</w:p>', officialIndex) + '</w:p>'.length;
  assert.ok(officialStart >= firstOfficerTableEnd, 'OFFICIAL follows the first officer');
  assert.match(xml.slice(officialStart, officialEnd), /<w:jc w:val="left"\/>/, 'OFFICIAL is left aligned');

  const certifyingTableStart = xml.indexOf('<w:tbl>', officialEnd);
  const paragraphsAfterOfficial = [...xml.slice(officialEnd, certifyingTableStart).matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map(match => match[0]);
  assert.equal(paragraphsAfterOfficial.length, 4, 'four blank lines separate OFFICIAL from the certifying officer');
  assert.ok(paragraphsAfterOfficial.every(item => !item.includes('<w:r>')));
  const certifyingTable = xml.slice(certifyingTableStart, xml.indexOf('</w:tbl>', certifyingTableStart) + '</w:tbl>'.length);
  const certifyingCells = [...certifyingTable.matchAll(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g)].map(match => match[0]);
  assert.match(certifyingCells[0], /COLONEL TEST CERTIFIER/);
  assert.doesNotMatch(certifyingCells[2], /COLONEL TEST CERTIFIER/);

  const certifyingTableEnd = certifyingTableStart + certifyingTable.length;
  const distributionStart = xml.lastIndexOf('<w:p', xml.indexOf('DISTRIBUTION:', certifyingTableEnd));
  const paragraphsBeforeDistribution = [...xml.slice(certifyingTableEnd, distributionStart).matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map(match => match[0]);
  assert.equal(paragraphsBeforeDistribution.length, 2, 'two blank lines precede DISTRIBUTION');
  assert.ok(paragraphsBeforeDistribution.every(item => !item.includes('<w:r>')));
});

test('formats document order numbers using only year and sequence', () => {
  assert.equal(formatDocumentOrderNumber('ITMS-GO-RCA-2026-0003'), 'ITMS-GO-RCA-2026-0003');
  assert.equal(formatDocumentOrderNumber('legacy-number'), 'legacy-number');
});

test('renders non-Travel purpose details in the generated document', async () => {
  const { buffer } = await generateOrderDocx({
    id: 'order-designation-1',
    orderNumber: 'ITMS-GO-DES-2026-0002',
    series: 'GO',
    purposeCode: 'DES',
    issuedDate: '2026-09-22',
    subject: 'Designation',
    purposeData: { designation: 'Operations Officer', assignedUnit: 'ITMS Operations Division' },
    personnelSnapshot: [{ personnelId: 'p-1', role: 'affected', sequence: 1, rank: 'PSSG', fullName: 'JUAN DELA CRUZ' }]
  });
  const converted = await mammoth.convertToHtml({ buffer });
  assert.match(converted.value, /Operations Officer/);
  assert.match(converted.value, /ITMS Operations Division/);
});

test('generates an Award-purpose Administrative Order with citation and recipient', async () => {
  const { buffer } = await generateOrderDocx({
    id: 'order-award-1',
    orderNumber: 'ITMS-GO-AW-2026-0001',
    series: 'GO',
    purposeCode: 'AW',
    issuedDate: '2026-09-22',
    subject: 'Medalya Ng Pagkilala',
    purposeData: {
      awardTitle: 'Medalya Ng Pagkilala',
      citation: 'For meritorious service in support of ITMS operations.'
    },
    personnelSnapshot: [
      { personnelId: 'p-award-1', role: 'recipient', sequence: 1, rank: 'PSSG', fullName: 'ALEX REYES' }
    ]
  });

  assert.equal(isDocxZip(buffer), true);
  const converted = await mammoth.convertToHtml({ buffer });
  assert.match(converted.value, /NUMBER ITMS-GO-AW-2026-0001/);
  assert.match(converted.value, /Medalya Ng Pagkilala/);
  assert.match(converted.value, /For meritorious service in support of ITMS operations/);
  assert.match(converted.value, /ALEX REYES/);
  assert.match(converted.value, /Award recipient/i);
});
