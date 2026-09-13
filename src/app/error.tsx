"use client";

export default function ErrorPage({ error }: { error: Error }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-slate-200">
      <p className="text-xs uppercase tracking-[0.18em] text-rose-300">Canvas failed to load</p>
      <h1 className="mt-2 font-display text-3xl">Database is not ready</h1>
      <p className="mt-3 text-sm text-slate-400">{error.message}</p>
      <pre className="mt-6 overflow-auto rounded-xl border border-canvas-line bg-canvas-panel p-4 text-xs text-slate-300">
        {`npm install
cp .env.example .env
npx prisma generate
npm run setup
npm run dev`}
      </pre>
    </main>
  );
}
