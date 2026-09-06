/** Only render QR images we generated ourselves (base64 PNG data URI). */
const SAFE_QR_PREFIX = 'data:image/png;base64,';

/** The join block: QR image (or a skeleton) + the room code + the join URL. */
export function QrPanel({
  dataUrl,
  code,
  url,
}: {
  dataUrl?: string;
  code: string;
  url?: string;
}) {
  const safe = dataUrl?.startsWith(SAFE_QR_PREFIX) ? dataUrl : undefined;
  return (
    <div className="ui-qr">
      {safe ? <img src={safe} alt="QR code da sala" /> : <div className="ui-qr-skeleton" aria-hidden="true" />}
      <p className="ui-qr-code">{code || '----'}</p>
      {url ? <p className="ui-qr-url">{url}</p> : null}
    </div>
  );
}
