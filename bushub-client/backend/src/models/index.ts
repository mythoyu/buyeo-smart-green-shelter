// Mongoose 스키마들
export { User, IUser } from './schemas/UserSchema';
export { ApiKey, IApiKey } from './schemas/ApiKeySchema';
export { System, ISystem } from './schemas/SystemSchema';
export { Client, IClient } from './schemas/ClientSchema';
export { Device, IDevice } from './schemas/DeviceSchema';
export { Unit, IUnit } from './schemas/UnitSchema';

export { CommandLog, ICommandLog } from './schemas/CommandLogSchema';
export { DdcConfig, IDdcConfig } from './schemas/DdcConfigSchema';

// 기존 모델들 (호환성을 위해 유지)
export { ClientModel, Client as ClientInterface } from './Client';
export { DeviceModel, Device as DeviceInterface } from './Device';
