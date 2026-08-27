import { supabase } from '../../config/supabase';
import { Photo, PhotoRow } from './photos.types';

function mapRow(row: PhotoRow): Photo {
  // Generar URL pública desde el storage path
  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/work-order-photos/${row.storage_path}`;
  
  return {
    id: row.id,
    workOrderId: row.work_order_id,
    kind: row.kind,
    storagePath: row.storage_path,
    publicUrl,
    uploadedAt: row.uploaded_at,
  };
}

export interface IPhotoRepository {
  upload(workOrderId: string, kind: 'inicial' | 'final', fileBuffer: Buffer, fileName: string): Promise<Photo>;
  listByWorkOrder(workOrderId: string): Promise<Photo[]>;
  listByWorkOrderAndKind(workOrderId: string, kind: 'inicial' | 'final'): Promise<Photo[]>;
}

export class PhotoRepository implements IPhotoRepository {
  async upload(workOrderId: string, kind: 'inicial' | 'final', fileBuffer: Buffer, fileName: string): Promise<Photo> {
    // Generar path en storage
    const storagePath = `${workOrderId}/${kind}/${Date.now()}-${fileName}`;
    
    // Subir a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('work-order-photos')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Guardar referencia en BD
    const { data, error } = await supabase
      .from('order_photos')
      .insert({
        work_order_id: workOrderId,
        kind,
        storage_path: storagePath,
      })
      .select('id, work_order_id, kind, storage_path, uploaded_at')
      .single();

    if (error) throw error;
    return mapRow(data as PhotoRow);
  }

  async listByWorkOrder(workOrderId: string): Promise<Photo[]> {
    const { data, error } = await supabase
      .from('order_photos')
      .select('id, work_order_id, kind, storage_path, uploaded_at')
      .eq('work_order_id', workOrderId)
      .order('uploaded_at', { ascending: true });

    if (error) throw error;
    return (data as PhotoRow[]).map(mapRow);
  }

  async listByWorkOrderAndKind(workOrderId: string, kind: 'inicial' | 'final'): Promise<Photo[]> {
    const { data, error } = await supabase
      .from('order_photos')
      .select('id, work_order_id, kind, storage_path, uploaded_at')
      .eq('work_order_id', workOrderId)
      .eq('kind', kind)
      .order('uploaded_at', { ascending: true });

    if (error) throw error;
    return (data as PhotoRow[]).map(mapRow);
  }
}
