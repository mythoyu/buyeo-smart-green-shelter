import mongoose from 'mongoose';

import LogSchema, { LogDocument } from './schemas/LogSchema';

export const LogModel = mongoose.model<LogDocument>('Log', LogSchema, 'logs');
