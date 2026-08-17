'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export interface AuthState {
  error?: string;
  notice?: string;
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '')
      .trim()
      .toLowerCase(),
    password: String(formData.get('password') ?? ''),
  };
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase deliberately returns the same message for "no such user" and
    // "wrong password"; keep it that way rather than confirming which emails exist.
    return {
      error:
        error.message === 'Email not confirmed'
          ? 'Confirm your email address first — check your inbox for the link.'
          : 'Those credentials did not match. Try again.',
    };
  }

  // Middleware decides whether this lands on /dashboard or /pending.
  redirect('/dashboard');
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const fullName = String(formData.get('full_name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();

  if (!fullName) return { error: 'Enter your full name.' };
  if (!email || !password) return { error: 'Enter your email and password.' };
  if (password.length < 8) return { error: 'Use a password of at least 8 characters.' };

  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    return { error: 'Enter a valid phone number — coaches use it for fee reminders.' };
  }

  const supabase = await createClient();

  /*
   * full_name and phone ride along in user metadata for the handle_new_user()
   * trigger to copy into profiles.
   *
   * There is deliberately no `role` here: metadata is client-controlled, so the
   * trigger hard-codes role='student' / approval_status='pending' and ignores
   * anything a caller puts in this payload. Sending a role would be theatre.
   */
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  });

  if (error) {
    return { error: error.message };
  }

  // With email confirmation enabled, signUp returns a user but no session.
  if (!data.session) {
    return {
      notice: `Account created. Confirm your email at ${email}, then sign in — a coach will review your registration.`,
    };
  }

  redirect('/pending');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect('/login');
}
