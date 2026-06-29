/**
 * Cinema camera / lens / focal / aperture prompt modifiers (research-hub / Open Generative AI parity).
 * Appends descriptive optics language to the user's prompt for image generation.
 */

export const CAMERA_MAP: Record<string, string> = {
  'Modular 8K Digital': 'modular 8K digital cinema camera',
  'Full-Frame Cine Digital': 'full-frame digital cinema camera',
  'Grand Format 70mm Film': 'grand format 70mm film camera',
  'Studio Digital S35': 'Super 35 studio digital camera',
  'Classic 16mm Film': 'classic 16mm film camera',
  'Premium Large Format Digital': 'premium large-format digital cinema camera',
};

export const LENS_MAP: Record<string, string> = {
  'Creative Tilt Lens': 'creative tilt lens, selective focus plane, miniature-like edge blur',
  'Compact Anamorphic':
    'compact anamorphic lens, wider cinematic squeeze, oval bokeh, horizontal flares',
  'Extreme Macro': 'extreme macro lens, close-focus magnification, very shallow focus falloff',
  '70s Cinema Prime': '1970s cinema prime lens, warm lower-contrast glass, vintage flare response',
  'Classic Anamorphic':
    'classic anamorphic lens, widescreen compression, oval bokeh, blue streak flares',
  'Premium Modern Prime':
    'premium modern prime lens, clean contrast, controlled focus, polished rendering',
  'Warm Cinema Prime':
    'warm-toned cinema prime lens, flattering skin tones, gentle highlight bloom',
  'Swirl Bokeh Portrait':
    'swirl bokeh portrait lens, curved field edges, circular background motion',
  'Vintage Prime':
    'vintage prime lens, soft contrast, imperfect glass texture, organic focus rolloff',
  'Halation Diffusion': 'halation diffusion filter, glowing highlights, softened microcontrast',
  'Clinical Sharp Prime':
    'ultra-sharp clinical prime lens, crisp microcontrast, precise edges, minimal aberration',
};

/** Focal length (mm) → perspective phrase */
export const FOCAL_PERSPECTIVE: Record<number, string> = {
  8: 'ultra-wide perspective',
  14: 'wide-angle perspective',
  24: 'wide-angle dynamic perspective',
  35: 'natural cinematic perspective',
  50: 'standard portrait perspective',
  85: 'classic portrait perspective',
};

export const APERTURE_EFFECT: Record<string, string> = {
  'f/1.4': 'shallow depth of field, creamy bokeh',
  'f/4': 'balanced depth of field',
  'f/11': 'deep focus clarity, sharp foreground to background',
};

/** Thumbnail paths under Vite public dir — served as `/assets/cinema/...` */
export const CINEMA_ASSET_URLS: Record<string, string> = {
  'Modular 8K Digital': '/assets/cinema/modular_8k_digital.webp',
  'Full-Frame Cine Digital': '/assets/cinema/full_frame_cine_digital.webp',
  'Grand Format 70mm Film': '/assets/cinema/grand_format_70mm_film.webp',
  'Studio Digital S35': '/assets/cinema/studio_digital_s35.webp',
  'Classic 16mm Film': '/assets/cinema/classic_16mm_film.webp',
  'Premium Large Format Digital': '/assets/cinema/premium_large_format_digital.webp',
  'Creative Tilt Lens': '/assets/cinema/creative_tilt_lens.webp',
  'Compact Anamorphic': '/assets/cinema/compact_anamorphic.webp',
  'Extreme Macro': '/assets/cinema/extreme_macro.webp',
  '70s Cinema Prime': '/assets/cinema/70s_cinema_prime.webp',
  'Classic Anamorphic': '/assets/cinema/classic_anamorphic.webp',
  'Premium Modern Prime': '/assets/cinema/premium_modern_prime.webp',
  'Warm Cinema Prime': '/assets/cinema/warm_cinema_prime.webp',
  'Swirl Bokeh Portrait': '/assets/cinema/swirl_bokeh_portrait.webp',
  'Vintage Prime': '/assets/cinema/vintage_prime.webp',
  'Halation Diffusion': '/assets/cinema/halation_diffusion.webp',
  'Clinical Sharp Prime': '/assets/cinema/clinical_sharp_prime.webp',
  'f/1.4': '/assets/cinema/f_1_4.webp',
  'f/4': '/assets/cinema/f_4.webp',
  'f/11': '/assets/cinema/f_11.webp',
};

export const CAMERAS = Object.keys(CAMERA_MAP);
export const LENSES = Object.keys(LENS_MAP);
export const FOCAL_LENGTHS = Object.keys(FOCAL_PERSPECTIVE).map((k) => parseInt(k, 10));
export const APERTURES = Object.keys(APERTURE_EFFECT);

export interface CinemaSettings {
  camera: string;
  lens: string;
  focal: number;
  aperture: string;
}

export const DEFAULT_CINEMA_SETTINGS: CinemaSettings = {
  camera: CAMERAS[0] ?? 'Modular 8K Digital',
  lens: LENSES[0] ?? 'Creative Tilt Lens',
  focal: 35,
  aperture: 'f/1.4',
};

const QUALITY_TAGS = ['professional photography', 'ultra-detailed', '8K resolution'];

/**
 * Compiles a cinematic prompt from base text + virtual camera settings (Nano Banana / Gemini-style).
 */
export function buildCinemaPrompt(
  basePrompt: string,
  camera: string,
  lens: string,
  focalLength: number,
  aperture: string,
): string {
  const cameraDesc = CAMERA_MAP[camera] ?? camera;
  const lensDesc = LENS_MAP[lens] ?? lens;
  const perspective = FOCAL_PERSPECTIVE[focalLength] ?? '';
  const depthEffect = APERTURE_EFFECT[aperture] ?? '';

  const parts = [
    basePrompt.trim(),
    `shot on a ${cameraDesc}`,
    `using a ${lensDesc} at ${focalLength}mm ${perspective ? `(${perspective})` : ''}`.trim(),
    `aperture ${aperture}`,
    depthEffect,
    'cinematic lighting',
    'natural color science',
    'high dynamic range',
    QUALITY_TAGS.join(', '),
  ];

  return parts.filter((p) => p && p.trim() !== '').join(', ');
}

export function formatCinemaSummary(settings: CinemaSettings): string {
  return `${settings.lens}, ${settings.focal}mm, ${settings.aperture}`;
}
