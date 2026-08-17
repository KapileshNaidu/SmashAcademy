import { requireApproved } from '@/lib/auth';

import { CoachDashboard } from './coach-dashboard';
import { StudentDashboard } from './student-dashboard';

/** One route, two dashboards — coaches manage a squad, students track themselves. */
export default async function DashboardPage() {
  const session = await requireApproved();

  return session.isCoach ? (
    <CoachDashboard session={session} />
  ) : (
    <StudentDashboard session={session} />
  );
}
