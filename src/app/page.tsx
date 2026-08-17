import { redirect } from 'next/navigation';

/**
 * Middleware resolves where a visitor actually belongs (login / pending /
 * dashboard); this route just hands off so `/` is never a dead end.
 */
export default function RootPage() {
  redirect('/dashboard');
}
