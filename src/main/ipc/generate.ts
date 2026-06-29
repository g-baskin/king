import { readFileSync } from 'fs';
import { extname } from 'path';
import log from 'electron-log/main';
import { getApiKey } from '../services/apiKeyStore';
import { resolveLocalFileUrl } from '../services/paths';
import { secureHandle } from './validateSender';

// Google's Gemini 3 Pro Image via fal.ai. Pricing: $0.15/image at 1K/2K,
// $0.30 at 4K. Edit endpoint accepts up to 14 reference images.
const NANO_BANANA_PRO_MODEL = 'fal-ai/nano-banana-pro';
const NANO_BANANA_PRO_EDIT_MODEL = 'fal-ai/nano-banana-pro/edit';

// OpenAI GPT Image 2 via fal.ai. Top-tier text rendering and photoreal.
// Pricing is token-based — practically $0.01/image at low/1024x768 up to
// $0.41/image at high/4K. Edit endpoint runs the same underlying model.
// Both endpoints are namespaced under `openai/...` per fal's official
// launch announcement (April 21, 2026).
// https://fal.ai/models/openai/gpt-image-2
const GPT_IMAGE_2_MODEL = 'openai/gpt-image-2';
const GPT_IMAGE_2_EDIT_MODEL = 'openai/gpt-image-2/edit';

const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const KIE_UPLOAD_BASE = 'https://kieai.redpandaai.co';
const KIE_GPT4O_GENERATE_URL = `${KIE_API_BASE}/gpt4o-image/generate`;
const KIE_GPT4O_RECORD_URL = `${KIE_API_BASE}/gpt4o-image/record-info`;
const KIE_FLUX_GENERATE_URL = `${KIE_API_BASE}/flux/kontext/generate`;
const KIE_FLUX_RECORD_URL = `${KIE_API_BASE}/flux/kontext/record-info`;
const KIE_FILE_UPLOAD_URL = `${KIE_UPLOAD_BASE}/api/file-base64-upload`;

export type ModelVariant =
  | 'kie_auto'
  | 'kie_gpt4o'
  | 'kie_flux_kontext_pro'
  | 'kie_flux_kontext_max'
  | 'nano_banana_pro'
  | 'gpt_image_2';

type FalModelVariant = 'nano_banana_pro' | 'gpt_image_2';
type KieModelVariant = 'kie_auto' | 'kie_gpt4o' | 'kie_flux_kontext_pro' | 'kie_flux_kontext_max';
type KieEffectiveModel = 'kie_gpt4o' | 'kie_flux_kontext_pro' | 'kie_flux_kontext_max';
type KieFluxModel = 'flux-kontext-pro' | 'flux-kontext-max';
type Kie4oSize = '1:1' | '3:2' | '2:3';
type KieFluxAspectRatio = '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
type NanoBananaResolution = '1K' | '2K' | '4K';

interface GenerateImageData {
  prompt: string;
  aspectRatio: string;
  resolution: string;
  outputFormat: string;
  imageUrls: string[];
  /** Which provider/model to route through. Picked from Settings or the prompt bar. */
  modelVariant?: ModelVariant;
}

interface GenerateVideoData {
  prompt: string;
  imageUrl: string;
  aspectRatio: string;
  durationSeconds?: 5 | 10;
}

interface KieResponse<T> {
  code?: number | string;
  msg?: string;
  message?: string;
  error?: string;
  success?: boolean;
  data?: T;
}

interface KieTaskCreateData {
  taskId?: string;
}

interface KieTaskRecordData {
  successFlag?: number;
  response?: {
    result_urls?: unknown;
    resultImageUrl?: unknown;
  } | null;
  errorCode?: number | string | null;
  errorMessage?: string | null;
}

interface KieUploadData {
  fileUrl?: string;
}

class KieApiError extends Error {
  readonly status?: number;
  readonly code?: number | string;
  readonly body?: unknown;

