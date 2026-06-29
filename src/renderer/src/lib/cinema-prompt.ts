/**
 * Cinema camera / optics / exposure prompt modifiers (research-hub / Open Generative AI parity).
 * Appends descriptive capture language to the user's prompt for image generation.
 */

export const CAMERA_MAP: Record<string, string> = {
  'Modular 8K Digital': 'modular 8K digital cinema camera',
  'Full-Frame Cine Digital': 'full-frame digital cinema camera',
  'Grand Format 70mm Film': 'grand format 70mm film camera',
  'Studio Digital S35': 'Super 35 studio digital camera',
  'Classic 16mm Film': 'classic 16mm film camera',
  'Premium Large Format Digital': 'premium large-format digital cinema camera',
  'IMAX 15/70 Film': 'IMAX 15/70 film camera, immense negative area, monumental clarity',
  'High-Speed Digital Cinema': 'high-speed digital cinema camera, crisp action capture',
  'Vintage CCD Digital': 'vintage CCD digital cinema camera, early-digital color response',
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
  18: 'wide establishing perspective',
  24: 'wide-angle dynamic perspective',
  28: 'documentary wide perspective',
  35: 'natural cinematic perspective',
  40: 'natural standard perspective',
  50: 'standard portrait perspective',
  65: 'medium portrait compression',
  85: 'classic portrait perspective',
  100: 'tight telephoto compression',
  135: 'strong telephoto compression',
};

export const APERTURE_EFFECT: Record<string, string> = {
  'f/1.4': 'shallow depth of field, creamy bokeh',
  'f/2': 'shallow depth of field, soft background separation',
  'f/2.8': 'moderate shallow focus, controlled bokeh',
  'f/4': 'balanced depth of field',
  'f/5.6': 'medium depth of field, clear subject and setting',
  'f/8': 'deepening focus with crisp environmental detail',
  'f/11': 'deep focus clarity, sharp foreground to background',
  'f/16': 'maximum deep focus, detailed foreground and distant background',
};

export const SHUTTER_EFFECT: Record<string, string> = {
  '1/1000 Freeze': '1/1000 shutter speed, frozen action, crisp motion detail',
  '1/250 Crisp Action': '1/250 shutter speed, crisp action with minimal motion blur',
  '1/125 Natural Motion': '1/125 shutter speed, natural handheld motion texture',
  '1/48 Cinematic Motion': '1/48 shutter speed, 180-degree cinematic motion blur',
  '1/15 Motion Drag': '1/15 shutter speed, expressive motion drag and streaking',
  'Long Exposure': 'long exposure, luminous trails, smeared motion, ethereal atmosphere',
};

export const ISO_EFFECT: Record<string, string> = {
  'ISO 100 Clean': 'ISO 100, clean shadows, minimal grain',
  'ISO 400 Texture': 'ISO 400, subtle organic texture, balanced sensitivity',
  'ISO 800 Available Light': 'ISO 800, available-light sensitivity, gentle shadow grain',
  'ISO 1600 Grit': 'ISO 1600, visible cinematic grain, gritty low-light texture',
  'ISO 3200 Night Grain': 'ISO 3200, pronounced night grain, pushed exposure character',
};

export const FILM_STOCK_EFFECT: Record<string, string> = {
  'Neutral Digital Color': 'neutral digital color science, accurate color response',
  'Kodak 2383 Print': 'Kodak 2383 print emulation, rich contrast, warm highlights',
  'Portra Warm Skin': 'Portra-inspired warm skin tones, soft pastel color response',
  'Ektachrome Slide Pop': 'Ektachrome slide-film color, saturated blues and crisp contrast',
  'Bleach Bypass Contrast': 'bleach bypass grade, desaturated color, hard silver contrast',
  'Cool Teal Grade': 'cool teal cinematic grade, restrained warmth, deep cyan shadows',
};

export const FOCUS_DISTANCE_EFFECT: Record<string, string> = {
  'Macro Close Focus': 'macro close focus, magnified foreground detail, rapid focus falloff',
  'Subject Isolation': 'subject-focused plane, isolated subject, soft background separation',
  'Zone Focus': 'zone focus, layered street-photography sharpness across midground action',
  'Deep Background Focus': 'deep background focus, readable subject and environment planes',
  'Infinity Landscape': 'infinity focus, distant landscape clarity, broad environmental sharpness',
};

export const FILTER_EFFECT: Record<string, string> = {
  'No Filter': '',
  'Black Pro-Mist': 'Black Pro-Mist diffusion, blooming highlights, softened contrast',
  Glimmerglass: 'Glimmerglass diffusion, pearlescent highlights, gentle skin smoothing',
  'ND Filter': 'neutral density filter, controlled exposure, rich outdoor highlights',
  Polarizer: 'polarizing filter, reduced glare, deeper skies, richer surface color',
  'Star Filter': 'star filter, radiant highlight spikes, stylized practical lights',
};

