import { Building, Save } from 'lucide-react';
import React, { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui';

import DeviceUnitContent from './DeviceUnitContent';

interface DeviceUnitDialogProps {
  selectedClient: any;
  handleSave: (payload?: boolean | { id: string; initialize: boolean }) => Promise<void>;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  getGroupedDevices: (client: any) => any;
  isClientRegistered?: boolean | null | undefined;
  isDifferentClient?: boolean | null | undefined;
  onSuccess?: () => void;
}

const DeviceUnitDialog: React.FC<DeviceUnitDialogProps> = ({
  selectedClient,
  handleSave,
  isSaving,
  onOpenChange,
  getGroupedDevices,
  isClientRegistered = false,
  isDifferentClient = false,
  onSuccess,
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 클라이언트 상태에 따른 버튼 텍스트 동적 변경
  const getButtonText = () => {
    if (isClientRegistered) return '클라이언트 재설정';
    if (isDifferentClient) return '새 클라이언트 등록';
    return '클라이언트 등록';
  };

  // 클라이언트 상태에 따른 다이얼로그 제목 동적 변경
  const getDialogTitle = () => {
    if (isClientRegistered) return '클라이언트 재설정';
    if (isDifferentClient) return '새 클라이언트 등록';
    return '클라이언트 등록';
  };

  // 클라이언트 상태에 따른 다이얼로그 설명 동적 변경
  const getDialogDescription = () => {
    if (isClientRegistered) return '현재 클라이언트 설정을 유지하시겠습니까? 또는 재설정하시겠습니까?';
    if (isDifferentClient) return '새로운 클라이언트를 등록하시겠습니까? 기존 클라이언트 설정이 변경됩니다.';
    return '새로운 클라이언트를 등록하시겠습니까?';
  };

  // 새 클라이언트 등록 시 단순한 확인 다이얼로그 표시
  const handleSaveAndNavigate = async () => {
    try {
      // 모든 경우에 확인 다이얼로그 표시
      setShowConfirmDialog(true);
    } catch (error) {
      console.error('등록 중 오류 발생:', error);
    }
  };

  // 설정 유지 처리 (아무것도 하지 않음)
  const handleKeepSettings = async () => {
    try {
      // 설정 유지: id와 initialize=false 전달
      if (selectedClient?.id) {
        await handleSave({ id: selectedClient.id, initialize: false });
      }
      setShowConfirmDialog(false);
      if (onSuccess) {
        onSuccess(); // 성공 시 콜백 호출
      }
    } catch (error) {
      console.error('설정 유지 중 오류 발생:', error);
    }
  };

  // 새 클라이언트 등록 시 단순한 저장 처리
  const handleSimpleSave = async () => {
    try {
      // 새 등록: id와 initialize=true 전달
      if (selectedClient?.id) {
        await handleSave({ id: selectedClient.id, initialize: true });
      }
      if (onSuccess) {
        onSuccess(); // 성공 시 콜백 호출
      }
    } catch (error) {
      console.error('등록 중 오류 발생:', error);
    } finally {
      setShowConfirmDialog(false);
    }
  };

  const handleConfirmSave = async (initializeHardware: boolean) => {
    try {
      // 재설정: id와 initialize 플래그 전달
      if (selectedClient?.id) {
        await handleSave({ id: selectedClient.id, initialize: initializeHardware });
      }
      if (onSuccess) {
        onSuccess(); // 성공 시 콜백 호출
      }
    } catch (error) {
      console.error('등록 중 오류 발생:', error);
      // 오류 발생 시 현재 페이지 유지
    } finally {
      setShowConfirmDialog(false);
    }
  };

  return (
    <Dialog open={!!selectedClient} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='max-w-none !max-w-none w-[90vw] max-h-[90vh] sm:w-[80vw] sm:max-h-[80vh] !p-6 !sm:max-w-none !lg:max-w-none !xl:max-w-none !2xl:max-w-none flex flex-col'
      >
        {selectedClient && (
          <>
            <DialogHeader className='flex-shrink-0 pb-4 border-b border-border/30'>
              <div className='flex justify-between items-center w-full'>
                <DialogTitle>
                  <div className='flex flex-col items-start'>
                    <div className='flex items-center gap-3'>
                      <Building className='h-6 w-6 text-primary' />
                      <span className='text-xl font-bold'>장비/유닛 설정</span>
                    </div>
                    <p className='text-sm text-muted-foreground mt-1'>{selectedClient.name}</p>
                  </div>
                </DialogTitle>
                <Button onClick={handleSaveAndNavigate} disabled={isSaving} className='flex items-center gap-2'>
                  {isSaving ? (
                    <>
                      <div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin' />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className='w-4 h-4' />
                      {getButtonText()}
                    </>
                  )}
                </Button>
              </div>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 max-h-[calc(80vh-120px)]  scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
              <DeviceUnitContent selectedClient={selectedClient} getGroupedDevices={getGroupedDevices} />
            </div>
          </>
        )}
      </DialogContent>

      {/* 확인 다이얼로그 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getDialogTitle()}</AlertDialogTitle>
            <AlertDialogDescription>{getDialogDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='flex justify-start items-center gap-4'>
            {isClientRegistered ? (
              // 같은 클라이언트 선택 시: 설정 유지 또는 재설정
              <>
                <div className='flex flex-1 gap-2'>
                  <AlertDialogAction
                    onClick={handleKeepSettings}
                    className='bg-green-500 text-white hover:bg-green-600'
                  >
                    설정 유지
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => handleConfirmSave(true)}
                    className='bg-primary text-primary-foreground hover:bg-primary/90'
                    disabled={!selectedClient?.id || isSaving}
                  >
                    재설정
                  </AlertDialogAction>
                </div>
                <AlertDialogCancel>아니오</AlertDialogCancel>
              </>
            ) : (
              // 새 클라이언트 등록 시: 단순한 예/아니오
              <>
                <AlertDialogAction
                  onClick={handleSimpleSave}
                  className='bg-primary text-primary-foreground hover:bg-primary/90 flex-1'
                  disabled={!selectedClient?.id || isSaving}
                >
                  예
                </AlertDialogAction>
                <AlertDialogCancel className='flex-1'>아니오</AlertDialogCancel>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default DeviceUnitDialog;
