import Link from 'next/link';
import { listPlaceholderImages } from '@/lib/server/placeholderImages';

export default function ImagesPage() {
  const images = listPlaceholderImages({ limit: 24 }).data;

  return (
    <main style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <section style={{ margin: '0 auto', maxWidth: 1180 }}>
        <Link href="/" style={{ color: '#8c4d20', fontWeight: 700, textDecoration: 'none' }}>
          ← King Web
        </Link>
        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <p style={{ margin: 0, color: '#9a5a25', fontWeight: 700, letterSpacing: '0.08em' }}>
              IMAGE LIBRARY SLICE
            </p>
            <h1 style={{ margin: '12px 0', fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 0.95 }}>
              Web image gallery contract.
            </h1>
            <p style={{ maxWidth: 680, color: '#5f4739', fontSize: 18, lineHeight: 1.7 }}>
              Placeholder data proves the browser route, shared image types, and API response shape before
              database and object storage are introduced.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
            marginTop: 32,
          }}
        >
          {images.map((image) => (
            <article
              key={image.id}
              style={{
                overflow: 'hidden',
                border: '1px solid rgba(89, 55, 38, 0.18)',
                borderRadius: 24,
                background: 'rgba(255, 252, 244, 0.82)',
                boxShadow: '0 18px 48px rgba(79, 47, 28, 0.12)',
              }}
            >
              <img
                src={image.thumbnailUrl ?? image.url}
                alt={image.prompt}
                style={{ aspectRatio: '1 / 1', display: 'block', width: '100%', objectFit: 'cover' }}
              />
              <div style={{ padding: 18 }}>
                <p style={{ margin: 0, color: '#9a5a25', fontSize: 13, fontWeight: 800 }}>
                  {image.aspectRatio} · {image.filename}
                </p>
                <p style={{ margin: '10px 0 0', color: '#3c2a20', lineHeight: 1.5 }}>{image.prompt}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
