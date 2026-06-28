export default function ImageEmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative flex max-w-lg flex-col items-center justify-center gap-4 rounded-[2rem] border border-white/[0.08] bg-[rgba(255,255,255,0.025)] px-10 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[var(--base-color-brand--cinamon)]/70 to-transparent" />
        <h2
          className="gradient-shift text-center text-4xl font-black tracking-tight"
          style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
        >
          Studio is empty
        </h2>
        <p className="max-w-sm text-center text-sm leading-6 text-[var(--base-color-brand--umber)]">
          Describe a product shot, campaign visual, or character scene below and generate your first
          frame.
        </p>
      </div>
    </div>
  );
}
