export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface BaseEntity extends BaseModel {
  isActive: boolean;
  metadata?: Record<string, any>;
}