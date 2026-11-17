export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
        Music Player
      </h1>
      <p className="max-w-md text-balance text-neutral-400">
        Ad-free streaming, your library, your way. Scaffolded — playback core
        lands in Phase 1.
      </p>
      <div className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-1.5 text-sm text-neutral-400">
        Phase 0 · scaffold
      </div>
    </main>
  );
}
