import type { ButtonHTMLAttributes, ReactNode, RefObject } from 'react';

/** Common controls and text used by both role screens. */
export function Button({ variant = 'secondary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return <button type="button" {...props} className={`${variant} ${className}`.trim()} />;
}

export function StatusLabel({ children }: { children: ReactNode }) {
  return <span className="status-label">{children}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}

export function DestinationHeader({ title, heading, action }: { title: string; heading?: RefObject<HTMLHeadingElement | null>; action?: ReactNode }) {
  return <div className="home-bar"><h1 id="home-title" ref={heading} tabIndex={-1}>{title}</h1>{action}</div>;
}
