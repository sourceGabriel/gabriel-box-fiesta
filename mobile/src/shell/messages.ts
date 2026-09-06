export const serverOrigin =
  import.meta.env.VITE_SERVER_ORIGIN ?? `${window.location.protocol}//${window.location.hostname}:3001`;
export const wsOrigin = serverOrigin.replace('http', 'ws');

/** Room code from a `/join/<CODE>` deep link (the QR target), else ''. */
export const getRoomCodeFromPath = (): string => {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments[0] === 'join' && segments[1]) {
    return segments[1].toUpperCase();
  }
  return '';
};

const createMessageId = (): string => {
  const cryptoInstance = globalThis.crypto;
  if (cryptoInstance && typeof cryptoInstance.randomUUID === 'function') {
    return cryptoInstance.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const makeMessage = <TType extends string, TPayload>(type: TType, payload: TPayload) => ({
  messageId: createMessageId(),
  protocolVersion: 1 as const,
  sentAt: Date.now(),
  type,
  payload,
});

/** Send a message on the room socket. `payload` defaults to `{}` for the empty-payload verbs. */
export type Send = (type: string, payload?: unknown) => void;
