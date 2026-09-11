import assert from 'node:assert/strict';
import test from 'node:test';

import { db } from '../backend/store/repository.js';

test('promotions repository manages full CRUD and personnel rank synchronization', async () => {
  // 1. Create test personnel
  const testPersonnelId = `test-pnp-${Date.now()}`;
  const initialPersonnel = {
    id: testPersonnelId,
    rank: 'PCpl',
    rankFullName: 'Police Corporal',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    fullName: 'Juan Dela Cruz',
    badgeNo: 'TEST-1234',
    dateOfEntry: '2020-01-15',
    lastPromotionDate: '2020-01-15',
    status: 'Active'
  };

  db.inMemoryPersonnel.push(initialPersonnel);

  // 2. Add first promotion (PCpl -> PSSg on 2022-06-01)
  const promo1 = await db.createPromotion({
    id: `promo-1-${Date.now()}`,
    personnelId: testPersonnelId,
    rankFrom: 'PCpl',
    rankTo: 'PSSg',
    promotionDate: '2022-06-01',
    orderNumber: 'SO-TEST-001'
  });

  const pAfterPromo1 = db.inMemoryPersonnel.find(p => p.id === testPersonnelId);
  assert.equal(pAfterPromo1.rank, 'PSSg');
  assert.equal(pAfterPromo1.lastPromotionDate, '2022-06-01');

  // 3. Add second promotion (PSSg -> PMSg on 2024-07-01)
  const promo2 = await db.createPromotion({
    id: `promo-2-${Date.now()}`,
    personnelId: testPersonnelId,
    rankFrom: 'PSSg',
    rankTo: 'PMSg',
    promotionDate: '2024-07-01',
    orderNumber: 'SO-TEST-002'
  });

  const pAfterPromo2 = db.inMemoryPersonnel.find(p => p.id === testPersonnelId);
  assert.equal(pAfterPromo2.rank, 'PMSg');
  assert.equal(pAfterPromo2.lastPromotionDate, '2024-07-01');

  // 4. Add backdated promotion (Pat -> PCpl on 2018-05-01). Should NOT downgrade active rank
  const promoBackdated = await db.createPromotion({
    id: `promo-back-${Date.now()}`,
    personnelId: testPersonnelId,
    rankFrom: 'Pat',
    rankTo: 'PCpl',
    promotionDate: '2018-05-01',
    orderNumber: 'SO-TEST-000'
  });

  const pAfterBackdated = db.inMemoryPersonnel.find(p => p.id === testPersonnelId);
  assert.equal(pAfterBackdated.rank, 'PMSg', 'Active rank must remain newest rank PMSg');
  assert.equal(pAfterBackdated.lastPromotionDate, '2024-07-01');

  // 5. Update promo2 effective date or rank (e.g. PMSg -> PSMS)
  await db.updatePromotion(promo2.id, {
    rankTo: 'PSMS',
    promotionDate: '2024-08-01'
  });

  const pAfterUpdate = db.inMemoryPersonnel.find(p => p.id === testPersonnelId);
  assert.equal(pAfterUpdate.rank, 'PSMS');
  assert.equal(pAfterUpdate.lastPromotionDate, '2024-08-01');

  // 6. Delete latest promotion (promo2). Personnel rank should roll back to promo1 ('PSSg')
  await db.deletePromotion(promo2.id);

  const pAfterDeleteLatest = db.inMemoryPersonnel.find(p => p.id === testPersonnelId);
  assert.equal(pAfterDeleteLatest.rank, 'PSSg', 'Should roll back to promo1 rank PSSg');
  assert.equal(pAfterDeleteLatest.lastPromotionDate, '2022-06-01');

  // 7. Delete promo1. Remaining promotion is promoBackdated ('PCpl')
  await db.deletePromotion(promo1.id);
  const pAfterDeletePromo1 = db.inMemoryPersonnel.find(p => p.id === testPersonnelId);
  assert.equal(pAfterDeletePromo1.rank, 'PCpl', 'Should roll back to promoBackdated rank PCpl');
  assert.equal(pAfterDeletePromo1.lastPromotionDate, '2018-05-01');

  // 8. Delete promoBackdated. No promotions left, should roll back to baseline rank and clear lastPromotionDate
  await db.deletePromotion(promoBackdated.id);
  const pAfterDeleteAll = db.inMemoryPersonnel.find(p => p.id === testPersonnelId);
  assert.equal(pAfterDeleteAll.rank, 'Pat', 'Should roll back to rankFrom of last deleted promotion');
  assert.equal(pAfterDeleteAll.lastPromotionDate, null);

  // Clean up
  db.inMemoryPersonnel = db.inMemoryPersonnel.filter(p => p.id !== testPersonnelId);
});
