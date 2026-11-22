import { useId, useState } from 'react';
import type { Dossier, DossierClaim } from './dossier';

// An exercise's dossier (story 115): why it matters for a goalkeeper and what to expect, each
// claim with the numbers of its sources, and the sources with their links. The muscle map, clips
// and the other sections come later.

/** Claims in order, with each label once over the run of claims that share it. */
function groups(claims: DossierClaim[]): { label: string; claims: DossierClaim[] }[] {
  const out: { label: string; claims: DossierClaim[] }[] = [];
  for (const c of claims) {
    const last = out[out.length - 1];
    if (last && last.label === c.label) last.claims.push(c);
    else out.push({ label: c.label, claims: [c] });
  }
  return out;
}

function Claims({ claims, showEvidence = false }: { claims: DossierClaim[]; showEvidence?: boolean }) {
  return (
    <dl className="dossier-claims">
      {groups(claims).map((g, i) => (
        <div key={`${g.label}-${i}`}>
          <dt>{g.label}</dt>
          {g.claims.map((c, j) => (
            <dd key={j}>
              {c.text}
              {showEvidence && c.evidence && ` Evidence: ${c.evidence}.`}
              {c.sources.length > 0 && (
                <span className="dossier-refs">
                  {' '}
                  <span className="sr-only">Sources</span>
                  {`[${c.sources.join(', ')}]`}
                </span>
              )}
            </dd>
          ))}
        </div>
      ))}
    </dl>
  );
}

/** The dossier itself. `level` is the heading level of its sections where it sits. */
export function DossierView({ dossier, level = 3 }: { dossier: Dossier; level?: 3 | 4 }) {
  const H = level === 3 ? 'h3' : 'h4';
  return (
    <div className="dossier">
      <p className="dossier-headline">{dossier.headline}</p>
      <H>Why it matters for a goalkeeper</H>
      {dossier.whyUnavailable && <p>{dossier.whyUnavailable}</p>}
      <Claims claims={dossier.why} />
      <H>What to expect</H>
      {dossier.expectUnavailable && <p>{dossier.expectUnavailable}</p>}
      <Claims claims={dossier.expect} />
      {dossier.context && <><H>Research context and limits</H><Claims claims={dossier.context} showEvidence /></>}
      <H>Sources</H>
      <ol className="dossier-sources">
        {dossier.sources.map((s) => (
          <li key={s.n} value={s.n}>
            <cite>{s.title}</cite>
            {s.url && (
              <>
                {' '}
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  Open<span className="sr-only">{` source ${s.n}`}</span>
                </a>
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

type Load = { kind: 'idle' | 'loading' | 'error' } | { kind: 'ready'; dossier: Dossier };

/**
 * A button that opens the dossier below it, and closes it again. Given the dossier, it opens at
 * once; given `load`, it fetches on the first open (the parent's inbox).
 */
export function DossierToggle({
  dossier,
  load,
  label = 'Why it matters',
  level = 3,
}: {
  dossier?: Dossier;
  load?: () => Promise<Dossier>;
  label?: string;
  level?: 3 | 4;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Load>(dossier ? { kind: 'ready', dossier } : { kind: 'idle' });
  const shown: Load = dossier ? { kind: 'ready', dossier } : state;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !dossier && load && (state.kind === 'idle' || state.kind === 'error')) {
      setState({ kind: 'loading' });
      load()
        .then((d) => setState({ kind: 'ready', dossier: d }))
        .catch(() => setState({ kind: 'error' }));
    }
  };

  return (
    <div className="dossier-toggle">
      <button type="button" className="secondary" aria-expanded={open} aria-controls={id} onClick={toggle}>
        {label}
      </button>
      <div id={id} hidden={!open}>
        {open && shown.kind === 'ready' && <DossierView dossier={shown.dossier} level={level} />}
        {open && shown.kind === 'loading' && <p className="meta">Loading…</p>}
        {open && shown.kind === 'error' && <p className="meta">Couldn't load it. Close and try again.</p>}
      </div>
    </div>
  );
}
