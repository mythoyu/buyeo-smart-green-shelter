import { useState } from 'react';
import { Wifi, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';

import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { usePingTest } from '../../../api/queries/system';
import { toast } from 'sonner';

interface PingTestResult {
  ip: string;
  success: boolean;
  responseTime: number;
  packetLoss: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
  packetsTransmitted: number;
  packetsReceived: number;
  rawOutput: string;
  timestamp: string;
}

const PingTestCard: React.FC = () => {
  const [ip, setIp] = useState('8.8.8.8');
  const [pingResult, setPingResult] = useState<PingTestResult | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  const pingTest = usePingTest();

  const handlePing = async () => {
    if (!ip.trim()) {
      toast.error('IP 주소를 입력해주세요.');
      return;
    }

    // IP 주소 형식 검증
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip.trim())) {
      toast.error('유효하지 않은 IP 주소 형식입니다.');
      return;
    }

    setIsPinging(true);
    try {
      const result = await pingTest.mutateAsync({ ip: ip.trim() });

      if (result.success && result.data) {
        setPingResult(result.data);
        toast.success('Ping 테스트가 완료되었습니다.');
      } else {
        toast.error(result.error?.message || 'Ping 테스트 실패');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Ping 테스트 중 오류가 발생했습니다.');
    } finally {
      setIsPinging(false);
    }
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className='h-4 w-4 text-green-600' /> : <XCircle className='h-4 w-4 text-red-600' />;
  };

  const getPacketLossColor = (loss: number) => {
    if (loss === 0) return 'text-green-600';
    if (loss < 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getResponseTimeColor = (time: number) => {
    if (time < 50) return 'text-green-600';
    if (time < 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Wifi className='h-5 w-5' />
          Ping 테스트
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {/* IP 입력 */}
          <div className='space-y-3'>
            <Label htmlFor='ping-ip' className='text-sm font-medium'>
              대상 IP 주소
            </Label>
            <Input
              id='ping-ip'
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder='8.8.8.8'
              className='w-full'
            />
            <Button onClick={handlePing} disabled={isPinging} className='w-full' size='sm'>
              {isPinging ? (
                <>
                  <Clock className='h-4 w-4 animate-spin mr-2' />
                  테스트 중...
                </>
              ) : (
                <>
                  <Activity className='h-4 w-4 mr-2' />
                  Ping 테스트
                </>
              )}
            </Button>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              IPv4 주소만 지원됩니다 (예: 8.8.8.8, 1.1.1.1, 192.168.1.1)
              <br />
              1개의 패킷을 전송하여 연결 상태를 확인합니다
            </p>
          </div>

          {/* Ping 테스트 결과 */}
          {pingResult && (
            <div
              className={`rounded-lg p-4 space-y-4 ${
                pingResult.success
                  ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <div className='flex items-center gap-2'>
                {getStatusIcon(pingResult.success)}
                <span
                  className={`text-sm font-medium ${
                    pingResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  Ping 테스트 결과
                </span>
              </div>

              {/* 기본 통계 */}
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div className='space-y-1'>
                  <span className='text-muted-foreground'>연결 상태</span>
                  <div>
                    <Badge variant={pingResult.success ? 'default' : 'destructive'} className='text-xs'>
                      {pingResult.success ? '연결됨' : '연결 실패'}
                    </Badge>
                  </div>
                </div>
                <div className='space-y-1'>
                  <span className='text-muted-foreground'>패킷 손실률</span>
                  <div className={`font-medium ${getPacketLossColor(pingResult.packetLoss)}`}>
                    {pingResult.packetLoss}%
                  </div>
                </div>
              </div>

              {/* 응답 시간 통계 */}
              <div className='grid grid-cols-3 gap-4 text-sm'>
                <div className='space-y-1'>
                  <span className='text-muted-foreground'>최소 시간</span>
                  <div className={`font-medium ${getResponseTimeColor(pingResult.minTime)}`}>
                    {pingResult.minTime.toFixed(1)}ms
                  </div>
                </div>
                <div className='space-y-1'>
                  <span className='text-muted-foreground'>평균 시간</span>
                  <div className={`font-medium ${getResponseTimeColor(pingResult.avgTime)}`}>
                    {pingResult.avgTime.toFixed(1)}ms
                  </div>
                </div>
                <div className='space-y-1'>
                  <span className='text-muted-foreground'>최대 시간</span>
                  <div className={`font-medium ${getResponseTimeColor(pingResult.maxTime)}`}>
                    {pingResult.maxTime.toFixed(1)}ms
                  </div>
                </div>
              </div>

              {/* 패킷 통계 */}
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div className='space-y-1'>
                  <span className='text-muted-foreground'>전송 패킷</span>
                  <div className='font-medium'>{pingResult.packetsTransmitted}개</div>
                </div>
                <div className='space-y-1'>
                  <span className='text-muted-foreground'>수신 패킷</span>
                  <div className='font-medium'>{pingResult.packetsReceived}개</div>
                </div>
              </div>

              <div className='space-y-1'>
                <span className='text-sm text-muted-foreground'>대상 IP</span>
                <div className='text-sm font-mono bg-muted/50 p-2 rounded'>{pingResult.ip}</div>
              </div>

              {/* 원시 출력 표시 */}
              <div className='space-y-2'>
                <Label className='text-sm font-medium'>원시 출력</Label>
                <Textarea
                  value={pingResult.rawOutput}
                  readOnly
                  className='min-h-[120px] text-xs font-mono bg-muted/30 border-muted-foreground/20'
                  placeholder='Ping 명령어 출력이 여기에 표시됩니다...'
                />
              </div>

              <div className='text-xs text-muted-foreground border-t border-gray-200 dark:border-gray-700 pt-2'>
                테스트 시간: {new Date(pingResult.timestamp).toLocaleString('ko-KR')}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PingTestCard;
