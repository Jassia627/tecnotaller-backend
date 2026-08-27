import { IInventoryRepository, LowStockItem } from './inventory.repository';

export class InventoryService {
  constructor(private readonly repository: IInventoryRepository) {}

  async getLowStock(
    threshold: number,
    type: string,
  ): Promise<{ products: LowStockItem[]; parts: LowStockItem[]; total: number }> {
    let products: LowStockItem[] = [];
    let parts: LowStockItem[] = [];

    if (type === 'products' || type === 'all') {
      products = await this.repository.findLowStockProducts(threshold);
    }

    if (type === 'parts' || type === 'all') {
      parts = await this.repository.findLowStockParts(threshold);
    }

    return {
      products,
      parts,
      total: products.length + parts.length,
    };
  }
}