export const ND_STRENGTH_EFFECT: Record<string, string> = {
  'ND 0.3 / 1 Stop': 'ND 0.3 one-stop light reduction, open aperture in bright sun',
  'ND 0.6 / 2 Stops': 'ND 0.6 two-stop light reduction, balanced daylight exposure',
  'ND 0.9 / 3 Stops': 'ND 0.9 three-stop light reduction, rich sky detail and soft highlights',
  'ND 1.2 / 4 Stops': 'ND 1.2 four-stop light reduction, shallow daylight depth of field',
  'ND 1.8 / 6 Stops': 'ND 1.8 six-stop light reduction, bright-scene motion control',
  'ND 3.0 / 10 Stops': 'ND 3.0 ten-stop light reduction, long-exposure daylight smoothing',
  'Variable ND / 2–5 Stops':
    'variable ND two-to-five stop light reduction, adjustable daylight control',
};

/** Thumbnail paths under Vite public dir — served as `/assets/cinema/...` */
export const CINEMA_ASSET_URLS: Record<string, string> = {
  'Modular 8K Digital': '/assets/cinema/modular_8k_digital.webp',
  'Full-Frame Cine Digital': '/assets/cinema/full_frame_cine_digital.webp',
  'Grand Format 70mm Film': '/assets/cinema/grand_format_70mm_film.webp',
  'Studio Digital S35': '/assets/cinema/studio_digital_s35.webp',
  'Classic 16mm Film': '/assets/cinema/classic_16mm_film.webp',
  'Premium Large Format Digital': '/assets/cinema/premium_large_format_digital.webp',
  'IMAX 15/70 Film': '/assets/cinema/output-previews/camera-imax-15-70-film.jpg',
  'High-Speed Digital Cinema':
    '/assets/cinema/output-previews/camera-high-speed-digital-cinema.jpg',
  'Vintage CCD Digital': '/assets/cinema/output-previews/camera-vintage-ccd-digital.jpg',
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
  'f/2': '/assets/cinema/output-previews/aperture-f-2.jpg',
  'f/2.8': '/assets/cinema/output-previews/aperture-f-2-8.jpg',
  'f/4': '/assets/cinema/f_4.webp',
  'f/5.6': '/assets/cinema/output-previews/aperture-f-5-6.jpg',
  'f/8': '/assets/cinema/output-previews/aperture-f-8.jpg',
  'f/11': '/assets/cinema/f_11.webp',
  'f/16': '/assets/cinema/output-previews/aperture-f-16.jpg',
  '1/1000 Freeze': '/assets/cinema/output-previews/shutter-1-1000-freeze.jpg',
  '1/250 Crisp Action': '/assets/cinema/output-previews/shutter-1-250-crisp-action.jpg',
  '1/125 Natural Motion': '/assets/cinema/output-previews/shutter-1-125-natural-motion.jpg',
  '1/48 Cinematic Motion': '/assets/cinema/output-previews/shutter-1-48-cinematic-motion.jpg',
  '1/15 Motion Drag': '/assets/cinema/output-previews/shutter-1-15-motion-drag.jpg',
  'Long Exposure': '/assets/cinema/output-previews/shutter-long-exposure.jpg',
  'ISO 100 Clean': '/assets/cinema/output-previews/iso-iso-100-clean.jpg',
  'ISO 400 Texture': '/assets/cinema/output-previews/iso-iso-400-texture.jpg',
  'ISO 800 Available Light': '/assets/cinema/output-previews/iso-iso-800-available-light.jpg',
  'ISO 1600 Grit': '/assets/cinema/output-previews/iso-iso-1600-grit.jpg',
  'ISO 3200 Night Grain': '/assets/cinema/output-previews/iso-iso-3200-night-grain.jpg',
  'Neutral Digital Color': '/assets/cinema/output-previews/filmStock-neutral-digital-color.jpg',
  'Kodak 2383 Print': '/assets/cinema/output-previews/filmStock-kodak-2383-print.jpg',
  'Portra Warm Skin': '/assets/cinema/output-previews/filmStock-portra-warm-skin.jpg',
  'Ektachrome Slide Pop': '/assets/cinema/output-previews/filmStock-ektachrome-slide-pop.jpg',
  'Bleach Bypass Contrast': '/assets/cinema/output-previews/filmStock-bleach-bypass-contrast.jpg',
  'Cool Teal Grade': '/assets/cinema/output-previews/filmStock-cool-teal-grade.jpg',
  'Macro Close Focus': '/assets/cinema/output-previews/focusDistance-macro-close-focus.jpg',
  'Subject Isolation': '/assets/cinema/output-previews/focusDistance-subject-isolation.jpg',
  'Zone Focus': '/assets/cinema/output-previews/focusDistance-zone-focus.jpg',
  'Deep Background Focus': '/assets/cinema/output-previews/focusDistance-deep-background-focus.jpg',
  'Infinity Landscape': '/assets/cinema/output-previews/focusDistance-infinity-landscape.jpg',
  'No Filter': '/assets/cinema/output-previews/filter-no-filter.jpg',
  'Black Pro-Mist': '/assets/cinema/output-previews/filter-black-pro-mist.jpg',
  Glimmerglass: '/assets/cinema/output-previews/filter-glimmerglass.jpg',
  'ND Filter': '/assets/cinema/output-previews/filter-nd-filter.jpg',
  Polarizer: '/assets/cinema/output-previews/filter-polarizer.jpg',
  'Star Filter': '/assets/cinema/output-previews/filter-star-filter.jpg',
  'ND 0.3 / 1 Stop': '/assets/cinema/output-previews/ndStrength-nd-0-3-1-stop.jpg',
  'ND 0.6 / 2 Stops': '/assets/cinema/output-previews/ndStrength-nd-0-6-2-stops.jpg',
  'ND 0.9 / 3 Stops': '/assets/cinema/output-previews/ndStrength-nd-0-9-3-stops.jpg',
  'ND 1.2 / 4 Stops': '/assets/cinema/output-previews/ndStrength-nd-1-2-4-stops.jpg',
  'ND 1.8 / 6 Stops': '/assets/cinema/output-previews/ndStrength-nd-1-8-6-stops.jpg',
  'ND 3.0 / 10 Stops': '/assets/cinema/output-previews/ndStrength-nd-3-0-10-stops.jpg',
  'Variable ND / 2–5 Stops': '/assets/cinema/output-previews/ndStrength-variable-nd-2-5-stops.jpg',
};

