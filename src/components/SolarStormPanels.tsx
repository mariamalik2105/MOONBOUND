/**
 * MOONBOUND Solar Storm UI
 * - StormAlertModal: a real NASA flare arrives; the player picks a plan (every plan costs something)
 * - StormStatusBanner: countdown while the storm is coming / happening
 * - StormDebriefModal: what happened, and what real astronauts do
 * - RadiationMeter: crew dose vs NASA's 600 mSv career limit
 * - MissionOverModal: the crew reached the limit and must go home
 */

import React from 'react';
import {
  StormState,
  StormOption,
  StormChoice,
  RADIATION_FACTS,
  SIM_SECONDS_PER_REAL_SECOND,
  STORM_WARNING_SECONDS,
  STORM_ACTIVE_SECONDS,
  STORM_DOSE_MSV,
  severityLabel,
  round1,
} from '../game/spaceWeather';

const realSeconds = (simSeconds: number) => Math.max(0, Math.ceil(simSeconds / SIM_SECONDS_PER_REAL_SECOND));

function DataBadge({ live, fetchedAt }: { live: boolean; fetchedAt?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs uppercase ${
        live ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/60 bg-amber-500/10 text-amber-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-400' : 'bg-amber-300'}`} />
      {live
        ? `Live NASA DONKI data${fetchedAt ? ` · loaded ${new Date(fetchedAt).toLocaleDateString()}` : ''}`
        : 'Real past event · NASA archive'}
    </span>
  );
}

// ---------------------------------------------------------------------------

export function StormAlertModal({
  storm,
  options,
  onChoose,
  onOpenSources,
}: {
  storm: StormState;
  options: StormOption[];
  onChoose: (choice: Exclude<StormChoice, 'none'>) => void;
  onOpenSources: () => void;
}) {
  const e = storm.event;
  const pct = Math.max(0, Math.min(100, (storm.timeLeft / STORM_WARNING_SECONDS) * 100));
  const tone = e.severity === 'strong' ? 'text-rose-300' : e.severity === 'moderate' ? 'text-orange-300' : 'text-amber-200';

  return (
    <div className="mb-backdrop fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/70 p-4" data-testid="storm-alert">
      <div className="mb-card max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-rose-400/60 bg-slate-900/95 p-5 text-slate-100 shadow-2xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className=" text-xs uppercase tracking-[0.2em] text-rose-300">☀️ Solar storm warning</div>
            <h2 className="mt-1 text-2xl font-bold">
              A <span className={tone}>{severityLabel(e.severity)}</span> storm is heading for your base!
            </h2>
          </div>
          <DataBadge live={e.live} fetchedAt={e.fetchedAt} />
        </div>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm leading-relaxed">
          <p>
            This is a <b>real</b> event. On <b>{e.peakTimeUTC}</b>, the Sun fired a class <b>{e.flareClass}</b> solar flare
            {e.activeRegion ? <> from sunspot group {e.activeRegion}</> : null}.
          </p>
          <p className="mt-1.5 text-slate-300">
            A big flare can launch a <b>radiation storm</b>: super-fast particles that go through spacesuits. The Moon has
            no air or magnetic field to stop them. <i>Radiation dose</i> is measured in <b>mSv</b> (millisieverts).
          </p>
          <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs text-cyan-300 underline">
            Source: {e.sourceLabel}
          </a>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Particles arrive in</span>
            <span className="text-rose-200">{realSeconds(storm.timeLeft)} s</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-rose-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-400">No plan in time means the crew takes the full dose.</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {options.map((o) => (
            <button
              key={o.id}
              data-testid={`storm-choice-${o.id}`}
              disabled={!o.available}
              onClick={() => onChoose(o.id)}
              className={`flex flex-col rounded-xl border p-3 text-left transition ${
                o.available
                  ? 'border-slate-600 bg-slate-800/70 hover:border-cyan-300 hover:bg-slate-800'
                  : 'cursor-not-allowed border-slate-800 bg-slate-900 opacity-50'
              }`}
            >
              <span className="text-base font-semibold">{o.title}</span>
              <span className="mt-2 text-xs text-emerald-300">
                <b>You get:</b> {o.gets}
              </span>
              <span className="mt-1 text-xs text-orange-300">
                <b>It costs:</b> {o.costs}
              </span>
              <span className="mt-auto pt-3 text-sm">
                Crew dose ≈ <b className="text-rose-200">{o.estimatedDose} mSv</b>
              </span>
              {!o.available && o.unavailableReason ? (
                <span className="mt-1 text-xs text-slate-400">{o.unavailableReason}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Doses are game estimates. NASA keeps a crew under {RADIATION_FACTS.perEventLimitMSv} mSv per storm and{' '}
            {RADIATION_FACTS.careerLimitMSv} mSv for a whole career.
          </span>
          <button onClick={onOpenSources} className=" text-cyan-300 underline">
            How we use NASA data
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function StormStatusBanner({ storm }: { storm: StormState }) {
  if (storm.phase === 'debrief') return null;
  const active = storm.phase === 'active';
  const label = active
    ? storm.choice === 'shelter'
      ? 'Crew is in the shelter. Wait for the storm to pass.'
      : storm.choice === 'regolith_wall'
      ? 'Storm hitting! Dirt wall is blocking half the particles.'
      : 'Storm hitting! Crew is outside without extra shielding.'
    : storm.choice
    ? 'Plan locked in. Storm arriving soon.'
    : 'Storm incoming! Choose a plan.';
  const total = active ? STORM_ACTIVE_SECONDS : STORM_WARNING_SECONDS;
  return (
    <div
      data-testid="storm-banner"
      className="pointer-events-none absolute left-1/2 top-20 z-40 w-[min(92vw,460px)] -translate-x-1/2 rounded-xl border border-rose-400/60 bg-rose-950/80 px-4 py-2 text-rose-100 shadow-xl"
    >
      <div className="flex items-center justify-between text-xs">
        <span>☀️ {storm.event.flareClass} storm · {active ? 'ACTIVE' : 'INCOMING'}</span>
        <span>{realSeconds(storm.timeLeft)} s</span>
      </div>
      <div className="mt-0.5 text-sm">{label}</div>
      <div className="mt-1 h-1 overflow-hidden rounded bg-rose-900">
        <div className="h-full bg-rose-300" style={{ width: `${(storm.timeLeft / total) * 100}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const CHOICE_TEXT: Record<StormChoice, string> = {
  shelter: 'You sent the crew into the shelter.',
  regolith_wall: 'You piled Moon dirt on the habitat and kept working.',
  keep_working: 'You kept working outside.',
  none: 'No plan was made in time.',
};

export function StormDebriefModal({
  storm,
  crewDose,
  onClose,
  onOpenSources,
}: {
  storm: StormState;
  crewDose: number;
  onClose: () => void;
  onOpenSources: () => void;
}) {
  const full = STORM_DOSE_MSV[storm.event.severity];
  const saved = round1(Math.max(0, full - storm.doseTaken));
  const pctOfCareer = Math.round((crewDose / RADIATION_FACTS.careerLimitMSv) * 100);

  return (
    <div className="mb-backdrop fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/70 p-4" data-testid="storm-debrief">
      <div className="mb-card max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-cyan-400/50 bg-slate-900/95 p-6 text-slate-100 shadow-2xl">
        <div className=" text-xs uppercase tracking-[0.2em] text-cyan-300">Storm report · {storm.event.flareClass}</div>
        <h2 className="mt-1 text-2xl font-bold">The storm has passed.</h2>
        <p className="mt-2 text-slate-300">{CHOICE_TEXT[storm.choice || 'none']}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:gap-3">
          <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
            <div className=" text-xs uppercase text-slate-400">Storm dose</div>
            <div className="text-xl font-bold text-rose-200">{storm.doseTaken} mSv</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
            <div className=" text-xs uppercase text-slate-400">Blocked</div>
            <div className="text-xl font-bold text-emerald-300">{saved} mSv</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
            <div className=" text-xs uppercase text-slate-400">Career used</div>
            <div className="text-xl font-bold">{pctOfCareer}%</div>
          </div>
        </div>
        {storm.foodLost > 0 ? (
          <p className="mt-2 text-sm text-orange-300">The greenhouse was off while you sheltered: about {storm.foodLost} kg of food did not grow.</p>
        ) : null}

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm leading-relaxed">
          <div className=" text-xs uppercase text-amber-200">What real astronauts do</div>
          <p className="mt-1">
            NASA’s rule: one solar storm must give a crew less than <b>{RADIATION_FACTS.perEventLimitMSv} mSv</b>, and a whole
            career less than <b>{RADIATION_FACTS.careerLimitMSv} mSv</b>. For big storms NASA plans a <b>storm shelter</b>: a
            small room with about 10 cm of extra water-like shielding.
          </p>
          <p className="mt-2">
            Real reading: on May 20, 2024, NASA’s Curiosity rover measured a solar storm on Mars. An astronaut standing next
            to it would have received <b>{RADIATION_FACTS.marsMay2024MicroGy.toLocaleString()} micrograys</b>, about{' '}
            <b>{RADIATION_FACTS.marsMay2024ChestXrays} chest X-rays</b> at once.
          </p>
          <p className="mt-2 text-slate-400">
            Not every flare sends a radiation storm. Mission control watches NASA’s DONKI alerts so crews can get to shelter in time.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button onClick={onOpenSources} className=" text-xs text-cyan-300 underline">
            Sources & NASA data
          </button>
          <button
            data-testid="storm-debrief-close"
            onClick={onClose}
            className="rounded-xl bg-cyan-500 px-5 py-2.5 font-semibold text-white"
          >
            Back to work
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function RadiationMeter({ dose, onOpenSources }: { dose: number; onOpenSources: () => void }) {
  const limit = RADIATION_FACTS.careerLimitMSv;
  const pct = Math.min(100, (dose / limit) * 100);
  const color = pct >= 75 ? 'bg-rose-400' : pct >= 40 ? 'bg-amber-300' : 'bg-emerald-400';
  return (
    <div
      data-testid="radiation-meter"
      className="absolute left-4 top-[42%] z-20 w-44 rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-slate-100 shadow-lg"
    >
      <div className=" text-xs uppercase text-slate-400">Crew radiation</div>
      <div className="mt-0.5 text-lg font-bold">
        {round1(dose)} <span className="text-xs font-normal text-slate-400">/ {limit} mSv</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs leading-snug text-slate-400">NASA’s lifetime limit for an astronaut is {limit} mSv.</p>
      <button onClick={onOpenSources} className="mt-1 text-xs text-cyan-300 underline">
        NASA data used
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function MissionOverModal({
  dose,
  stormsSurvived,
  daysSurvived,
  onNewMission,
  onExit,
}: {
  dose: number;
  stormsSurvived: number;
  daysSurvived: number;
  onNewMission: () => void;
  onExit: () => void;
}) {
  return (
    <div className="mb-backdrop absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4" data-testid="mission-over">
      <div className="mb-card w-full max-w-lg rounded-2xl border border-amber-400/60 bg-slate-900 p-6 text-center text-slate-100 shadow-2xl">
        <div className=" text-xs uppercase tracking-[0.2em] text-amber-200">Mission control</div>
        <h2 className="mt-2 text-2xl font-bold">Time to bring the crew home</h2>
        <p className="mt-3 text-slate-300">
          Your crew has reached <b>{round1(dose)} mSv</b>, NASA’s lifetime radiation limit for an astronaut. Real crews fly home
          before this happens, so your mission ends here.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          You survived {stormsSurvived} solar storm{stormsSurvived === 1 ? '' : 's'} over {daysSurvived} lunar day
          {daysSurvived === 1 ? '' : 's'}. Try again: a Radiation Shelter or a Moon-dirt wall keeps the crew safe for longer.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button onClick={onExit} className="rounded-xl border border-slate-600 px-4 py-2">
            Title screen
          </button>
          <button onClick={onNewMission} className="rounded-xl bg-cyan-500 px-5 py-2 font-semibold text-white">
            New mission
          </button>
        </div>
      </div>
    </div>
  );
}
