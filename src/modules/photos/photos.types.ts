import { z } from 'zod';

export interface Photo {
  id: string;
  workOrderId: string;
  kind: 'inicial' | 'final';
  storagePath: string;
  publicUrl: string;
  uploadedAt: string;
}

export interface PhotoRow {
  id: string;
  work_order_id: string;
  kind: 'inicial' | 'final';
  storage_path: string;
  uploaded_at: string;
}

export const uploadPhotoSchema = z.object({
  kind: z.enum(['inicial', 'final'] as const).describe('Tipo de foto: inicial o final'),
  file: z.instanceof(Buffer).describe('Archivo binario de la foto'),
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;
