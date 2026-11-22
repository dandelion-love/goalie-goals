import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TradingCard } from './CardTile';
afterEach(cleanup);
it('keeps a named usable card when original and fallback artwork fail', () => {
  const onOpen = vi.fn();
  const { container } = render(<TradingCard kind="Exercise" name="Example exercise" state="Approved; readiness not checked" artwork="/original.webp" fallbackArtwork="/figure.svg" onOpen={onOpen} />);
  const image = () => container.querySelector('img')!;
  expect(image().getAttribute('src')).toBe('/original.webp');
  fireEvent.error(image());
  expect(image().getAttribute('src')).toBe('/figure.svg');
  fireEvent.error(image());
  expect(screen.getByText('Artwork unavailable')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Exercise: Example exercise/ }));
  expect(onOpen).toHaveBeenCalledOnce();
});
