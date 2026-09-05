import { networkInterfaces } from 'node:os';

export type LocalAddressCandidate = {
  interfaceName: string;
  address: string;
};

const privateV4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

type IPv4Priority = { rank: number; value: string };

const getAddressPriority = (address: string): IPv4Priority => {
  if (/^192\.168\.(137|43)\./.test(address)) {
    return { rank: 5, value: address };
  }
  if (/^192\.168\./.test(address)) {
    return { rank: 4, value: address };
  }
  if (/^10\./.test(address)) {
    return { rank: 3, value: address };
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) {
    return { rank: 2, value: address };
  }
  if (/^169\.254\./.test(address)) {
    return { rank: 1, value: address };
  }
  return { rank: 0, value: address };
};

const isUsableLocalIPv4 = (address: string, internal: boolean): boolean => {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(address)) {
    return false;
  }
  if (address === '127.0.0.1' || address === '0.0.0.0') {
    return false;
  }
  if (privateV4.test(address) || /^169\.254\./.test(address)) {
    return true;
  }
  return !internal;
};

export const listLocalIPv4Candidates = (): LocalAddressCandidate[] => {
  const net = networkInterfaces();
  const seen = new Set<string>();
  const candidates: LocalAddressCandidate[] = [];

  for (const [interfaceName, addresses] of Object.entries(net)) {
    for (const item of addresses ?? []) {
      if (item.family !== 'IPv4' || !isUsableLocalIPv4(item.address, Boolean(item.internal))) {
        continue;
      }
      if (!seen.has(item.address)) {
        seen.add(item.address);
        candidates.push({ interfaceName, address: item.address });
      }
    }
  }

  return candidates.sort((a, b) => {
    const aPriority = getAddressPriority(a.address);
    const bPriority = getAddressPriority(b.address);

    if (aPriority.rank !== bPriority.rank) {
      return bPriority.rank - aPriority.rank;
    }

    const aPrivate = privateV4.test(a.address) ? 1 : 0;
    const bPrivate = privateV4.test(b.address) ? 1 : 0;
    if (aPrivate !== bPrivate) {
      return bPrivate - aPrivate;
    }

    return a.address.localeCompare(b.address);
  });
};

export const pickPrimaryLocalIPv4 = (): string => listLocalIPv4Candidates()[0]?.address ?? '127.0.0.1';
