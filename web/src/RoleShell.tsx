import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

export type Destination = { id: string; label: string };

/** Keep the role's destinations in browser history, with a safe role-specific fallback. */
export function useDestination(destinations: readonly Destination[], fallback: string) {
  const valid = useCallback((value: string | null) => destinations.some((item) => item.id === value) ? value! : fallback, [destinations, fallback]);
  const [current, setCurrent] = useState(() => valid(new URL(window.location.href).searchParams.get('view')));
  const navigation = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const read = (focus: boolean) => {
      const url = new URL(window.location.href);
      const selected = valid(url.searchParams.get('view'));
      if (url.searchParams.has('view') && url.searchParams.get('view') !== selected) {
        url.searchParams.set('view', selected);
        window.history.replaceState(window.history.state, '', url);
      }
      setCurrent(selected);
      if (content.current) content.current.scrollTop = 0;
      if (focus) requestAnimationFrame(() => navigation.current?.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus());
    };
    read(false);
    const onPop = () => read(true);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [valid]);

  const navigate = useCallback((id: string) => {
    const selected = valid(id);
    if (selected === current) return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', selected);
    window.history.pushState(null, '', url);
    setCurrent(selected);
    if (content.current) content.current.scrollTop = 0;
  }, [current, valid]);
  return { current, navigate, navigation, content };
}

/** Shared role header and persistent navigation; only the destination pane scrolls. */
export function RoleShell({ title, destinations, current, navigate, navigation, content, heading, action, children }: {
  title: string; destinations: readonly Destination[]; current: string; navigate: (id: string) => void;
  navigation: RefObject<HTMLElement | null>; content: RefObject<HTMLDivElement | null>;
  heading?: RefObject<HTMLHeadingElement | null>; action?: ReactNode; children: ReactNode;
}) {
  const label = destinations.find((item) => item.id === current)?.label ?? title;
  return <section className="home role-shell" aria-labelledby="home-title">
    <div className="home-bar"><h1 id="home-title" ref={heading} tabIndex={-1}>{title}</h1>{action}</div>
    <nav ref={navigation} className="keeper-nav" aria-label={title === 'Keeper home' ? 'Keeper navigation' : 'Parent navigation'}>
      {destinations.map((item) => <button key={item.id} type="button" className="secondary" aria-current={current === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>{item.label}</button>)}
    </nav>
    <div className="role-content" ref={content} aria-label={`${label} content`}>
      {children}
    </div>
  </section>;
}
