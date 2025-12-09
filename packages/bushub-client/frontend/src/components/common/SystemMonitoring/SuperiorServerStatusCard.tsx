import { useState } from 'react';
import { Server, CheckCircle, XCircle, Clock } from 'lucide-react';

import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { useCheckExternalServer } from '../../../api/queries/system';
import { toast } from 'sonner';

interface ExternalCheckResult {
  url: string;
  status: number;
  responseTime: number;
  data?: any;
  error?: string;
  timestamp: string;
}

const SuperiorServerStatusCard: React.FC = () => {
  const [url, setUrl] = useState('http://10.20.60.145:9202/api/v1/ping');
  const [checkResult, setCheckResult] = useState<ExternalCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkExternalServer = useCheckExternalServer();

  const handleCheck = async () => {
    if (!url.trim()) {
      toast.error('URL을 입력해주세요.');
      return;
    }

    // URL에 프로토콜이 없으면 http:// 추가
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `http://${finalUrl}`;
    }

    // localhost를 127.0.0.1로 변환 (Node.js fetch 호환성)
    finalUrl = finalUrl.replace(/^http:\/\/localhost:/, 'http://127.0.0.1:');
    finalUrl = finalUrl.replace(/^https:\/\/localhost:/, 'https://127.0.0.1:');

    setIsChecking(true);
    try {
      const result = await checkExternalServer.mutateAsync({ url: finalUrl });

      if (result.success && result.data) {
        setCheckResult(result.data);
        toast.success('외부 서버 상태 확인 성공');
      } else if (result.error && result.data) {
        // 실패 응답 표시 (데이터가 있을 때만)
        setCheckResult({
          url: result.data.url,
          status: result.data.status,
          responseTime: result.data.responseTime,
          error: result.error.message,
          timestamp: result.data.timestamp,
        });
        toast.error(result.error.message || '외부 서버 상태 확인 실패');
      } else {
        // 데이터가 없으면 토스트만 표시하고 UI는 숨김
        setCheckResult(null);
        toast.error(result.error?.message || '외부 서버 상태 확인 실패');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '외부 서버 상태 확인 중 오류가 발생했습니다.');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusText = (status: number) => {
    if (status >= 200 && status < 300) return '연결됨';
    if (status >= 400) return '오류';
    return '연결 실패';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Server className='h-5 w-5' />
          외부 서버 상태 확인
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {/* URL 입력 */}
          <div className='space-y-3'>
            <Label htmlFor='external-url' className='text-sm font-medium'>
              서버 URL
            </Label>
            <Input
              id='external-url'
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder='http://10.20.60.145:9202/api/v1/ping'
              className='w-full'
            />
            <Button onClick={handleCheck} disabled={isChecking} className='w-full' size='sm'>
              {isChecking ? (
                <>
                  <Clock className='h-4 w-4 animate-spin mr-2' />
                  확인 중...
                </>
              ) : (
                '상태 확인'
              )}
            </Button>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              HTTP/HTTPS 프로토콜만 허용됩니다
              <br />
              (예: 10.20.60.145, localhost:3000, httpbin.org)
            </p>
          </div>

          {/* 수동 확인 결과 */}
          {checkResult && (
            <div
              className={`rounded-lg p-4 space-y-4 ${
                checkResult.status >= 200 && checkResult.status < 300
                  ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <div className='flex items-center gap-2'>
                {checkResult.status >= 200 && checkResult.status < 300 ? (
                  <CheckCircle className='h-4 w-4 text-green-600' />
                ) : (
                  <XCircle className='h-4 w-4 text-red-600' />
                )}
                <span
                  className={`text-sm font-medium ${
                    checkResult.status >= 200 && checkResult.status < 300
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  확인결과
                </span>
              </div>

              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div className='space-y-1'>
                  <span className='text-muted-foreground'>상태 코드</span>
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        checkResult.status >= 200 && checkResult.status < 300
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {checkResult.status} - {getStatusText(checkResult.status)}
                    </span>
                  </div>
                </div>
                <div className='space-y-1'>
                  <span className='text-muted-foreground'>응답시간</span>
                  <div className='font-medium'>{checkResult.responseTime}ms</div>
                </div>
              </div>

              <div className='space-y-1'>
                <span className='text-sm text-muted-foreground'>요청 URL</span>
                <div className='text-sm font-mono bg-muted/50 p-2 rounded break-all'>{checkResult.url}</div>
              </div>

              {/* 응답 데이터 표시 (데이터가 있을 때만) */}
              {checkResult.data && (
                <div className='space-y-2'>
                  <Label className='text-sm font-medium'>응답 데이터</Label>
                  <Textarea
                    value={JSON.stringify(checkResult.data, null, 2)}
                    readOnly
                    className='min-h-[120px] text-xs font-mono bg-muted/30 border-muted-foreground/20'
                    placeholder='응답 데이터가 여기에 표시됩니다...'
                  />
                </div>
              )}

              <div className='text-xs text-muted-foreground border-t pt-2'>
                확인시간: {new Date(checkResult.timestamp).toLocaleString('ko-KR')}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SuperiorServerStatusCard;
