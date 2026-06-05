import Link from 'next/link';

const nextSteps = [
  'Extract shared King types and prompt/spec data into a web-safe core module.',
  'Replace the placeholder image list with an authenticated API route.',
  'Add object storage so generated local-file assets become browser URLs.',
] as const;

export default function HomePage() {
  return (
    <main
      style={{
        display: 'grid',
        minHeight: '100vh',
        placeItems: 'center',
        padding: '48px 20px',
      }}
    >
      <section
        style={{
          width: 'min(920px, 100%)',
          border: '1px solid rgba(89, 55, 38, 0.2)',
          borderRadius: 32,
          background: 'rgba(255, 252, 244, 0.78)',
          boxShadow: '0 24px 80px rgba(79, 47, 28, 0.14)',
          padding: '40px',
        }}
      >
        <p style={{ margin: 0, color: '#9a5a25', fontWeight: 700, letterSpacing: '0.08em' }}>
          KING WEB MIGRATION
        </p>
        <h1 style={{ margin: '16px 0', fontSize: 'clamp(40px, 8vw, 84px)', lineHeight: 0.92 }}>
          Browser creative ops starts here.
        </h1>
        <p style={{ maxWidth: 680, color: '#5f4739', fontSize: 18, lineHeight: 1.7 }}>
          This scaffold proves the hosted web app shell without changing the Electron desktop
          runtime. The next milestone is wiring this UI to a web-safe King API contract.
        </p>
        <div style={{ marginTop: 28 }}>
          <Link
            href="/images"
            style={{
              display: 'inline-flex',
              border: '1px solid rgba(89, 55, 38, 0.22)',
              borderRadius: 999,
              background: '#241711',
              color: '#fff8e8',
              fontWeight: 800,
              padding: '12px 18px',
              textDecoration: 'none',
            }}
          >
            View image library slice
          </Link>
        </div>
        <ol style={{ display: 'grid', gap: 12, margin: '32px 0 0', paddingLeft: 24 }}>
          {nextSteps.map((step) => (
            <li key={step} style={{ color: '#3c2a20', fontSize: 16, lineHeight: 1.6 }}>
              {step}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
