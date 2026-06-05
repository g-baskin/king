import Link from 'next/link';

export default function LoginPage() {
  return (
    <main style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', padding: 24 }}>
      <section
        style={{
          width: 'min(720px, 100%)',
          border: '1px solid rgba(89, 55, 38, 0.2)',
          borderRadius: 28,
          background: 'rgba(255, 252, 244, 0.82)',
          boxShadow: '0 24px 80px rgba(79, 47, 28, 0.14)',
          padding: 36,
        }}
      >
        <Link href="/images" style={{ color: '#8c4d20', fontWeight: 700, textDecoration: 'none' }}>
          ← Images
        </Link>
        <p style={{ margin: '28px 0 0', color: '#9a5a25', fontWeight: 700, letterSpacing: '0.08em' }}>
          AUTH SCAFFOLD
        </p>
        <h1 style={{ margin: '12px 0', fontSize: 'clamp(36px, 7vw, 72px)', lineHeight: 0.95 }}>
          Supabase login comes next.
        </h1>
        <p style={{ color: '#5f4739', fontSize: 18, lineHeight: 1.7 }}>
          Supabase is now the accepted provider path, and server routes can require a workspace
          context. The next implementation slice should add the actual sign-in form and callback flow.
        </p>
        <ol style={{ color: '#3c2a20', lineHeight: 1.7, paddingLeft: 22 }}>
          <li>Enable a Supabase Auth provider in the Supabase dashboard.</li>
          <li>Create a sign-in form or OAuth button using the browser Supabase client.</li>
          <li>Create a workspace and `workspace_members` row for the signed-in user.</li>
        </ol>
      </section>
    </main>
  );
}
