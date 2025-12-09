import { Layers } from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';

interface ServicesStatusCardProps {
  data?: {
    deviceDomain: Record<string, { available: boolean; status: string }>;
    systemDomain: Record<string, { available: boolean; status: string }>;
    userDomain: Record<string, { available: boolean; status: string }>;
    timestamp: string;
  };
}

const ServicesStatusCard: React.FC<ServicesStatusCardProps> = ({ data }) => {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Layers className='h-5 w-5' />
            서비스 상태
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

  const getStatusVariant = (available: boolean) => {
    return available ? 'default' : 'destructive';
  };

  const getStatusText = (available: boolean) => {
    return available ? '정상' : '중단';
  };

  const getDomainStatus = (domain: Record<string, { available: boolean; status: string }>) => {
    const services = Object.values(domain);
    const availableServices = services.filter(service => service.available);
    const totalServices = services.length;
    const availableCount = availableServices.length;

    return {
      available: availableCount,
      total: totalServices,
      percentage: Math.round((availableCount / totalServices) * 100),
      healthy: availableCount === totalServices,
    };
  };

  const deviceStatus = getDomainStatus(data.deviceDomain);
  const systemStatus = getDomainStatus(data.systemDomain);
  const userStatus = getDomainStatus(data.userDomain);

  const overallHealthy = deviceStatus.healthy && systemStatus.healthy && userStatus.healthy;

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Layers className='h-5 w-5' />
          서비스 상태
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {/* 전체 상태 */}
          <div className='flex justify-between items-center'>
            <span className='text-sm font-medium'>전체 상태</span>
            <Badge variant={overallHealthy ? 'default' : 'destructive'}>
              {overallHealthy ? '모든 서비스 정상' : '일부 서비스 문제'}
            </Badge>
          </div>

          {/* Device 도메인 */}
          <Collapsible>
            <CollapsibleTrigger className='flex justify-between items-center w-full p-2 hover:bg-gray-50 rounded'>
              <div className='flex items-center gap-2'>
                <Badge variant={deviceStatus.healthy ? 'default' : 'destructive'} className='text-xs'>
                  {deviceStatus.available}/{deviceStatus.total}
                </Badge>
                <span className='text-sm font-medium'>Device 도메인</span>
              </div>
              <span className='text-xs text-muted-foreground'>{deviceStatus.percentage}% 정상</span>
            </CollapsibleTrigger>
            <CollapsibleContent className='pl-4 space-y-1'>
              {Object.entries(data.deviceDomain).map(([serviceName, service]) => (
                <div key={serviceName} className='flex justify-between items-center text-xs'>
                  <span className='capitalize'>{serviceName.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <Badge variant={getStatusVariant(service.available)} className='text-xs'>
                    {getStatusText(service.available)}
                  </Badge>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* System 도메인 */}
          <Collapsible>
            <CollapsibleTrigger className='flex justify-between items-center w-full p-2 hover:bg-gray-50 rounded'>
              <div className='flex items-center gap-2'>
                <Badge variant={systemStatus.healthy ? 'default' : 'destructive'} className='text-xs'>
                  {systemStatus.available}/{systemStatus.total}
                </Badge>
                <span className='text-sm font-medium'>System 도메인</span>
              </div>
              <span className='text-xs text-muted-foreground'>{systemStatus.percentage}% 정상</span>
            </CollapsibleTrigger>
            <CollapsibleContent className='pl-4 space-y-1'>
              {Object.entries(data.systemDomain).map(([serviceName, service]) => (
                <div key={serviceName} className='flex justify-between items-center text-xs'>
                  <span className='capitalize'>{serviceName.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <Badge variant={getStatusVariant(service.available)} className='text-xs'>
                    {getStatusText(service.available)}
                  </Badge>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* User 도메인 */}
          <Collapsible>
            <CollapsibleTrigger className='flex justify-between items-center w-full p-2 hover:bg-gray-50 rounded'>
              <div className='flex items-center gap-2'>
                <Badge variant={userStatus.healthy ? 'default' : 'destructive'} className='text-xs'>
                  {userStatus.available}/{userStatus.total}
                </Badge>
                <span className='text-sm font-medium'>User 도메인</span>
              </div>
              <span className='text-xs text-muted-foreground'>{userStatus.percentage}% 정상</span>
            </CollapsibleTrigger>
            <CollapsibleContent className='pl-4 space-y-1'>
              {Object.entries(data.userDomain).map(([serviceName, service]) => (
                <div key={serviceName} className='flex justify-between items-center text-xs'>
                  <span className='capitalize'>{serviceName.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <Badge variant={getStatusVariant(service.available)} className='text-xs'>
                    {getStatusText(service.available)}
                  </Badge>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* 요약 */}
          <div className='pt-2 border-t'>
            <div className='text-xs text-muted-foreground'>
              총 {deviceStatus.total + systemStatus.total + userStatus.total}개 서비스 중{' '}
              {deviceStatus.available + systemStatus.available + userStatus.available}개 정상
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServicesStatusCard;
