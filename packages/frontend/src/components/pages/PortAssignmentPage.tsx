import { AlertCircle, Cable, RotateCcw, Save } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useGetClient } from '../../api/queries/client';
import {
  DI_PORT_OPTIONS,
  DO_PORT_OPTIONS,
  type DiAssignmentRowInput,
  type DiPortOption,
  type DoAssignmentRowInput,
  type DoPortOption,
  useGetPortAssignments,
  useResetPortAssignments,
  useSavePortAssignments,
} from '../../api/queries/portAssignments';
import { useUpdatePollingState } from '../../api/queries/polling';
import { useAuth } from '../../contexts/AuthContext';
import { usePollingStatus } from '../../hooks/usePollingStatus';
import { PollingDialog } from '../common/PollingDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const DEVICE_TYPE_LABELS: Record<string, string> = {
  lighting: '조명',
  bench: '온열벤치',
  door: '자동문',
  externalsw: '외부스위치',
};

type TabKind = 'do' | 'di';

const PortAssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: clientInfo } = useGetClient();
  const clientId = clientInfo?.id;

  const { data: pollingStatus } = usePollingStatus({ enabled: Boolean(clientId) });
  const updatePolling = useUpdatePollingState();

  const { data, isLoading, refetch, isFetching } = useGetPortAssignments(clientId, Boolean(clientId));
  const saveMutation = useSavePortAssignments();
  const resetMutation = useResetPortAssignments();

  const [tab, setTab] = useState<TabKind>('do');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [pollingDialog, setPollingDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });
  const [pendingOp, setPendingOp] = useState<'save' | 'reset' | null>(null);

  const pollingActive = data?.pollingActive ?? (pollingStatus?.modbusPollingActive ?? false);
  const disabled = isLoading || isFetching || saveMutation.isPending || resetMutation.isPending;

  const [doDraft, setDoDraft] = useState<Record<string, DoPortOption>>({});
  const [diDraft, setDiDraft] = useState<Record<string, DiPortOption>>({});

  const doRows = data?.doAssignments ?? [];
  const diRows = data?.diAssignments ?? [];

  const doDraftDefaults = useMemo(() => {
    const next: Record<string, DoPortOption> = {};
    for (const row of doRows) {
      if (row.doPort && DO_PORT_OPTIONS.includes(row.doPort as any)) {
        next[`${row.deviceType}:${row.unitId}`] = row.doPort as DoPortOption;
      }
    }
    return next;
  }, [doRows]);

  const diDraftDefaults = useMemo(() => {
    const next: Record<string, DiPortOption> = {};
    for (const row of diRows) {
      if (row.diPort && DI_PORT_OPTIONS.includes(row.diPort as any)) {
        next[`${row.deviceType}:${row.unitId}`] = row.diPort as DiPortOption;
      }
    }
    return next;
  }, [diRows]);

  const effectiveDoDraft = useMemo(() => ({ ...doDraftDefaults, ...doDraft }), [doDraftDefaults, doDraft]);
  const effectiveDiDraft = useMemo(() => ({ ...diDraftDefaults, ...diDraft }), [diDraftDefaults, diDraft]);

  const doSave = useCallback(async () => {
    if (!clientId) return;

    const doAssignments: DoAssignmentRowInput[] = doRows
      .map((row) => {
        const key = `${row.deviceType}:${row.unitId}`;
        const doPort = effectiveDoDraft[key];
        return doPort ? { deviceType: row.deviceType, unitId: row.unitId, doPort } : null;
      })
      .filter(Boolean) as DoAssignmentRowInput[];

    const diAssignments: DiAssignmentRowInput[] = diRows
      .map((row) => {
        const key = `${row.deviceType}:${row.unitId}`;
        const diPort = effectiveDiDraft[key];
        return diPort ? { deviceType: row.deviceType, unitId: row.unitId, diPort } : null;
      })
      .filter(Boolean) as DiAssignmentRowInput[];

    await saveMutation.mutateAsync({ clientId, doAssignments, diAssignments });
    toast.success('접점 포트 설정을 저장했습니다.');
    setDoDraft({});
    setDiDraft({});
    await refetch();
  }, [clientId, doRows, diRows, effectiveDoDraft, effectiveDiDraft, saveMutation, refetch]);

  const doReset = useCallback(async () => {
    if (!clientId) return;
    await resetMutation.mutateAsync(clientId);
    toast.success('TS 기본 매핑으로 초기화했습니다.');
    setDoDraft({});
    setDiDraft({});
    await refetch();
  }, [clientId, resetMutation, refetch]);

  const handlePollingDialogAction = useCallback(
    async (action: 'redirect' | 'stop') => {
      if (action === 'redirect') {
        setPollingDialog(prev => ({ ...prev, isOpen: false }));
        navigate('/');
        return;
      }

      try {
        await updatePolling.mutateAsync({ pollingEnabled: false });
        toast.success('폴링을 중지했습니다.');
        setPollingDialog(prev => ({ ...prev, isOpen: false }));
        await refetch();

        const op = pendingOp;
        setPendingOp(null);
        if (op === 'save') {
          await doSave();
        } else if (op === 'reset') {
          await doReset();
        }
      } catch (e) {
        toast.error(`폴링 중지 실패: ${String(e)}`);
      }
    },
    [updatePolling, refetch, navigate, pendingOp, doSave, doReset],
  );

  const handlePollingDialogClose = useCallback(() => {
    setPollingDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!clientId) return;

    if (pollingActive) {
      setPollingDialog({
        isOpen: true,
        title: '폴링 중지 필요',
        message: '접점 포트 설정을 저장하려면 폴링을 중지해야 합니다. 폴링을 OFF로 변경할까요?',
      });
      setPendingOp('save');
      return;
    }
    try {
      await doSave();
    } catch (e) {
      toast.error(`저장 실패: ${String(e)}`);
    }
  }, [clientId, pollingActive, doSave]);

  const handleReset = useCallback(async () => {
    if (!clientId) return;
    setConfirmResetOpen(false);

    if (pollingActive) {
      setPollingDialog({
        isOpen: true,
        title: '폴링 중지 필요',
        message: '접점 포트 설정을 초기화하려면 폴링을 중지해야 합니다. 폴링을 OFF로 변경할까요?',
      });
      setPendingOp('reset');
      return;
    }
    try {
      await doReset();
    } catch (e) {
      toast.error(`초기화 실패: ${String(e)}`);
    }
  }, [clientId, pollingActive, doReset]);

  const headerTitle = clientId ? `접점 포트 설정 (${clientId})` : '접점 포트 설정';

  if (!clientId) {
    return (
      <div className='space-y-4'>
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>클라이언트 정보가 없습니다. 장비 등록을 먼저 진행하세요.</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/device-registration')}>장비 등록으로 이동</Button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-4'>
          <div className='space-y-1'>
            <CardTitle className='flex items-center gap-2'>
              <Cable className='h-5 w-5' />
              {headerTitle}
            </CardTitle>
            <CardDescription>
              폴링이 실행 중이면 저장/초기화가 차단됩니다. 변경 전 폴링을 OFF로 전환하세요.
            </CardDescription>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant={pollingActive ? 'destructive' : 'secondary'}>{pollingActive ? '폴링 ON' : '폴링 OFF'}</Badge>
            <Button variant='outline' onClick={() => refetch()} disabled={disabled}>
              새로고침
            </Button>
            <Button variant='outline' onClick={() => setConfirmResetOpen(true)} disabled={disabled}>
              <RotateCcw className='mr-2 h-4 w-4' />
              TS로 초기화
            </Button>
            <Button onClick={handleSave} disabled={disabled}>
              <Save className='mr-2 h-4 w-4' />
              저장
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKind)}>
        <TabsList>
          <TabsTrigger value='do'>DO</TabsTrigger>
          <TabsTrigger value='di'>DI</TabsTrigger>
        </TabsList>

        <TabsContent value='do'>
          <Card>
            <CardHeader>
              <CardTitle>DO 할당</CardTitle>
              <CardDescription>조명/벤치/자동문/외부스위치의 DO 포트를 설정합니다.</CardDescription>
            </CardHeader>
            <CardContent className='p-0 sm:p-6 sm:pt-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-32'>장비</TableHead>
                    <TableHead className='w-28'>유닛</TableHead>
                    <TableHead className='w-40'>DO</TableHead>
                    <TableHead className='w-24'>출처</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doRows.map((row) => {
                    const key = `${row.deviceType}:${row.unitId}`;
                    const value = effectiveDoDraft[key];
                    return (
                      <TableRow key={key}>
                        <TableCell>{DEVICE_TYPE_LABELS[row.deviceType] ?? row.deviceType}</TableCell>
                        <TableCell className='font-mono'>{row.unitId}</TableCell>
                        <TableCell>
                          <Select
                            value={value}
                            onValueChange={(v) =>
                              setDoDraft((prev) => ({ ...prev, [key]: v as DoPortOption }))
                            }
                            disabled={disabled}
                          >
                            <SelectTrigger className='w-40'>
                              <SelectValue placeholder='선택' />
                            </SelectTrigger>
                            <SelectContent>
                              {DO_PORT_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{row.source}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='di'>
          <Card>
            <CardHeader>
              <CardTitle>DI 할당</CardTitle>
              <CardDescription>외부스위치의 DI 포트를 설정합니다.</CardDescription>
            </CardHeader>
            <CardContent className='p-0 sm:p-6 sm:pt-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-32'>장비</TableHead>
                    <TableHead className='w-28'>유닛</TableHead>
                    <TableHead className='w-40'>DI</TableHead>
                    <TableHead className='w-24'>출처</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diRows.map((row) => {
                    const key = `${row.deviceType}:${row.unitId}`;
                    const value = effectiveDiDraft[key];
                    return (
                      <TableRow key={key}>
                        <TableCell>{DEVICE_TYPE_LABELS[row.deviceType] ?? row.deviceType}</TableCell>
                        <TableCell className='font-mono'>{row.unitId}</TableCell>
                        <TableCell>
                          <Select
                            value={value}
                            onValueChange={(v) =>
                              setDiDraft((prev) => ({ ...prev, [key]: v as DiPortOption }))
                            }
                            disabled={disabled}
                          >
                            <SelectTrigger className='w-40'>
                              <SelectValue placeholder='선택' />
                            </SelectTrigger>
                            <SelectContent>
                              {DI_PORT_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{row.source}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PollingDialog
        isOpen={pollingDialog.isOpen}
        title={pollingDialog.title}
        message={pollingDialog.message}
        onAction={handlePollingDialogAction}
        onClose={handlePollingDialogClose}
      />

      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>TS 기본 매핑으로 초기화</AlertDialogTitle>
            <AlertDialogDescription>
              DB에 저장된 접점 포트 할당을 모두 삭제하고 TS 기본 매핑으로 되돌립니다. 계속할까요?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>초기화</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PortAssignmentPage;

