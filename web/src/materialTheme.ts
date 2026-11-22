import { createTheme } from '@mui/material/styles';

/** Material components share the app's existing theme, including its light/dark tokens. */
export const materialTheme = createTheme({
  typography: { fontFamily: 'var(--font-body)' },
  components: {
    MuiAppBar: { styleOverrides: { root: { backgroundColor: 'var(--action)', color: 'var(--action-on)' } } },
    MuiPaper: { styleOverrides: { root: { backgroundColor: 'var(--surface)', color: 'var(--text)' } } },
    MuiListItemButton: { styleOverrides: { root: { '&.Mui-selected': { backgroundColor: 'var(--action-tint)', color: 'var(--action-ink)' } } } },
  },
});
