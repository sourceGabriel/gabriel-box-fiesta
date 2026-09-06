import type { HTMLAttributes } from 'react';

/** A surface: panel background + hairline border + rounded corners. Layout is the caller's via `className`. */
export function Panel({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-panel ${className}`.trim()} {...rest} />;
}
