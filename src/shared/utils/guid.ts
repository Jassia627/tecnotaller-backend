export interface GuidGenerator {
  generate(): string;
}

export class GuidGeneratorImpl implements GuidGenerator {
  generate(): string {
    return crypto.randomUUID();
  }
}

export const guidGenerator: GuidGenerator = new GuidGeneratorImpl();
