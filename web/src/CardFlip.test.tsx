import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TradingCard } from './CardTile';

afterEach(cleanup);
it('flips in place with focus retained and leaves the open action separate', () => {
  const open = vi.fn();
  render(<TradingCard kind="Exercise" name="Example" onOpen={open} backFace={<p>Back content</p>} />);
  const flip = screen.getByRole('button', { name: 'Show muscles worked for Example' });
  flip.focus(); fireEvent.click(flip);
  expect(open).not.toHaveBeenCalled();
  expect(screen.getByText('Back content')).toBeTruthy();
  expect(document.activeElement).toBe(flip);
  expect(screen.queryByRole('button', { name: /Open card/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Show front of Example' }));
  fireEvent.click(screen.getByRole('button', { name: /Open card/ }));
  expect(open).toHaveBeenCalledOnce();
});
it('does not expose a back for a locked card', () => {
  render(<TradingCard kind="Exercise" name="Locked" locked backFace={<p>Hidden</p>} />);
  expect(screen.queryByRole('button', { name: /Show muscles/ })).toBeNull();
  expect(screen.queryByText('Hidden')).toBeNull();
});
