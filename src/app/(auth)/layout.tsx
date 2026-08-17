export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="pt-safe mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-court-600 text-2xl shadow-lg shadow-court-600/25">
            <span aria-hidden="true">🏸</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Smash Academy</h1>
            <p className="mt-1 text-xs text-slate-500">
              Attendance, ranks and match logs for the whole squad.
            </p>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
