import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';
import { IPhotoRepository } from './photos.repository';
import { Photo } from './photos.types';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class PhotoService {
  constructor(private readonly repository: IPhotoRepository) {}

  async upload(
    workOrderId: string,
    kind: 'inicial' | 'final',
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<Photo> {
    // Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestError(
        `Tipo de archivo no permitido. Solo se aceptan: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    // Validar tamaño
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new BadRequestError(`El archivo excede el tamaño máximo de 10MB`);
    }

    // Validar que la orden existe (será validado en controller)
    return this.repository.upload(workOrderId, kind, fileBuffer, fileName);
  }

  async listByWorkOrder(workOrderId: string): Promise<Photo[]> {
    return this.repository.listByWorkOrder(workOrderId);
  }

  async getInitialPhoto(workOrderId: string): Promise<Photo | null> {
    const photos = await this.repository.listByWorkOrderAndKind(workOrderId, 'inicial');
    return photos.length > 0 ? photos[0] : null;
  }

  async getFinalPhoto(workOrderId: string): Promise<Photo | null> {
    const photos = await this.repository.listByWorkOrderAndKind(workOrderId, 'final');
    return photos.length > 0 ? photos[0] : null;
  }
}
