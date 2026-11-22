import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Typography from '@mui/material/Typography';

/** Common controls and text used by both role screens. */
export function Button({ variant = 'secondary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return <button type="button" {...props} className={`${variant} ${className}`.trim()} />;
}

export function StatusLabel({ children }: { children: ReactNode }) {
  return <Typography component="span" variant="inherit" className="status-label">{children}</Typography>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <Typography component="p" variant="body1" className="empty-state">{children}</Typography>;
}
