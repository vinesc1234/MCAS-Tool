import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTracker } from '../hooks/useTrackerData';
import {
  ingredientStats,
  itemStats,
  onsetDistribution,
  reactionsOverTime,
  symptomStats,
} from '../lib/analysis';

const COLORS = {
  reacted: '#dc2626',
  safe: '#16a34a',
  unsure: '#d97706',
  brand: '#7c5cbf',
  grid: '#ede6fa',
  axis: '#9ca3af',
};

export default function Trends() {
  const { entries, symptoms } = useTracker();
  const [minAppearances, setMinAppearances] = useState(2);

  const symptomTop = useMemo(() => symptomStats(entries, symptoms).slice(0, 8), [entries, symptoms]);
  const ingredients = useMemo(
    () => ingredientStats(entries, minAppearances),
    [entries, minAppearances],
  );
  const items = useMemo(() => itemStats(entries), [entries]);
  const timeline = useMemo(() => reactionsOverTime(entries, 30), [entries]);
  const onsets = useMemo(() => onsetDistribution(entries), [entries]);

  const triggers = items.filter((i) => i.reacted > 0).sort((a, b) => b.reacted - a.reacted);
  const safeItems = items.filter((i) => i.reacted === 0 && i.safe > 0).sort((a, b) => b.safe - a.safe);
  const reactedCount = entries.filter((e) => e.reaction === 'reacted').length;
  const hasOnsetData = onsets.some((o) => o.count > 0);

  if (entries.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-brand-900">Patterns</h1>
        <div className="card text-center text-gray-600">
          <p>Nothing to analyze yet.</p>
          <p className="mt-1 text-sm text-gray-500">
            Log a handful of entries — including things that were fine — and patterns will show up
            here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-2xl font-bold text-brand-900">Patterns</h1>
        <p className="text-sm text-gray-500">
          {entries.length} entries · {reactedCount} reactions
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Reacted" value={reactedCount} color="text-react-fg" bg="bg-react-bg" />
        <StatTile
          label="Safe"
          value={entries.filter((e) => e.reaction === 'none').length}
          color="text-safe-fg"
          bg="bg-safe-bg"
        />
        <StatTile
          label="Unsure"
          value={entries.filter((e) => e.reaction === 'unsure').length}
          color="text-unsure-fg"
          bg="bg-unsure-bg"
        />
      </div>

      {/* Ingredient correlation — the payoff for tagging ingredients. */}
      <section className="card">
        <h2 className="field-label">Ingredients most linked to reactions</h2>
        <p className="mb-3 text-sm text-gray-500">
          Of the times each ingredient showed up, how often did you react?
        </p>

        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">Show ingredients seen at least</span>
          {[2, 3, 5].map((n) => (
            <button
              key={n}
              onClick={() => setMinAppearances(n)}
              className={`chip px-2.5 py-1 text-xs ${
                minAppearances === n
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-700 ring-1 ring-brand-200'
              }`}
            >
              {n}×
            </button>
          ))}
        </div>

        {ingredients.length === 0 ? (
          <p className="text-sm text-gray-500">
            No ingredient appears in {minAppearances}+ entries yet. Tag ingredients as you log and
            this fills in.
          </p>
        ) : (
          <ul className="space-y-3">
            {ingredients.slice(0, 10).map((stat) => (
              <li key={stat.ingredient}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-gray-800">
                    {stat.ingredient}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-gray-600">
                    {Math.round(stat.rate * 100)}% · {stat.reacted}/{stat.reacted + stat.safe}
                  </span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-brand-100">
                  <div
                    className="bg-react-fg"
                    style={{ width: `${stat.rate * 100}%` }}
                    title={`${stat.reacted} reacted`}
                  />
                  <div
                    className="bg-safe-fg"
                    style={{ width: `${(1 - stat.rate) * 100}%` }}
                    title={`${stat.safe} fine`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-gray-400">
          Correlation, not proof — small counts swing a lot. Worth raising with your doctor, not
          acting on alone.
        </p>
      </section>

      {symptomTop.length > 0 && (
        <section className="card">
          <h2 className="field-label">Most common symptoms</h2>
          <div className="-ml-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symptomTop} layout="vertical" margin={{ left: 4, right: 12 }}>
                <CartesianGrid horizontal={false} stroke={COLORS.grid} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: COLORS.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tick={{ fontSize: 11, fill: '#374151' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: COLORS.grid }}
                  formatter={(v) => [`${v} times`, 'Logged']}
                />
                <Bar dataKey="count" fill={COLORS.brand} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {hasOnsetData && (
        <section className="card">
          <h2 className="field-label">How fast reactions start</h2>
          <div className="-ml-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={onsets} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke={COLORS.grid} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: COLORS.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: COLORS.axis }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: COLORS.grid }}
                  formatter={(v) => [`${v} reactions`, '']}
                />
                <Bar dataKey="count" fill={COLORS.brand} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="field-label">Last 30 days</h2>
        <div className="-ml-2 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeline} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke={COLORS.grid} />
              <XAxis
                dataKey="label"
                interval={4}
                tick={{ fontSize: 10, fill: COLORS.axis }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: COLORS.axis }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip cursor={{ fill: COLORS.grid }} />
              <Bar dataKey="safe" stackId="a" fill={COLORS.safe} name="No reaction" />
              <Bar dataKey="unsure" stackId="a" fill={COLORS.unsure} name="Unsure" />
              <Bar
                dataKey="reacted"
                stackId="a"
                fill={COLORS.reacted}
                name="Reacted"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Legend />
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card">
          <h2 className="field-label">Triggers</h2>
          {triggers.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing has triggered you yet.</p>
          ) : (
            <ul className="space-y-2">
              {triggers.slice(0, 12).map((i) => (
                <li key={i.name} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-gray-800">{i.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-react-fg">
                    {i.reacted}/{i.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="field-label">Safe so far</h2>
          {safeItems.length === 0 ? (
            <p className="text-sm text-gray-500">
              Log things that were fine too — that's how this list builds.
            </p>
          ) : (
            <ul className="space-y-2">
              {safeItems.slice(0, 12).map((i) => (
                <li key={i.name} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-gray-800">{i.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-safe-fg">×{i.safe}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-2xl px-3 py-4 text-center ${bg}`}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs font-medium text-gray-600">{label}</div>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex justify-center gap-4 text-xs text-gray-600">
      {[
        ['No reaction', COLORS.safe],
        ['Unsure', COLORS.unsure],
        ['Reacted', COLORS.reacted],
      ].map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}
