import { Schema, model, Document } from 'mongoose';

export interface ISnapshot extends Document {
  id: string;
  name: string;
  type: 'system' | 'data';
  description?: string;
  createdAt: Date;
  createdBy: string;
  data: any;
  size: number;
  clientId?: string;
  clientName?: string;
  clientDescription?: string;
}

const SnapshotSchema = new Schema<ISnapshot>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['system', 'data'],
      required: true,
    },
    description: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    clientId: {
      type: String,
    },
    clientName: {
      type: String,
    },
    clientDescription: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// 인덱스 생성
SnapshotSchema.index({ type: 1, createdAt: -1 });
SnapshotSchema.index({ id: 1 });

export default model<ISnapshot>('Snapshot', SnapshotSchema);
