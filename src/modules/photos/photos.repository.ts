import { supabase } from '../../config/supabase';
import { getCurrentTenantId, requireCurrentTenantId } from '../../shared/context/tenant-context';
import { BadRequestError } from '../../shared/errors/app-error';
import { Photo, PhotoRow } from './photos.types';

function mapRow(row: PhotoRow): Photo {
  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/work-order-photos/${row.storage_path}`;
  
  return {
    id: row.id,
    workOrderId: row.work_order_id,
    kind: row.kind,
    storagePath: row.storage_path,
    publicUrl,
    uploadedAt: row.created_at,
  };
}

export interface IPhotoRepository {
  upload(workOrderId: string, kind: 'inicial' | 'final', fileBuffer: Buffer, fileName: string): Promise<Photo>;
  listByWorkOrder(workOrderId: string): Promise<Photo[]>;
  listByWorkOrderAndKind(workOrderId: string, kind: 'inicial' | 'final'): Promise<Photo[]>;
}

export class PhotoRepository implements IPhotoRepository {
  async upload(workOrderId: string, kind: 'inicial' | 'final', fileBuffer: Buffer, fileName: string): Promise<Photo> {
    const tenantId = requireCurrentTenantId();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${tenantId}/${workOrderId}/${kind}/${Date.now()}-${safeFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('work-order-photos')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestError(`No se pudo subir la foto: ${uploadError.message}`);
    }

    const { data, error } = await supabase
      .from('order_photos')
      .insert({
        tenant_id: tenantId,
        work_order_id: workOrderId,
        kind,
        storage_path: storagePath,
      })
      .select('id, work_order_id, kind, storage_path, created_at')
      .single();

    if (error) throw error;
    return mapRow(data as PhotoRow);
  }

  async listByWorkOrder(workOrderId: string): Promise<Photo[]> {
    const tenantId = getCurrentTenantId();
    let query = supabase
      .from('order_photos')
      .select('id, work_order_id, kind, storage_path, created_at')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });
    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query;
    if (error) throw error;
    return (data as PhotoRow[]).map(mapRow);
  }

  async listByWorkOrderAndKind(workOrderId: string, kind: 'inicial' | 'final'): Promise<Photo[]> {
    const tenantId = getCurrentTenantId();
    let query = supabase
      .from('order_photos')
      .select('id, work_order_id, kind, storage_path, created_at')
      .eq('work_order_id', workOrderId)
      .eq('kind', kind)
      .order('created_at', { ascending: true });
    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query;
    if (error) throw error;
    return (data as PhotoRow[]).map(mapRow);
  }
}