  constructor(
    message: string,
    options: {
      status?: number | undefined;
      code?: number | string | undefined;
      body?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'KieApiError';
    if (options.status !== undefined) this.status = options.status;
    if (options.code !== undefined) this.code = options.code;
    if (options.body !== undefined) this.body = options.body;
  }
}

// Mirror of the renderer's SUPPORTED_IMAGE_MIME_TYPES — covers every
// format Google Gemini's image input accepts: PNG, JPEG, WebP, HEIC, HEIF.
// https://ai.google.dev/gemini-api/docs/image-understanding
const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

const VALID_MODEL_VARIANTS = new Set<ModelVariant>([
  'kie_auto',
  'kie_gpt4o',
  'kie_flux_kontext_pro',
  'kie_flux_kontext_max',
  'nano_banana_pro',
  'gpt_image_2',
]);

const KIE_MODEL_VARIANTS = new Set<ModelVariant>([
  'kie_auto',
  'kie_gpt4o',
  'kie_flux_kontext_pro',
  'kie_flux_kontext_max',
]);

const KIE_FLUX_SUPPORTED_ASPECT_RATIOS: KieFluxAspectRatio[] = [
  '21:9',
  '16:9',
  '4:3',
  '1:1',
  '3:4',
  '9:16',
];

function resolveImageUrl(url: string): string {
  if (url.startsWith('data:') || url.startsWith('http')) return url;

  if (url.startsWith('local-file://')) {
    const filePath = resolveLocalFileUrl(url);
    if (!filePath) return url;
    const buffer = readFileSync(filePath);
    const ext = extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'image/png';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  return url;
}

const FAL_MISSING_KEY_MESSAGE =
  "Your image generator isn't connected yet. Open the APIs page and add your fal.ai key to get started.";
const FAL_INVALID_KEY_MESSAGE =
  "Your fal.ai key didn't work. Double-check it on the APIs page and save a fresh one if needed.";
const FAL_OUT_OF_CREDITS_MESSAGE =
  'Your fal.ai account is locked — usually because the balance ran out. If you just topped up, give it a minute to sync and try again. Otherwise top up at fal.ai/dashboard/billing, or check that your API key belongs to the account you topped up.';
const SAFETY_BLOCK_MESSAGE =
  'Google blocked this one as a safety precaution. The filter is probabilistic — hitting Try again often works, especially on face-swap and character workflows.';
const VALIDATION_MESSAGE =
  "Something about this request wasn't accepted. Try a different image or prompt.";

const KIE_MISSING_KEY_MESSAGE =
  "Your KIE.ai image generator isn't connected yet. Open the APIs page and add your KIE.ai key to get started.";
const KIE_INVALID_KEY_MESSAGE =
  "Your KIE.ai key didn't work. Double-check it on the APIs page and save a fresh one if needed.";
const KIE_OUT_OF_CREDITS_MESSAGE =
  'Your KIE.ai account does not have enough credits for this image. Top up on KIE.ai, then try again.';
const KIE_RATE_LIMIT_MESSAGE =
  'KIE.ai is rate-limiting image generation right now. Wait a minute and try again.';
const KIE_VALIDATION_MESSAGE =
  "KIE.ai didn't accept this request. Try a supported aspect ratio, a different image, or a shorter prompt.";
const KIE_UPLOAD_FAILED_MESSAGE =
  "KIE.ai couldn't upload the reference image. Try a smaller PNG or JPG.";
const KIE_GENERATION_FAILED_MESSAGE =
  "KIE.ai couldn't generate that image. Try a different prompt or reference image.";
const KIE_TIMEOUT_MESSAGE = 'KIE.ai is still working on this image. Try again in a minute.';

const VIDEO_MODEL = 'fal-ai/minimax-video/image-to-video';

function mapAspectRatioToVideoRatio(aspectRatio: string): '16:9' | '9:16' | '1:1' {
  if (aspectRatio === '9:16') return '9:16';
  if (aspectRatio === '1:1') return '1:1';
  return '16:9';
}

function normalizeModelVariant(modelVariant: ModelVariant | undefined): ModelVariant {
  return modelVariant && VALID_MODEL_VARIANTS.has(modelVariant) ? modelVariant : 'kie_auto';
}

function isKieVariant(modelVariant: ModelVariant): modelVariant is KieModelVariant {
  return KIE_MODEL_VARIANTS.has(modelVariant);
}

function isDataOrHttpUrl(url: string): boolean {
  return url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://');
}

function parseAspectRatio(aspectRatio: string): number | null {
  const [rawWidth, rawHeight] = aspectRatio.split(':');
  const width = Number(rawWidth);
  const height = Number(rawHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return width / height;
}

function nearestRatio<T extends string>(aspectRatio: string, candidates: T[]): T {
  const target = parseAspectRatio(aspectRatio);
  if (target === null) return candidates[0]!;

  return candidates.reduce((best, candidate) => {
    const bestRatio = parseAspectRatio(best) ?? target;
    const candidateRatio = parseAspectRatio(candidate) ?? target;
    return Math.abs(candidateRatio - target) < Math.abs(bestRatio - target) ? candidate : best;
  }, candidates[0]!);
}

function mapAspectToKie4oSize(aspectRatio: string): Kie4oSize {
  if (aspectRatio === '1:1' || aspectRatio === '3:2' || aspectRatio === '2:3') {
    return aspectRatio;
  }
  if (aspectRatio === 'auto') return '1:1';
  return nearestRatio(aspectRatio, ['1:1', '3:2', '2:3']);
}

function mapAspectToKieFlux(aspectRatio: string): KieFluxAspectRatio | null {
  if (aspectRatio === 'auto') return null;
  if (KIE_FLUX_SUPPORTED_ASPECT_RATIOS.includes(aspectRatio as KieFluxAspectRatio)) {
    return aspectRatio as KieFluxAspectRatio;
  }
  return nearestRatio(aspectRatio, KIE_FLUX_SUPPORTED_ASPECT_RATIOS);
}

function mapOutputFormatToKieFlux(outputFormat: string): 'jpeg' | 'png' {
  return outputFormat === 'png' ? 'png' : 'jpeg';
}

function mapKieFluxModel(model: KieEffectiveModel): KieFluxModel {
  return model === 'kie_flux_kontext_pro' ? 'flux-kontext-pro' : 'flux-kontext-max';
}

function selectKieModel(variant: KieModelVariant, hasReferenceImages: boolean): KieEffectiveModel {
  if (variant === 'kie_auto') {
    return hasReferenceImages ? 'kie_flux_kontext_max' : 'kie_gpt4o';
  }
  return variant;
}

/**
 * Detect Gemini / Nano Banana Pro safety-filter refusals. Gemini wraps
 * both its prompt-level and post-generation safety blocks inside a 422
 * with a generic "did not generate the expected output" body — we match
 * on that phrase (and its known variants) so we can surface an actionable
 * message instead of the cryptic default.
 */
function isSafetyBlock(message: string): boolean {
  return /\b(unsafe content|did not generate the expected output|prohibited[_ ]content|image[_ ]safety)\b/i.test(
    message,
  );
}

/**
 * Walk a fal error body looking for the underlying human-readable message.
 * fal errors vary in shape — sometimes `{detail: "..."}`, sometimes
 * `{detail: [{msg, loc, type}]}`, sometimes a top-level `.message`. This
 * returns whatever text we can find so we can keyword-match it.
 */
function extractFalMessage(err: { body?: unknown; message?: string }): string {
  const parts: string[] = [];
  if (typeof err.message === 'string') parts.push(err.message);
  const body = err.body as { detail?: unknown; message?: string; error?: string } | undefined;
  if (body) {
    if (typeof body.message === 'string') parts.push(body.message);
    if (typeof body.error === 'string') parts.push(body.error);
    if (typeof body.detail === 'string') parts.push(body.detail);
    if (Array.isArray(body.detail)) {
      for (const d of body.detail) {
        if (d && typeof d === 'object' && 'msg' in d && typeof d.msg === 'string') {
          parts.push(d.msg);
        }
      }
    }
  }
  return parts.join(' | ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getKieCode(body: unknown): number | string | undefined {
  if (!isRecord(body)) return undefined;
  const code = body.code;
  return typeof code === 'number' || typeof code === 'string' ? code : undefined;
}

function extractKieBodyMessage(body: unknown): string {
  const parts: string[] = [];
  if (!isRecord(body)) return '';

  for (const key of ['msg', 'message', 'error']) {
    const value = body[key];
    if (typeof value === 'string') parts.push(value);
  }

  const data = body.data;
  if (isRecord(data)) {
    for (const key of ['msg', 'message', 'error', 'errorMessage']) {
      const value = data[key];
      if (typeof value === 'string') parts.push(value);
    }
  }

  return parts.join(' | ');
}

function extractKieMessage(err: unknown): string {
  if (err instanceof KieApiError) {
    return [err.message, extractKieBodyMessage(err.body)].filter(Boolean).join(' | ');
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function isOutOfCredits(
  status: number | undefined,
  message: string,
  code?: number | string,
): boolean {
  // 402 Payment Required is the canonical HTTP status, but providers can also
  // return 401/403/200 with a credits-related message in the body.
  if (status === 402 || code === 402 || code === '402') return true;
  return /\b(insufficient (balance|credits|funds)|out of credits|exhausted|quota|top up|billing|payment required)\b/i.test(
    message,
  );
}

function isAuthFailure(
  status: number | undefined,
  message: string,
  code?: number | string,
): boolean {
  if (
    status === 401 ||
    status === 403 ||
    code === 401 ||
    code === 403 ||
    code === '401' ||
    code === '403'
  ) {
    return true;
  }
  return /\b(unauthorized|invalid api key|invalid key|forbidden|bearer)\b/i.test(message);
}

function isRateLimited(
  status: number | undefined,
  message: string,
  code?: number | string,
): boolean {
  if (status === 429 || code === 429 || code === '429') return true;
  return /\b(rate limit|too many requests|request limit)\b/i.test(message);
}

function isValidationFailure(status: number | undefined, code?: number | string): boolean {
  return (
    status === 400 ||
    status === 422 ||
    code === 400 ||
    code === 422 ||
    code === '400' ||
    code === '422'
  );
}

function selectFalModel(variant: FalModelVariant, hasReferenceImages: boolean): string {
  if (variant === 'gpt_image_2') {
    return hasReferenceImages ? GPT_IMAGE_2_EDIT_MODEL : GPT_IMAGE_2_MODEL;
  }
  return hasReferenceImages ? NANO_BANANA_PRO_EDIT_MODEL : NANO_BANANA_PRO_MODEL;
}

/**
 * Map our app-level aspect ratio strings to GPT Image 2's `image_size`
 * presets. GPT only ships these enum values via fal — anything else
 * falls back to `auto` (model infers output dimensions). We do not
 * fabricate custom {width, height} values; the user asked for the docs'
 * options as-is.
 *   https://fal.ai/models/openai/gpt-image-2/api
 */
function mapAspectToGptImageSize(aspectRatio: string): string {
  switch (aspectRatio) {
    case '1:1':
      return 'square_hd';
    case '4:3':
      return 'landscape_4_3';
    case '3:4':
      return 'portrait_4_3';
    case '16:9':
      return 'landscape_16_9';
    case '9:16':
      return 'portrait_16_9';
    case 'auto':
      return 'auto';
    default:
      return 'auto';
  }
}

/**
 * GPT Image 2 has only two quality tiers (`low` / `high`) instead of the
 * 1K/2K/4K resolution ladder Nano Banana exposes. 1K → low (cheap), 2K
 * and 4K → high (default).
 */
function mapResolutionToGptQuality(resolution: string): 'low' | 'high' {
  return resolution === 'low' || resolution === '1K' ? 'low' : 'high';
}

function mapResolutionToNanoBanana(resolution: string): NanoBananaResolution {
  if (resolution === '2K' || resolution === '4K') return resolution;
  if (resolution === 'high') return '2K';
  return '1K';
}

function buildNanoBananaInput(
  data: GenerateImageData,
  resolvedUrls: string[],
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: data.prompt,
    aspect_ratio: data.aspectRatio || '1:1',
    resolution: mapResolutionToNanoBanana(data.resolution),
    output_format: data.outputFormat || 'png',
    num_images: 1,
    // Most-permissive Layer-1 safety setting (fal scale: 1 strictest,
    // 6 least strict, default 4). Doesn't bypass Google's Layer-2 policy
    // filter — most refusals originate there — but eliminates false-
    // positive Layer-1 blocks that otherwise steal ~5-10% of generations.
    safety_tolerance: '6',
  };
  if (resolvedUrls.length > 0) {
    input.image_urls = resolvedUrls;
  }
  return input;
}

function buildGptImage2Input(
  data: GenerateImageData,
  resolvedUrls: string[],
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: data.prompt,
    image_size: mapAspectToGptImageSize(data.aspectRatio),
    quality: mapResolutionToGptQuality(data.resolution),
    output_format: data.outputFormat || 'png',
    num_images: 1,
  };
  if (resolvedUrls.length > 0) {
    input.image_urls = resolvedUrls;
  }
  return input;
}

function buildKieGpt4oInput(
  data: GenerateImageData,
  referenceUrls: string[],
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: data.prompt,
    size: mapAspectToKie4oSize(data.aspectRatio),
    nVariants: 1,
  };
  if (referenceUrls.length > 0) {
    input.filesUrl = referenceUrls.slice(0, 5);
  }
  return input;
}

function buildKieFluxInput(
  data: GenerateImageData,
  referenceUrls: string[],
  model: KieEffectiveModel,
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: data.prompt,
    model: mapKieFluxModel(model),
    outputFormat: mapOutputFormatToKieFlux(data.outputFormat),
    promptUpsampling: data.resolution === 'high',
    safetyTolerance: referenceUrls.length > 0 ? 2 : 4,
  };

  const aspectRatio = mapAspectToKieFlux(data.aspectRatio);
  if (aspectRatio) input.aspectRatio = aspectRatio;
  if (referenceUrls[0]) input.inputImage = referenceUrls[0];

  return input;
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

async function kieFetchJson<T>(
  url: string,
  apiKey: string,
  init: RequestInit = {},
): Promise<KieResponse<T>> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${apiKey}`);
  if (init.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...init,
    headers,
  });
  const body = await readJsonResponse(response);
  const code = getKieCode(body);
  const message = extractKieBodyMessage(body) || response.statusText;
  const codeOk = code === undefined || code === 200 || code === '200';
  const explicitSuccess = isRecord(body) && body.success === true;

  if (!response.ok || (!codeOk && !explicitSuccess)) {
    throw new KieApiError(message || 'KIE.ai request failed.', {
      status: response.status,
      code,
      body,
    });
  }

  return (isRecord(body) ? body : {}) as KieResponse<T>;
}

async function createKieTask(
  url: string,
  apiKey: string,
  input: Record<string, unknown>,
): Promise<string> {
  const body = await kieFetchJson<KieTaskCreateData>(url, apiKey, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const taskId = body.data?.taskId;
  if (!taskId) {
    throw new KieApiError("KIE.ai didn't return a task ID.", { body });
  }
  return taskId;
}

function extractKieGpt4oResultUrls(record: KieTaskRecordData): string[] {
  const resultUrls = record.response?.result_urls;
  return Array.isArray(resultUrls)
    ? resultUrls.filter((url): url is string => typeof url === 'string')
    : [];
}

function extractKieFluxResultUrls(record: KieTaskRecordData): string[] {
  const resultImageUrl = record.response?.resultImageUrl;
  return typeof resultImageUrl === 'string' ? [resultImageUrl] : [];
}

async function pollKieTask(
  apiKey: string,
  recordUrl: string,
  taskId: string,
  extractResultUrls: (record: KieTaskRecordData) => string[],
  failedFlags: number[],
  intervalMs: number,
): Promise<string[]> {
  const deadline = Date.now() + 5 * 60 * 1000;
  const url = `${recordUrl}?${new URLSearchParams({ taskId }).toString()}`;

  while (Date.now() < deadline) {
    const body = await kieFetchJson<KieTaskRecordData>(url, apiKey, { method: 'GET' });
    const record = body.data;
    if (!record) {
      throw new KieApiError("KIE.ai didn't return task details.", { body });
    }

    if (record.successFlag === 1) {
      const resultUrls = extractResultUrls(record);
      if (resultUrls.length === 0) {
        throw new KieApiError("KIE.ai didn't return an output image.", { body });
      }
      return resultUrls;
    }

    if (typeof record.successFlag === 'number' && failedFlags.includes(record.successFlag)) {
      throw new KieApiError(record.errorMessage || KIE_GENERATION_FAILED_MESSAGE, {
        code: record.errorCode ?? body.code,
        body,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(KIE_TIMEOUT_MESSAGE);
}

function getDataUrlExtension(dataUrl: string): string {
  const match = /^data:image\/(png|jpe?g|webp|heic|heif);/i.exec(dataUrl);
  const raw = match?.[1]?.toLowerCase();
  if (raw === 'jpeg') return 'jpg';
  return raw ?? 'png';
}

async function uploadKieDataUrl(dataUrl: string, apiKey: string, index: number): Promise<string> {
  const extension = getDataUrlExtension(dataUrl);
  const body = await kieFetchJson<KieUploadData>(KIE_FILE_UPLOAD_URL, apiKey, {
    method: 'POST',
    body: JSON.stringify({
      base64Data: dataUrl,
      uploadPath: 'king/reference-images',
      fileName: `king-reference-${Date.now()}-${index}.${extension}`,
    }),
  });
  const fileUrl = body.data?.fileUrl;
  if (!fileUrl) throw new Error(KIE_UPLOAD_FAILED_MESSAGE);
  return fileUrl;
}

async function prepareKieReferenceUrls(
  imageUrls: string[],
  apiKey: string,
  limit: number,
): Promise<string[]> {
  const resolvedUrls = imageUrls.map(resolveImageUrl).filter(isDataOrHttpUrl).slice(0, limit);
  const publicUrls: string[] = [];

  for (let i = 0; i < resolvedUrls.length; i++) {
    const url = resolvedUrls[i];
    if (!url) continue;
    if (url.startsWith('data:')) {
      publicUrls.push(await uploadKieDataUrl(url, apiKey, i));
    } else {
      publicUrls.push(url);
    }
  }

  return publicUrls;
}

async function generateFalImage(data: GenerateImageData, variant: FalModelVariant) {
  // Read the key fresh from the encrypted store on every call — this
  // ensures we always use the current key even if process.env was set
  // before the user saved a different one, and avoids relying on the
  // fal singleton's one-time env snapshot.
  const falKey = getApiKey('fal') ?? process.env.FAL_KEY;
  if (!falKey) {
    throw new Error(FAL_MISSING_KEY_MESSAGE);
  }

  const { fal } = await import('@fal-ai/client');
  fal.config({ credentials: falKey });

  const resolvedUrls = (data.imageUrls || []).map(resolveImageUrl).filter(isDataOrHttpUrl);

  const hasReferenceImages = resolvedUrls.length > 0;
  const model = selectFalModel(variant, hasReferenceImages);

  const input =
    variant === 'gpt_image_2'
      ? buildGptImage2Input(data, resolvedUrls)
      : buildNanoBananaInput(data, resolvedUrls);

  try {
    const result = await fal.subscribe(model, { input, logs: true });

    const resultData = result.data as {
      images?: Array<{ url: string }>;
    };

    const resultUrls = resultData.images?.map((img: { url: string }) => img.url) ?? [];

    return {
      success: true,
      resultUrls,
      modelProvider: 'fal' as const,
      modelVariant: variant,
      effectiveModelVariant: variant,
    };
  } catch (err) {
    const e = err as { status?: number; body?: unknown; message?: string };
    const falMessage = extractFalMessage(e);

    // Log the full fal error body once so we can diagnose new error shapes
    // without the user needing to DevTools the renderer.
    log.error(
      '[generate:image] fal error — status:',
      e?.status,
      'message:',
      e?.message,
      'body:',
      JSON.stringify(e?.body, null, 2),
    );

    // Check credits BEFORE auth — fal sometimes returns 401/403 with a
    // credits message in the body, and we want to surface that correctly
    // rather than telling the user their key is broken.
    if (isOutOfCredits(e?.status, falMessage)) {
      throw new Error(FAL_OUT_OF_CREDITS_MESSAGE);
    }

    if (isAuthFailure(e?.status, falMessage)) {
      throw new Error(FAL_INVALID_KEY_MESSAGE);
    }

    if (e?.status === 422) {
      log.error(
        '[generate:image] 422 ValidationError — fal detail:',
        JSON.stringify(e.body, null, 2),
        'model:',
        model,
        'input keys:',
        Object.keys(input),
        'image_urls count:',
        hasReferenceImages ? resolvedUrls.length : 0,
      );

      // Safety-filter refusals come through as 422s with a generic
      // Gemini message. Detect and surface a useful error instead of
      // the generic validation one.
      if (isSafetyBlock(falMessage)) {
        throw new Error(SAFETY_BLOCK_MESSAGE);
      }

      const details =
        (e.body as { detail?: Array<{ loc?: unknown[]; msg?: string; type?: string }> })?.detail ??
        [];
      const msg = details
        .map((d) => `${(d.loc ?? []).join('.')}: ${d.msg ?? d.type ?? 'invalid'}`)
        .join('; ');
      log.error('[generate:image] validation detail:', msg);
      throw new Error(VALIDATION_MESSAGE);
    }
    throw err;
  }
}

function handleKieImageError(err: unknown, context: Record<string, unknown>): never {
  const status = err instanceof KieApiError ? err.status : undefined;
  const code = err instanceof KieApiError ? err.code : undefined;
  const kieMessage = extractKieMessage(err);

  log.error(
    '[generate:image] KIE error — context:',
    JSON.stringify(context, null, 2),
    'status:',
    status,
    'code:',
    code,
    'message:',
    kieMessage,
    'body:',
    err instanceof KieApiError ? JSON.stringify(err.body, null, 2) : undefined,
  );

  if (kieMessage === KIE_TIMEOUT_MESSAGE) throw new Error(KIE_TIMEOUT_MESSAGE);
  if (kieMessage === KIE_UPLOAD_FAILED_MESSAGE) throw new Error(KIE_UPLOAD_FAILED_MESSAGE);
  if (isOutOfCredits(status, kieMessage, code)) throw new Error(KIE_OUT_OF_CREDITS_MESSAGE);
  if (isAuthFailure(status, kieMessage, code)) throw new Error(KIE_INVALID_KEY_MESSAGE);
  if (isRateLimited(status, kieMessage, code)) throw new Error(KIE_RATE_LIMIT_MESSAGE);
  if (isValidationFailure(status, code)) throw new Error(KIE_VALIDATION_MESSAGE);
  if (code === 501 || code === '501') throw new Error(KIE_GENERATION_FAILED_MESSAGE);

  throw new Error(KIE_GENERATION_FAILED_MESSAGE);
}

async function generateKieImage(data: GenerateImageData, requestedVariant: KieModelVariant) {
  const kieKey = getApiKey('kie') ?? process.env.KIE_API_KEY;
  if (!kieKey) {
    throw new Error(KIE_MISSING_KEY_MESSAGE);
  }

  let effectiveModel: KieEffectiveModel | null = null;
  let referenceUrls: string[] = [];
  let input: Record<string, unknown> = {};

  try {
    const hasReferenceImages =
      (data.imageUrls || []).map(resolveImageUrl).filter(isDataOrHttpUrl).length > 0;
    effectiveModel = selectKieModel(requestedVariant, hasReferenceImages);
    referenceUrls = await prepareKieReferenceUrls(
      data.imageUrls || [],
      kieKey,
      effectiveModel === 'kie_gpt4o' ? 5 : 1,
    );

    if (effectiveModel === 'kie_gpt4o') {
      input = buildKieGpt4oInput(data, referenceUrls);
      const taskId = await createKieTask(KIE_GPT4O_GENERATE_URL, kieKey, input);
      const resultUrls = await pollKieTask(
        kieKey,
        KIE_GPT4O_RECORD_URL,
        taskId,
        extractKieGpt4oResultUrls,
        [2],
        10_000,
      );
      return {
        success: true,
        resultUrls,
        modelProvider: 'kie' as const,
        modelVariant: requestedVariant,
        effectiveModelVariant: effectiveModel,
      };
    }

    input = buildKieFluxInput(data, referenceUrls, effectiveModel);
    const taskId = await createKieTask(KIE_FLUX_GENERATE_URL, kieKey, input);
    const resultUrls = await pollKieTask(
      kieKey,
      KIE_FLUX_RECORD_URL,
      taskId,
      extractKieFluxResultUrls,
      [2, 3],
      3_000,
    );
    return {
      success: true,
      resultUrls,
      modelProvider: 'kie' as const,
      modelVariant: requestedVariant,
      effectiveModelVariant: effectiveModel,
    };
  } catch (err) {
    handleKieImageError(err, {
      requestedVariant,
      effectiveModel,
      inputKeys: Object.keys(input),
      referenceCount: referenceUrls.length,
    });
  }
}

export function registerGenerateHandlers(): void {
  secureHandle('generate:image', async (_event, data: GenerateImageData) => {
    const variant = normalizeModelVariant(data.modelVariant);
    if (isKieVariant(variant)) {
      return generateKieImage(data, variant);
    }
    return generateFalImage(data, variant);
  });

  secureHandle('generate:video', async (_event, data: GenerateVideoData) => {
    const falKey = getApiKey('fal') ?? process.env.FAL_KEY;
    if (!falKey) {
      throw new Error(FAL_MISSING_KEY_MESSAGE);
    }

    const { fal } = await import('@fal-ai/client');
    fal.config({ credentials: falKey });

    const resolvedImageUrl = resolveImageUrl(data.imageUrl);
    if (!isDataOrHttpUrl(resolvedImageUrl)) {
      throw new Error("Couldn't read the source image for animation.");
    }

    const input: Record<string, unknown> = {
      prompt: data.prompt,
      image_url: resolvedImageUrl,
      aspect_ratio: mapAspectRatioToVideoRatio(data.aspectRatio),
      duration: data.durationSeconds === 10 ? '10' : '5',
    };

    try {
      const result = await fal.subscribe(VIDEO_MODEL, { input, logs: true });
      const resultData = result.data as {
        video?: { url?: string };
        video_url?: string;
      };
      const videoUrl = resultData.video?.url ?? resultData.video_url;
      if (!videoUrl) {
        throw new Error("Couldn't generate video output.");
      }
      return { success: true, videoUrl };
    } catch (err) {
      const e = err as { status?: number; body?: unknown; message?: string };
      const falMessage = extractFalMessage(e);
      log.error(
        '[generate:video] fal error — status:',
        e?.status,
        'message:',
        e?.message,
        'body:',
        JSON.stringify(e?.body, null, 2),
      );

      if (isOutOfCredits(e?.status, falMessage)) throw new Error(FAL_OUT_OF_CREDITS_MESSAGE);
      if (isAuthFailure(e?.status, falMessage)) throw new Error(FAL_INVALID_KEY_MESSAGE);
      if (e?.status === 422) throw new Error(VALIDATION_MESSAGE);
      throw err;
    }
  });
}
