import { NotFoundError } from '../../shared/errors/app-error';
import { IActivityRepository } from './activities.repository';
import { Activity, CreateActivityInput } from './activities.types';

export class ActivityService {
  constructor(private readonly repository: IActivityRepository) {}

  async create(workOrderId: string, technicianId: string, input: CreateActivityInput): Promise<Activity> {
    // Validar que la orden existe (será validado en controller via WorkOrder existence)
    return this.repository.create(workOrderId, technicianId, input);
  }

  async listByWorkOrder(workOrderId: string): Promise<Activity[]> {
    return this.repository.listByWorkOrder(workOrderId);
  }
}
