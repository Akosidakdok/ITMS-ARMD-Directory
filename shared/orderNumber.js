export const formatOfficialOrderNumber = value => String(value ?? '').trim();

export const getOfficialOrderNumber = order => formatOfficialOrderNumber(
  order?.orderNumber || order?.orderNo || ''
);
