'use client';

import { Check, Minus, X } from 'lucide-react';
import { useState } from 'react';

import { markAttendanceAction } from '@/app/(app)/attendance/actions';
import { Card, CardContent } from '@/components/ui/card';
import { FormMessage } from '@/components/ui/input';
import { Segmented, type SegmentedOption } from '@/components/ui/segmented';
import { Avatar, Spinner } from '@/components/ui/misc';
import type { AttendanceStatus, ProfileWithLocation } from '@/lib/types/database';

const OPTIONS: SegmentedOption<AttendanceStatus>[] = [
  {
    value: 'present',
    label: 'Present',
    icon: <Check className="size-3.5" />,
    activeClassName: 'bg-emerald-500 text-white',
  },
  {
    value: 'absent',
    label: 'Absent',
    icon: <X className="size-3.5" />,
    activeClassName: 'bg-rose-500 text-white',
  },
  {
    value: 'excused',
    label: 'Excused',
    icon: <Minus className="size-3.5" />,
    activeClassName: 'bg-sky-500 text-white',
  },
];

/**
 * The roll-call list.
 *
 * Each tap writes immediately and the UI updates before the round-trip finishes
 * — a coach marking twenty students should never wait on a spinner between
 * taps. If the write fails the row snaps back to its previous value and says so,
 * rather than leaving a mark on screen that was never saved.
 */
export function RollCall({
  students,
  locationId,
  date,
  initialStatuses,
}: {
  students: ProfileWithLocation[];
  locationId: string;
  date: string;
  initialStatuses: Record<string, AttendanceStatus>;
}) {
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(initialStatuses);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const mark = async (studentId: string, status: AttendanceStatus) => {
    const previous = statuses[studentId];

    setStatuses((current) => ({ ...current, [studentId]: status }));
    setSaving((current) => ({ ...current, [studentId]: true }));
    setError(null);

    const formData = new FormData();
    formData.set('student_id', studentId);
    formData.set('location_id', locationId);
    formData.set('date', date);
    formData.set('status', status);

    const result = await markAttendanceAction(formData);

    setSaving((current) => ({ ...current, [studentId]: false }));

    if (result && 'ok' in result && !result.ok) {
      setError(result.error);
      setStatuses((current) => {
        const reverted = { ...current };
        if (previous) reverted[studentId] = previous;
        else delete reverted[studentId];
        return reverted;
      });
    }
  };

  const marked = students.filter((student) => statuses[student.id]).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {marked} of {students.length} marked
        </p>
        {marked === students.length ? (
          <span className="text-[11px] font-semibold text-court-700">Session complete</span>
        ) : null}
      </div>

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      {students.map((student) => (
        <Card key={student.id}>
          <CardContent className="flex flex-col gap-3 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={student.full_name} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {student.full_name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {statuses[student.id] ? 'Marked' : 'Not marked yet'}
                </p>
              </div>
              {saving[student.id] ? <Spinner className="text-slate-400" /> : null}
            </div>

            <Segmented
              name={`Attendance for ${student.full_name}`}
              options={OPTIONS}
              value={statuses[student.id] ?? null}
              onChange={(status) => mark(student.id, status)}
              disabled={saving[student.id]}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
