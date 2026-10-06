import type { OrderRecord } from '../types/pais';
import { formatOfficialOrderNumber } from '../../shared/orderNumber.js';

export { formatOfficialOrderNumber };

export const getOfficialOrderNumber = (order: Pick<OrderRecord, 'orderNumber' | 'orderNo'> | null | undefined): string =>
  formatOfficialOrderNumber(order?.orderNumber || order?.orderNo);

export const getOrderNumberDisplay = (
  order: Pick<OrderRecord, 'orderNumber' | 'orderNo' | 'issuancePending'> | null | undefined,
  fallback = 'Legacy number unavailable'
): string => getOfficialOrderNumber(order) || (order?.issuancePending ? 'Number pending' : fallback);
