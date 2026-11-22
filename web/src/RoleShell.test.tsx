import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RoleShell, useDestination } from './RoleShell';

const destinations = [{ id: 'today', label: 'Today' }, { id: 'week', label: 'Week' }] as const;
function Example() {
  const { current, navigate, navigation, content } = useDestination(destinations, 'today');
  return <RoleShell title="Keeper home" destinations={destinations} current={current} navigate={navigate} navigation={navigation} content={content}><p>{current} view</p></RoleShell>;
}
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });

describe('role destinations', () => {
  it('restores the selected view on Back and returns focus to the menu trigger', async () => {
    window.history.replaceState(null, '', '/?view=today');
    render(<Example />);
    expect(screen.getByRole('heading', { name: 'Today', level: 1 })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Week' }));
    expect(screen.getByRole('heading', { name: 'Week', level: 1 })).toBeTruthy();
    expect(new URL(window.location.href).searchParams.get('view')).toBe('week');
    window.history.back();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Today', level: 1 })).toBeTruthy());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open navigation menu' })));
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(screen.getByRole('button', { name: 'Today' }).getAttribute('aria-current')).toBe('page');
  });

  it('falls back safely for a destination from another role', async () => {
    window.history.replaceState(null, '', '/?view=inbox');
    render(<Example />);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(screen.getByRole('button', { name: 'Today' }).getAttribute('aria-current')).toBe('page');
    await waitFor(() => expect(new URL(window.location.href).searchParams.get('view')).toBe('today'));
  });

  it('dismisses the drawer with Escape and returns focus to its trigger', async () => {
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Open navigation menu' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('navigation', { name: 'Keeper navigation' })).toBeTruthy();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('navigation')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
