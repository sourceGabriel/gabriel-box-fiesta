import { useState } from 'react';

/**
 * A prompt + free-text answer box for phone controllers (Zap!, later Fibbage).
 * Self-contained: it keeps its own draft, seeded once from `submittedText`. When
 * the round changes, give it a fresh `key` so the draft resets.
 *
 * `submittedText` non-null means the server already has an answer for this slot —
 * the box shows a "✓ enviado" badge and the button reads "Atualizar" while the
 * draft still matches; editing re-enables "Enviar".
 */
export function TextAnswerInput({
  prompt,
  placeholder = 'Digite sua resposta…',
  maxLength = 80,
  submittedText = null,
  disabled = false,
  onSubmit,
}: {
  prompt: string;
  placeholder?: string;
  maxLength?: number;
  submittedText?: string | null;
  disabled?: boolean;
  onSubmit: (text: string) => void;
}) {
  const [draft, setDraft] = useState(submittedText ?? '');
  const trimmed = draft.trim();
  const isSent = submittedText !== null && trimmed === submittedText.trim() && trimmed.length > 0;
  const canSend = !disabled && trimmed.length > 0 && !isSent;

  return (
    <div className={`ui-answer ${isSent ? 'is-sent' : ''}`}>
      <p className="ui-answer-prompt">{prompt}</p>
      <textarea
        className="ui-answer-field"
        value={draft}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={2}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="ui-answer-foot">
        <span className="ui-answer-count">
          {isSent ? '✓ enviado' : `${draft.length}/${maxLength}`}
        </span>
        <button
          type="button"
          className="ui-btn ui-btn--primary ui-answer-send"
          disabled={!canSend}
          onClick={() => canSend && onSubmit(trimmed)}
        >
          {submittedText !== null ? 'Atualizar' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
