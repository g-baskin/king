import { getSupabasePublicEnv } from './env';
import { listPlaceholderImages } from './placeholderImages';
import { SupabaseImagesRepository } from './supabaseImagesRepository';
import type { CreateImageRecordInput, ListImagesInput, ListImagesResult, WebImageRecord } from '../shared/images';

export interface ImagesRepository {
  list(input: ListImagesInput): Promise<ListImagesResult>;
  create?(input: CreateImageRecordInput): Promise<WebImageRecord>;
  getById?(id: string): Promise<WebImageRecord | null>;
}

export class PlaceholderImagesRepository implements ImagesRepository {
  async list(input: ListImagesInput): Promise<ListImagesResult> {
    return listPlaceholderImages(input);
  }
}

export function createImagesRepository(): ImagesRepository {
  if (getSupabasePublicEnv()) {
    return new SupabaseImagesRepository();
  }

  return new PlaceholderImagesRepository();
}
