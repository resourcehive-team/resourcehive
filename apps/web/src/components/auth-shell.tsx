import { Brand } from "@/components/brand";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Brand href="/login" label="ResourceHive login" />
        <div className="mt-16 md:mt-24">{children}</div>
        <p className="mt-12 border-t border-line pt-4 text-xs leading-relaxed text-muted-foreground">
          Resource sharing for trusted university communities.
        </p>
      </section>

      <aside className="relative hidden h-svh overflow-hidden border-l border-line bg-ink p-10 text-paper lg:sticky lg:top-0 lg:flex lg:self-start lg:flex-col lg:justify-between xl:p-16">
        <div className="grid grid-cols-12 gap-4" aria-hidden="true">
          <span className="col-span-7 h-px bg-paper/30" />
          <span className="col-span-3 col-start-10 h-px bg-clay" />
        </div>
        <div className="max-w-2xl">
          <p className="eyebrow mb-6 text-ochre">Shared campus infrastructure</p>
          <p className="font-serif text-[clamp(4rem,7vw,7rem)] leading-[0.82] tracking-[-0.055em] text-balance">
            Everything useful,
            <br />
            within reach.
          </p>
          <p className="mt-8 max-w-md text-sm leading-7 text-paper/65">
            Discover, share, and book equipment, spaces, and knowledge across
            the organizations you already trust.
          </p>
        </div>
        <div className="grid grid-cols-3 border border-paper/25 text-xs">
          <div className="border-r border-paper/25 p-4">
            <span className="eyebrow text-paper/45">01</span>
            <p className="mt-8">Discover</p>
          </div>
          <div className="border-r border-paper/25 p-4">
            <span className="eyebrow text-paper/45">02</span>
            <p className="mt-8">Share</p>
          </div>
          <div className="bg-terracotta p-4 text-ink">
            <span className="eyebrow text-ink/55">03</span>
            <p className="mt-8">Build together</p>
          </div>
        </div>
      </aside>
    </main>
  );
}
