/**
 * Hand-authored mirror of supabase/migrations/0001_init.sql.
 *
 * Shaped as Row / Insert / Update per table so it can be handed straight to
 * `createClient<Database>()` and drive inference across every query in the app.
 * If you change the SQL, change this file in the same commit.
 *
 * Everything here is declared with `type`, never `interface`, and that is
 * load-bearing: postgrest-js constrains each Row to `Record<string, unknown>`,
 * and TypeScript only gives object *type aliases* an implicit index signature —
 * an `interface` fails the constraint, which silently collapses every query
 * result to `never` instead of raising an error at the definition site.
 */

export type UserRole = 'head_coach' | 'junior_coach' | 'student';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type AttendanceStatus = 'present' | 'absent' | 'excused';
export type PaymentStatus = 'paid' | 'pending' | 'overdue';
export type MatchResult = 'win' | 'loss';

/** Ordered low → high, matching the Postgres enum's declaration order. */
export type PlayerRank =
  | 'beginner_3'
  | 'beginner_2'
  | 'beginner_1'
  | 'intermediate_3'
  | 'intermediate_2'
  | 'intermediate_1'
  | 'advanced_3'
  | 'advanced_2'
  | 'advanced_1';

export type Location = {
  id: string;
  name: string;
  city_area: string;
  address: string | null;
  total_courts: number;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  approval_status: ApprovalStatus;
  rank: PlayerRank;
  location_id: string | null;
  created_at: string;
};

export type CoachLocation = {
  coach_id: string;
  location_id: string;
  created_at: string;
};

export type SessionAttendance = {
  id: string;
  student_id: string;
  coach_id: string | null;
  location_id: string | null;
  date: string;
  status: AttendanceStatus;
  created_at: string;
};

export type Payment = {
  id: string;
  student_id: string;
  amount: number;
  billing_cycle: string;
  status: PaymentStatus;
  due_date: string;
  created_at: string;
};

export type MatchLog = {
  id: string;
  student_id: string;
  recorded_by: string | null;
  tournament_name: string;
  opponent_name: string;
  score: string | null;
  result: MatchResult;
  unforced_errors: number;
  coach_notes: string | null;
  date: string;
  created_at: string;
};

export type SkillEvaluation = {
  id: string;
  student_id: string;
  footwork: number;
  stamina: number;
  smash_power: number;
  net_control: number;
  evaluated_at: string;
};

/**
 * One row of the `leaderboard` view.
 *
 * Intentionally narrower than Profile: the view exists so the ladder can be
 * public without exposing phone numbers or approval status. If you need a column
 * here, add it to the view in the migration first and consider who can now read it.
 */
export type LeaderboardEntry = {
  id: string;
  full_name: string;
  rank: PlayerRank;
  location_id: string | null;
  location_name: string | null;
  location_city_area: string | null;
};

/** Columns the database fills in, so callers may omit them on insert. */
type Generated = 'id' | 'created_at';

/**
 * Foreign keys, in the shape postgrest-js expects.
 *
 * These are not decoration: the select-query parser reads them to resolve
 * embedded selects like `.select('*, location:locations(name)')`. Omit them and
 * every embed collapses to `never`. `foreignKeyName` must match the real
 * constraint name, which Postgres derives as `<table>_<column>_fkey`.
 */
type FK<Table extends string, Column extends string, Ref extends string> = {
  foreignKeyName: `${Table}_${Column}_fkey`;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ['id'];
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: '12' };
  public: {
    Tables: {
      locations: {
        Row: Location;
        Insert: Omit<Location, Generated | 'address' | 'total_courts' | 'city_area'> &
          Partial<Pick<Location, Generated | 'address' | 'total_courts' | 'city_area'>>;
        Update: Partial<Location>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, 'id'> & Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [FK<'profiles', 'location_id', 'locations'>];
      };
      coach_locations: {
        Row: CoachLocation;
        Insert: Omit<CoachLocation, 'created_at'> & Partial<Pick<CoachLocation, 'created_at'>>;
        Update: Partial<CoachLocation>;
        Relationships: [
          FK<'coach_locations', 'coach_id', 'profiles'>,
          FK<'coach_locations', 'location_id', 'locations'>,
        ];
      };
      sessions_attendance: {
        Row: SessionAttendance;
        Insert: Omit<SessionAttendance, Generated> & Partial<Pick<SessionAttendance, Generated>>;
        Update: Partial<SessionAttendance>;
        Relationships: [
          FK<'sessions_attendance', 'student_id', 'profiles'>,
          FK<'sessions_attendance', 'coach_id', 'profiles'>,
          FK<'sessions_attendance', 'location_id', 'locations'>,
        ];
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, Generated> & Partial<Pick<Payment, Generated>>;
        Update: Partial<Payment>;
        Relationships: [FK<'payments', 'student_id', 'profiles'>];
      };
      match_logs: {
        Row: MatchLog;
        Insert: Omit<MatchLog, Generated> & Partial<Pick<MatchLog, Generated>>;
        Update: Partial<MatchLog>;
        Relationships: [
          FK<'match_logs', 'student_id', 'profiles'>,
          FK<'match_logs', 'recorded_by', 'profiles'>,
        ];
      };
      skill_evaluations: {
        Row: SkillEvaluation;
        Insert: Omit<SkillEvaluation, 'id' | 'evaluated_at'> &
          Partial<Pick<SkillEvaluation, 'id' | 'evaluated_at'>>;
        Update: Partial<SkillEvaluation>;
        Relationships: [FK<'skill_evaluations', 'student_id', 'profiles'>];
      };
    };
    Views: {
      leaderboard: {
        Row: LeaderboardEntry;
        Relationships: [];
      };
    };
    Functions: {
      is_approved: { Args: Record<string, never>; Returns: boolean };
      is_head_coach: { Args: Record<string, never>; Returns: boolean };
      is_coach: { Args: Record<string, never>; Returns: boolean };
      coach_covers_location: { Args: { loc: string }; Returns: boolean };
      can_manage_student: { Args: { student: string }; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      approval_status: ApprovalStatus;
      player_rank: PlayerRank;
      attendance_status: AttendanceStatus;
      payment_status: PaymentStatus;
      match_result: MatchResult;
    };
    CompositeTypes: Record<string, never>;
  };
};

/** A profile joined with its location, as the roster and profile pages read it. */
export type ProfileWithLocation = Profile & {
  location: Pick<Location, 'id' | 'name' | 'city_area'> | null;
};
