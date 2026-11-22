import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import { ThemeProvider } from '@mui/material/styles';
import { materialTheme } from './materialTheme';

export type Destination = { id: string; label: string; title?: string };

/** Keep the role's destinations in browser history, with a safe role-specific fallback. */
export function useDestination(destinations: readonly Destination[], fallback: string) {
  const valid = useCallback((value: string | null) => destinations.some((item) => item.id === value) ? value! : fallback, [destinations, fallback]);
  const [current, setCurrent] = useState(() => valid(new URL(window.location.href).searchParams.get('view')));
  const navigation = useRef<HTMLButtonElement>(null);
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
      if (focus) requestAnimationFrame(() => navigation.current?.focus());
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

/** Shared role toolbar and on-demand navigation; only the destination pane scrolls. */
export function RoleShell({ title, destinations, current, navigate, navigation, content, heading, action, children }: {
  title: string; destinations: readonly Destination[]; current: string; navigate: (id: string) => void;
  navigation: RefObject<HTMLButtonElement | null>; content: RefObject<HTMLDivElement | null>;
  heading?: RefObject<HTMLHeadingElement | null>; action?: ReactNode; children: ReactNode;
}) {
  const destination = destinations.find((item) => item.id === current);
  const label = destination?.title ?? destination?.label ?? title;
  const [open, setOpen] = useState(false);
  return <ThemeProvider theme={materialTheme}><section className="home role-shell" aria-label={title}>
    <AppBar position="static" className="destination-bar" elevation={0}>
      <Toolbar className="destination-toolbar" variant="dense" disableGutters>
        <IconButton ref={navigation} color="inherit" aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><MenuIcon /></IconButton>
        <h1 id="home-title" ref={heading} tabIndex={-1}>{label}</h1>
        {action}
      </Toolbar>
    </AppBar>
    {open && <Drawer open onClose={() => setOpen(false)} slotProps={{ paper: { 'aria-label': title === 'Keeper home' ? 'Keeper navigation' : 'Parent navigation' } }}>
      <nav className="keeper-nav" aria-label={title === 'Keeper home' ? 'Keeper navigation' : 'Parent navigation'}>
        <List>{destinations.map((item) => <ListItemButton key={item.id} component="button" selected={current === item.id} aria-current={current === item.id ? 'page' : undefined} onClick={() => { navigate(item.id); setOpen(false); }}><ListItemText primary={item.label} /></ListItemButton>)}</List>
      </nav>
    </Drawer>}
    <div className="role-content" ref={content} aria-label={`${label} content`}>
      {children}
    </div>
  </section></ThemeProvider>;
}