export const CAMERAS = Object.keys(CAMERA_MAP);
export const LENSES = Object.keys(LENS_MAP);
export const FOCAL_LENGTHS = Object.keys(FOCAL_PERSPECTIVE).map((k) => parseInt(k, 10));
export const APERTURES = Object.keys(APERTURE_EFFECT);
export const SHUTTERS = Object.keys(SHUTTER_EFFECT);
export const ISOS = Object.keys(ISO_EFFECT);
export const FILM_STOCKS = Object.keys(FILM_STOCK_EFFECT);
export const FOCUS_DISTANCES = Object.keys(FOCUS_DISTANCE_EFFECT);
export const FILTERS = Object.keys(FILTER_EFFECT);
export const ND_STRENGTHS = Object.keys(ND_STRENGTH_EFFECT);

export interface CinemaSettings {
  camera: string;
  lens: string;
  focal: number;
  aperture: string;
  shutter: string;
  iso: string;
  filmStock: string;
  focusDistance: string;
  filter: string;
  ndStrength: string;
}

export const DEFAULT_CINEMA_SETTINGS: CinemaSettings = {
  camera: CAMERAS[0] ?? 'Modular 8K Digital',
  lens: LENSES[0] ?? 'Creative Tilt Lens',
  focal: 35,
  aperture: 'f/1.4',
  shutter: '1/48 Cinematic Motion',
  iso: 'ISO 400 Texture',
  filmStock: 'Neutral Digital Color',
  focusDistance: 'Subject Isolation',
  filter: 'No Filter',
  ndStrength: 'ND 0.9 / 3 Stops',
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
  shutter: string,
  iso: string,
  filmStock: string,
  focusDistance: string,
  filter: string,
  ndStrength = DEFAULT_CINEMA_SETTINGS.ndStrength,
): string {
  const cameraDesc = CAMERA_MAP[camera] ?? camera;
  const lensDesc = LENS_MAP[lens] ?? lens;
  const perspective = FOCAL_PERSPECTIVE[focalLength] ?? '';
  const depthEffect = APERTURE_EFFECT[aperture] ?? '';
  const shutterEffect = SHUTTER_EFFECT[shutter] ?? shutter;
  const isoEffect = ISO_EFFECT[iso] ?? iso;
  const filmStockEffect = FILM_STOCK_EFFECT[filmStock] ?? filmStock;
  const focusEffect = FOCUS_DISTANCE_EFFECT[focusDistance] ?? focusDistance;
  const filterEffect = FILTER_EFFECT[filter] ?? filter;
  const ndStrengthEffect =
    filter === 'ND Filter' ? (ND_STRENGTH_EFFECT[ndStrength] ?? ndStrength) : '';

  const parts = [
    basePrompt.trim(),
    `shot on a ${cameraDesc}`,
    `using a ${lensDesc} at ${String(focalLength)}mm ${perspective ? `(${perspective})` : ''}`.trim(),
    `aperture ${aperture}`,
    depthEffect,
    shutterEffect,
    isoEffect,
    filmStockEffect,
    focusEffect,
    filterEffect,
    ndStrengthEffect,
    'cinematic lighting',
    'natural color science',
    'high dynamic range',
    QUALITY_TAGS.join(', '),
  ];

  return parts.filter((p) => p && p.trim() !== '').join(', ');
}

export function formatCinemaSummary(settings: CinemaSettings): string {
  const ndText = settings.filter === 'ND Filter' ? `, ${settings.ndStrength}` : '';
  return `${settings.lens}, ${String(settings.focal)}mm, ${settings.aperture}, ${settings.shutter}${ndText}`;
}
