import { Cpu } from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';

// 하드웨어 상태 관련 상수들
const HARDWARE_STATUS_TEXT = {
  ALL_NORMAL: '모든 하드웨어 정상',
  PARTIAL_ISSUE: '일부 하드웨어 문제',
  CONNECTED: '연결됨',
  DISCONNECTED: '연결안됨',
  NORMAL: '정상',
  STOPPED: '중단',
  MOCK: 'Mock',
  REAL: 'Real',
  UNKNOWN: '알 수 없음',
} as const;

const getServiceDisplayName = (serviceName: string): string => {
  return serviceName
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

interface HardwareStatusCardProps {
  data?: {
    ddc: {
      connected: boolean;
      services: Record<string, any>;
      summary: string;
      error?: string;
      timestamp: string;
    };
    modbus: {
      isConnected: boolean;
      connectionStatus: any;
      serviceStatus: any;
      error?: string;
      timestamp: string;
    };
    timestamp: string;
  };
}

const HardwareStatusCard: React.FC<HardwareStatusCardProps> = ({ data }) => {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Cpu className='h-5 w-5' />
            하드웨어 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center h-20'>
            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600'></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusVariant = (connected: boolean) => {
    return connected ? 'default' : 'destructive';
  };

  const getStatusText = (connected: boolean) => {
    return connected ? HARDWARE_STATUS_TEXT.CONNECTED : HARDWARE_STATUS_TEXT.DISCONNECTED;
  };

  const overallConnected = data.ddc.connected && data.modbus.isConnected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Cpu className='h-5 w-5' />
          하드웨어 상태
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {/* 전체 상태 */}
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>전체 상태</span>
            <Badge variant={getStatusVariant(overallConnected)}>
              {overallConnected ? HARDWARE_STATUS_TEXT.ALL_NORMAL : HARDWARE_STATUS_TEXT.PARTIAL_ISSUE}
            </Badge>
          </div>

          {/* DDC 상태 */}
          <Collapsible>
            <CollapsibleTrigger className='flex justify-between items-center w-full p-2 hover:bg-gray-50 rounded'>
              <div className='flex items-center gap-2'>
                <Badge variant={getStatusVariant(data.ddc.connected)} className='text-xs'>
                  {data.ddc.connected ? '연결' : '연결안됨'}
                </Badge>
                <span className='text-sm font-medium'>DDC</span>
              </div>
              <span className='text-xs text-muted-foreground'>{data.ddc.summary}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className='pl-4 space-y-2'>
              {/* DDC 서비스 상태 */}
              {Object.entries(data.ddc.services).map(([serviceName, service]: [string, any]) => (
                <div key={serviceName} className='flex justify-between items-center text-xs'>
                  <span className='capitalize'>{getServiceDisplayName(serviceName)}</span>
                  <Badge variant={service.status === 'active' ? 'default' : 'destructive'} className='text-xs'>
                    {service.status === 'active' ? HARDWARE_STATUS_TEXT.NORMAL : HARDWARE_STATUS_TEXT.STOPPED}
                  </Badge>
                </div>
              ))}

              {/* DDC 에러 */}
              {data.ddc.error && (
                <div className='p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700'>
                  <div className='font-medium'>오류:</div>
                  <div>{data.ddc.error}</div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Modbus 상태 */}
          <Collapsible>
            <CollapsibleTrigger className='flex justify-between items-center w-full p-2 hover:bg-gray-50 rounded'>
              <div className='flex items-center gap-2'>
                <Badge variant={getStatusVariant(data.modbus.isConnected)} className='text-xs'>
                  {data.modbus.isConnected ? '연결' : '연결안됨'}
                </Badge>
                <span className='text-sm font-medium'>Modbus</span>
              </div>
              <span className='text-xs text-muted-foreground'>
                {data.modbus.serviceStatus?.activeService || HARDWARE_STATUS_TEXT.UNKNOWN}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className='pl-4 space-y-2'>
              {/* Modbus 연결 상태 */}
              <div className='space-y-1'>
                <div className='flex justify-between text-xs'>
                  <span>연결 상태</span>
                  <span>
                    {data.modbus.connectionStatus?.isConnected
                      ? HARDWARE_STATUS_TEXT.CONNECTED
                      : HARDWARE_STATUS_TEXT.DISCONNECTED}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span>재시도 횟수</span>
                  <span>{data.modbus.connectionStatus?.retryCount || 0}</span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span>최대 재시도</span>
                  <span>{data.modbus.connectionStatus?.maxRetries || 0}</span>
                </div>
              </div>

              {/* Modbus 서비스 상태 */}
              <div className='space-y-1'>
                <div className='flex justify-between text-xs'>
                  <span>모드</span>
                  <span>
                    {data.modbus.serviceStatus?.mockMode ? HARDWARE_STATUS_TEXT.MOCK : HARDWARE_STATUS_TEXT.REAL}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span>활성 서비스</span>
                  <span>{data.modbus.serviceStatus?.activeService || HARDWARE_STATUS_TEXT.UNKNOWN}</span>
                </div>
              </div>

              {/* Modbus 에러 */}
              {data.modbus.error && (
                <div className='p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700'>
                  <div className='font-medium'>오류:</div>
                  <div>{data.modbus.error}</div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* 요약 */}
          <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
            <div className='text-xs text-muted-foreground'>
              DDC: {data.ddc.connected ? HARDWARE_STATUS_TEXT.CONNECTED : HARDWARE_STATUS_TEXT.DISCONNECTED} | Modbus:{' '}
              {data.modbus.isConnected ? HARDWARE_STATUS_TEXT.CONNECTED : HARDWARE_STATUS_TEXT.DISCONNECTED}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HardwareStatusCard;
