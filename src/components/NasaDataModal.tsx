/**
 * "NASA Data Used": every real number in the game, where it comes from,
 * and whether the storm feed is live or archived. Plus a kid-friendly word list.
 */

import React from 'react';
import {
  ARCHIVED_SOLAR_EVENTS,
  DONKI_INFO,
  RADIATION_FACTS,
  SpaceWeatherFeed,
  STORM_DOSE_MSV,
} from '../game/spaceWeather';

const WORDS: { word: string; meaning: string }[] = [
  { word: 'Solar flare', meaning: 'A sudden, super-bright flash on the Sun. Scientists rank them by size: C (small), M (medium), X (biggest).' },
  { word: 'Radiation storm', meaning: 'A cloud of very fast particles from the Sun. They can go through spacesuits and hurt cells in the body.' },
  { word: 'Radiation dose / mSv', meaning: 'How much radiation a body soaks up. Measured in millisieverts (mSv). On Earth, people get about 2 to 3 mSv in a year.' },
  { word: 'Regolith', meaning: 'Moon dirt: sharp grey dust and broken rock. Piling it on a building blocks radiation.' },
  { word: 'Shielding', meaning: 'Anything thick between you and radiation: dirt, water, or metal walls.' },
  { word: 'DONKI', meaning: 'NASA’s space weather database. Forecasters use it to track flares and solar storms.' },
];

export function NasaDataModal({
  isOpen,
  onClose,
  feed,
}: {
  isOpen: boolean;
  onClose: () => void;
  feed: SpaceWeatherFeed | null;
}) {
  if (!isOpen) return null;
  const live = feed?.status === 'live';
  const liveEvents = (feed?.events || []).filter((e) => e.live);

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4" data-testid="nasa-data-modal">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-cyan-400/50 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className=" text-xs uppercase tracking-[0.2em] text-cyan-300">Real science check</div>
            <h2 className="mt-1 text-2xl font-bold">NASA data used in MOONBOUND</h2>
          </div>
          <button onClick={onClose} className="rounded-lg border border-slate-600 px-3 py-1 text-sm" data-testid="nasa-data-close">
            Close
          </button>
        </div>

        <section className="mt-5 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">1. Solar storms: NASA DONKI</h3>
            <span
              className={`rounded-md border px-2 py-0.5 text-xs uppercase ${
                live ? 'border-emerald-400/60 text-emerald-300' : 'border-amber-400/60 text-amber-200'
              }`}
            >
              {feed ? (live ? 'Live feed connected' : 'Using archived real events') : 'Checking NASA…'}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Every storm in the game is a real solar flare. The game asks NASA’s DONKI database for flares from the last 30 days.
            If it can’t connect, it uses the real past flares below and labels them “archived”, never “live”.
          </p>
          {feed?.note ? <p className="mt-1 text-xs text-slate-400">{feed.note}</p> : null}
          <ul className="mt-3 space-y-1 text-xs">
            {liveEvents.map((e) => (
              <li key={e.id} className="text-emerald-200">
                LIVE · {e.flareClass} · {e.peakTimeUTC}
                {e.activeRegion ? ` · ${e.activeRegion}` : ''}
              </li>
            ))}
            {ARCHIVED_SOLAR_EVENTS.map((e) => (
              <li key={e.id}>
                <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="text-cyan-200 underline">
                  {e.flareClass} · {e.peakTimeUTC}
                  {e.activeRegion ? ` · ${e.activeRegion}` : ''}
                </a>
              </li>
            ))}
          </ul>
          <a href={DONKI_INFO.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-cyan-300 underline">
            {DONKI_INFO.label}
          </a>
        </section>

        <section className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-sm">
          <h3 className="font-semibold">2. Radiation numbers</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-slate-300">
            <li>
              <b>Everyday Moon radiation: {RADIATION_FACTS.lunarSurfaceDailyMSv} mSv per Earth day.</b> Your crew’s meter
              rises at this rate. {RADIATION_FACTS.lunarSurfaceSource.note}{' '}
              <a className="text-cyan-300 underline" href={RADIATION_FACTS.lunarSurfaceSource.url} target="_blank" rel="noreferrer">
                {RADIATION_FACTS.lunarSurfaceSource.label}
              </a>
            </li>
            <li>
              <b>NASA limits: {RADIATION_FACTS.careerLimitMSv} mSv per career, {RADIATION_FACTS.perEventLimitMSv} mSv per storm.</b>{' '}
              {RADIATION_FACTS.nasaLimitSource.note}{' '}
              <a className="text-cyan-300 underline" href={RADIATION_FACTS.nasaLimitSource.url} target="_blank" rel="noreferrer">
                {RADIATION_FACTS.nasaLimitSource.label}
              </a>
            </li>
            <li>
              <b>Real storm reading on Mars:</b> {RADIATION_FACTS.marsSource.note}{' '}
              <a className="text-cyan-300 underline" href={RADIATION_FACTS.marsSource.url} target="_blank" rel="noreferrer">
                {RADIATION_FACTS.marsSource.label}
              </a>
            </li>
          </ul>
        </section>

        <section className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 text-sm text-slate-300">
          <h3 className="font-semibold text-amber-200">3. What is simplified (game estimates)</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Storm doses with no shielding: small {STORM_DOSE_MSV.minor}, medium {STORM_DOSE_MSV.moderate}, strong{' '}
              {STORM_DOSE_MSV.strong} mSv. These are chosen to stay under NASA’s per-storm limit, not measured values.
            </li>
            <li>A Radiation Shelter blocks 90%, a habitat 65%, a Moon-dirt wall 50%. Real shielding depends on thickness and the storm.</li>
            <li>In real life, not every big flare causes a radiation storm. In the game, every flare does, so you can practice.</li>
            <li>Game time runs fast: one lunar day (29.5 Earth days) lasts about 16 minutes.</li>
          </ul>
        </section>

        <section className="mt-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-sm">
          <h3 className="font-semibold">Words to know</h3>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {WORDS.map((w) => (
              <div key={w.word} className="rounded-lg bg-slate-900 p-2">
                <dt className="font-semibold text-cyan-200">{w.word}</dt>
                <dd className="text-slate-300">{w.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
