export const serverOrigin =
  import.meta.env.VITE_SERVER_ORIGIN ?? `${window.location.protocol}//${window.location.hostname}:3001`;
export const wsOrigin = serverOrigin.replace('http', 'ws');
export const SAFE_QR_PREFIX = 'data:image/png;base64,';

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

/** Send a message on the room socket. `payload` defaults to `{}` for the many empty-payload verbs. */
export type Send = (type: string, payload?: unknown) => void;
