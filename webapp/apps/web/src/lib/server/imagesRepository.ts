import { listPlaceholderImages } from './placeholderImages';
import type { ListImagesInput, ListImagesResult } from '../shared/images';

export interface ImagesRepository {
  list(input: ListImagesInput): Promise<ListImagesResult>;
}

export class PlaceholderImagesRepository implements ImagesRepository {
  async list(input: ListImagesInput): Promise<ListImagesResult> {
    return listPlaceholderImages(input);
  }
}

export function createImagesRepository(): ImagesRepository {
  return new PlaceholderImagesRepository();
}
