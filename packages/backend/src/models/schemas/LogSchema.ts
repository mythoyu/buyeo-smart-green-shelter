import { Schema, Document } from 'mongoose';

import { UnitValue } from '../../types';

export interface LogDocument extends Document {
  timestamp: Date;
  level: string;
  message: string;
  meta?: Record<string, UnitValue>;
}

const LogSchema = new Schema<LogDocument>({
  timestamp: { type: Date, default: Date.now },
  level: { type: String, required: true },
  message: { type: String, required: true },
  meta: { type: Schema.Types.Mixed },
});

export default LogSchema;
