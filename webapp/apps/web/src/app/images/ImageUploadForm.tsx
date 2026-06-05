'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function ImageUploadForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch('/api/images', { method: 'POST', body: form });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? `Upload failed (${response.status})`);
      }

      event.currentTarget.reset();
      router.refresh();
      setMessage('Image uploaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'grid',
        gap: 12,
        marginTop: 24,
        border: '1px solid rgba(89, 55, 38, 0.18)',
        borderRadius: 24,
        background: 'rgba(255, 252, 244, 0.82)',
        padding: 20,
      }}
    >
      <strong style={{ color: '#241711' }}>Upload an image to this workspace</strong>
      <input accept="image/*" name="file" required type="file" />
      <input name="prompt" placeholder="Prompt / creative note" required style={inputStyle} />
      <input name="aspectRatio" placeholder="Aspect ratio, e.g. 1:1" required style={inputStyle} />
      <button disabled={pending} type="submit" style={buttonStyle}>
        {pending ? 'Uploading…' : 'Upload image'}
      </button>
      {message ? <p style={{ color: '#8c4d20', lineHeight: 1.5, margin: 0 }}>{message}</p> : null}
    </form>
  );
}

const inputStyle = {
  border: '1px solid rgba(89, 55, 38, 0.22)',
  borderRadius: 14,
  font: 'inherit',
  padding: '12px 14px',
};

const buttonStyle = {
  border: '0',
  borderRadius: 999,
  background: '#241711',
  color: '#fff8e8',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 800,
  padding: '13px 18px',
};
