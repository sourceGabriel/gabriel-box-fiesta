import { networkInterfaces } from 'node:os';

export type LocalAddressCandidate = {
  interfaceName: string;
  address: string;
};

const privateV4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

export const listLocalIPv4Candidates = (): LocalAddressCandidate[] => {
  const net = networkInterfaces();
  const candidates: LocalAddressCandidate[] = [];

  for (const [interfaceName, addresses] of Object.entries(net)) {
    for (const item of addresses ?? []) {
      if (item.family !== 'IPv4' || item.internal) {
        continue;
      }
      candidates.push({ interfaceName, address: item.address });
    }
  }

  return candidates.sort((a, b) => {
    const aScore = privateV4.test(a.address) ? 1 : 0;
    const bScore = privateV4.test(b.address) ? 1 : 0;
    return bScore - aScore;
  });
};

export const pickPrimaryLocalIPv4 = (): string => listLocalIPv4Candidates()[0]?.address ?? '127.0.0.1';
