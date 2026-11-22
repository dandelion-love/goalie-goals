import { useEffect, useState } from 'react';

type TradingCardProps = {
  name: string; kind: 'Equipment' | 'Exercise'; state: string;
  level?: number; summary?: string;
  artwork?: string | null; fallbackArtwork?: string | null; onOpen?: () => void;
  buttonRef?: (node: HTMLButtonElement | null) => void;
};

/** One portrait frame for collection cards and their detail heroes. */
export function TradingCard({ name, kind, state, level, summary, artwork, fallbackArtwork, onOpen, buttonRef }: TradingCardProps) {
  const [failed, setFailed] = useState(0);
  useEffect(() => setFailed(0), [artwork, fallbackArtwork]);
  const image = failed === 0 ? (artwork || fallbackArtwork) : failed === 1 && artwork ? fallbackArtwork : null;
  return <article className="trading-card">
    <div className="trading-card-inner">
      <header className="trading-card-nameplate"><p>{kind}{level ? ` · Level ${level}` : ''}</p><h3>{name}</h3></header>
      <div className="trading-card-art" aria-hidden="true">
        {image ? <img src={image} alt="" onError={() => setFailed((n) => n + 1)} /> : <span>Artwork unavailable</span>}
      </div>
      <div className="trading-card-copy"><p className="trading-card-state">{state}</p>{summary && <p>{summary}</p>}</div>
    </div>
    {onOpen && <button type="button" className="secondary trading-card-action" ref={buttonRef} aria-label={`${kind}: ${name}.${level ? ` Level ${level}.` : ''} ${state}. Open card`} onClick={onOpen}><span className="sr-only">View</span></button>}
  </article>;
}
