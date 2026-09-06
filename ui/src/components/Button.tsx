import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'success' | 'ghost' | 'danger';

/** Standard button. `primary` = amber→red CTA, `success` = green, `ghost` = outline, `danger` = red. */
export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={`ui-btn ui-btn--${variant} ${className}`.trim()} {...rest} />;
}
