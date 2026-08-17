'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';

import type { SkillEvaluation } from '@/lib/types/database';

export const SKILL_KEYS = ['footwork', 'stamina', 'smash_power', 'net_control'] as const;

export const SKILL_LABELS: Record<(typeof SKILL_KEYS)[number], string> = {
  footwork: 'Footwork',
  stamina: 'Stamina',
  smash_power: 'Smash',
  net_control: 'Net',
};

/**
 * Technical assessment radar.
 *
 * Sized in viewport-independent units with a fixed aspect so it stays readable
 * on a 360px-wide phone; four axes is the most a radar this small can carry
 * without the labels colliding.
 */
export function SkillRadar({ evaluation }: { evaluation: SkillEvaluation }) {
  const data = SKILL_KEYS.map((key) => ({
    skill: SKILL_LABELS[key],
    score: evaluation[key],
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
          />
          {/* Axis fixed to the 1-10 scale so two students' charts are comparable. */}
          <PolarRadiusAxis domain={[0, 10]} tickCount={6} tick={false} axisLine={false} />
          <Radar
            dataKey="score"
            stroke="#059669"
            strokeWidth={2}
            fill="#10b981"
            fillOpacity={0.28}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Numeric read-out beneath the radar — colour alone should not carry the score. */
export function SkillScores({ evaluation }: { evaluation: SkillEvaluation }) {
  return (
    <dl className="grid grid-cols-4 gap-2">
      {SKILL_KEYS.map((key) => (
        <div key={key} className="rounded-xl bg-slate-50 px-2 py-2 text-center">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {SKILL_LABELS[key]}
          </dt>
          <dd className="text-base font-bold tabular-nums text-slate-900">{evaluation[key]}</dd>
        </div>
      ))}
    </dl>
  );
}
