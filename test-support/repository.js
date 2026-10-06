import { PAISRepository } from '../backend/store/repository.js';

export const createTestRepository = () => {
  const sequenceCounters = new Map();

  return new PAISRepository({
    initialData: false,
    orderIssuanceAdapter: {
      allocate: ({ year, series }) => {
        const key = `${year}:${series}`;
        const sequence = (sequenceCounters.get(key) || 0) + 1;
        sequenceCounters.set(key, sequence);
        return sequence;
      }
    }
  });
};

export const issueTestOrder = (repository, input) => {
  const series = input.series || 'SO';
  const purposeCode = input.purposeCode || 'DES';
  const subject = input.subject || input.title || `${purposeCode} order test fixture`;
  const signatory = input.signatory || input.signatoryName;
  const personnelIds = input.personnelIds || input.personnelInvolvement?.map(entry => entry.personnelId) || [];
  const payload = {
    ...input,
    series,
    purposeCode,
    orderType: input.orderType || `${series} - ${purposeCode}`,
    subject,
    personnelIds,
    ...(signatory ? { signatory } : {})
  };

  delete payload.title;
  delete payload.signatoryName;
  return repository.createOrder(payload);
};
