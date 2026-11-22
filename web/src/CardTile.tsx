import { useEffect, useState } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import { rankForRung } from './cardRank';

type TradingCardProps = {
  name: string; kind: 'Equipment' | 'Exercise'; state: string;
  level?: number; series?: string; summary?: string; requirements?: string; footer?: string; locked?: boolean; factLabel?: 'Builds' | 'Adds';
  artwork?: string | null; fallbackArtwork?: string | null; onOpen?: () => void;
  buttonRef?: (node: HTMLButtonElement | null) => void;
};

/** One portrait frame for collection cards and their detail heroes. */
export function TradingCard({ name, kind, state, level, series, summary, requirements, footer, locked = false, factLabel = 'Builds', artwork, fallbackArtwork, onOpen, buttonRef }: TradingCardProps) {
  const [failed, setFailed] = useState(0);
  const rank = rankForRung(level);
  useEffect(() => setFailed(0), [artwork, fallbackArtwork]);
  const image = failed === 0 ? (artwork || fallbackArtwork) : failed === 1 && artwork ? fallbackArtwork : null;
  return <article className="trading-card" data-kind={kind} data-level={level}>
    <div className="trading-card-inner">
      <header className="trading-card-nameplate"><h3>{name}</h3>{rank ? <span className="trading-card-stage" data-rank={rank.name} role="img" aria-label={`${rank.name}, level ${rank.rung}`}><span>{rank.rung}</span></span> : kind === 'Equipment' ? <span className="trading-card-stage trading-card-gear" role="img" aria-label="Equipment"><SettingsIcon aria-hidden="true" /></span> : null}</header>
      <div className="trading-card-art" aria-hidden="true">
        {image ? <img src={image} alt="" onError={() => setFailed((n) => n + 1)} /> : <span className="trading-card-back">{series ?? kind}{locked && <small>Locked</small>}<span className="sr-only">Artwork unavailable</span></span>}
      </div>
      <div className="trading-card-rail"><span>{kind}</span><span>{series ?? 'Collection'}</span></div>
      <div className="trading-card-copy">{summary && <p><strong>{kind === 'Exercise' ? `${factLabel}: ` : 'Enables: '}</strong>{summary}</p>}{requirements && <p><strong>{kind === 'Exercise' ? 'Needs: ' : 'Also needs: '}</strong>{requirements}</p>}</div>
      <footer className="trading-card-footer"><span>{footer ?? 'Collection'}</span><span className="trading-card-state">{state}</span></footer>
    </div>
    {onOpen && <button type="button" className="secondary trading-card-action" ref={buttonRef} aria-label={`${kind}: ${name}.${rank ? ` ${rank.name}, level ${rank.rung}.` : ''} ${state}. Open card`} onClick={onOpen}><span className="sr-only">View</span></button>}
  </article>;
}
