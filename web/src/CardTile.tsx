import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import FlipIcon from '@mui/icons-material/Flip';
import IconButton from '@mui/material/IconButton';
import { rankForRung } from './cardRank';

type TradingCardProps = {
  name: string; kind: 'Equipment' | 'Exercise'; state?: string;
  level?: number; series?: string; summary?: string; requirements?: string; footer?: string; locked?: boolean; factLabel?: 'Builds' | 'Adds';
  artwork?: string | null; fallbackArtwork?: string | null; onOpen?: () => void;
  buttonRef?: (node: HTMLButtonElement | null) => void;
  headerAction?: ReactNode; badge?: ReactNode; children?: ReactNode; footerContent?: ReactNode;
  hideChrome?: boolean;
  backFace?: ReactNode;
};

/** One portrait frame for collection cards and their detail heroes. */
export function TradingCard({ name, kind, state, level, series, summary, requirements, footer, locked = false, factLabel = 'Builds', artwork, fallbackArtwork, onOpen, buttonRef, headerAction, badge, children, footerContent, hideChrome = false, backFace }: TradingCardProps) {
  const [failed, setFailed] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const rank = rankForRung(level);
  useEffect(() => setFailed(0), [artwork, fallbackArtwork]);
  const image = failed === 0 ? (artwork || fallbackArtwork) : failed === 1 && artwork ? fallbackArtwork : null;
  return <article className={`trading-card${backFace && !locked ? ' trading-card-flippable' : ''}`} data-kind={kind} data-level={level}>
    <div className="trading-card-inner">
      <header className={`trading-card-nameplate${headerAction ? ' with-back' : ''}`}>{headerAction}<h3>{name}</h3>{badge ?? (rank ? <span className="trading-card-stage" data-rank={rank.name} role="img" aria-label={`${rank.name}, level ${rank.rung}`}><span>{rank.rung}</span></span> : kind === 'Equipment' ? <span className="trading-card-stage trading-card-gear" role="img" aria-label="Equipment"><SettingsIcon aria-hidden="true" /></span> : null)}{backFace && !locked && <IconButton className="trading-card-flip" aria-label={`${flipped ? 'Show front of' : 'Show muscles worked for'} ${name}`} aria-pressed={flipped} onClick={() => setFlipped((value) => !value)}><FlipIcon /></IconButton>}</header>
      {flipped && backFace ? <div className="trading-card-face-back">{backFace}</div> : <>
      <div className="trading-card-art" aria-hidden="true">
        {image ? <img src={image} alt="" onError={() => setFailed((n) => n + 1)} /> : <span className="trading-card-back">{series ?? kind}{locked && <small>Locked</small>}<span className="sr-only">Artwork unavailable</span></span>}
      </div>
      {!hideChrome && <div className="trading-card-rail"><span>{kind}</span><span>{series ?? 'Collection'}</span></div>}
      <div className="trading-card-copy">{summary && <p><strong>{kind === 'Exercise' ? `${factLabel}: ` : 'Enables: '}</strong>{summary}</p>}{requirements && <p><strong>{kind === 'Exercise' ? 'Needs: ' : 'Also needs: '}</strong>{requirements}</p>}{children}</div>
      {!hideChrome && <footer className="trading-card-footer"><span>{footer ?? 'Collection'}</span>{footerContent}{state && <span className="trading-card-state">{state}</span>}</footer>}
      </>}
    </div>
    {onOpen && !flipped && <button type="button" className="secondary trading-card-action" ref={buttonRef} aria-label={`${kind}: ${name}.${rank ? ` ${rank.name}, level ${rank.rung}.` : ''} ${state}. Open card`} onClick={onOpen}><span className="sr-only">View</span></button>}
  </article>;
}
