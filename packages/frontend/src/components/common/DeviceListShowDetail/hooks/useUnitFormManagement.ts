import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import { SelectedUnit, UnitForm } from '../types';
import { getInitialFormValues, resolvePowerAutoValues } from '../utils';

export const useUnitFormManagement = (deviceSpecs?: Record<string, any>) => {
  // 선택된 유닛 상태 관리
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit | null>(null);
  // 디바이스별 유닛별 설정 폼 상태 (deviceId_unitId 키로 관리)
  const [unitForms, setUnitForms] = useState<Record<string, UnitForm>>({});

  // selectedUnit의 unit.data 변경 시 unitForm 동기화 (references: 폴링 데이터 전체 반영)
  useEffect(() => {
    if (selectedUnit?.unit?.data) {
      const unitKey = `${selectedUnit.device.id}_${selectedUnit.unit.id}`;

      setUnitForms(prev => ({
        ...prev,
        [unitKey]: {
          ...prev[unitKey],
          ...selectedUnit.unit.data,
        },
      }));
    }
  }, [
    selectedUnit?.unit?.data,
    selectedUnit?.device?.id,
    selectedUnit?.unit?.id,
    // 폴링 데이터 변경 감지를 위해 JSON.stringify 사용
    selectedUnit?.unit?.data ? JSON.stringify(selectedUnit.unit.data) : null,
  ]);

  // 외부에서 selectedUnit 업데이트를 위한 함수
  const updateSelectedUnit = useCallback((updatedUnit: any) => {
    console.log('🔄 updateSelectedUnit 호출:', { updatedUnit });
    setSelectedUnit(prev => {
      if (prev && prev.unit.id === updatedUnit.id) {
        console.log('🔄 selectedUnit 업데이트:', {
          unitId: updatedUnit.id,
          oldData: prev.unit.data,
          newData: updatedUnit.data,
        });
        return {
          ...prev,
          unit: updatedUnit,
        };
      }
      return prev;
    });
  }, []);

  // 자동모드 전환 시 열려 있던 설정 팝업 닫기
  useEffect(() => {
    if (!selectedUnit) return;

    const unitKey = `${selectedUnit.device.id}_${selectedUnit.unit.id}`;
    const { autoValue } = resolvePowerAutoValues(selectedUnit.unit.data, unitForms[unitKey]);

    if (Boolean(autoValue)) {
      setSelectedUnit(null);
    }
  }, [selectedUnit, unitForms]);

  // 유닛 클릭 핸들러
  const handleUnitClick = useCallback(
    (device: any, unit: any) => {
      const unitKey = `${device.id}_${unit.id}`;
      console.log('🚀 유닛 클릭:', { device: device.id, unit: unit.id, unitKey });

      const { autoValue } = resolvePowerAutoValues(unit.data, unitForms[unitKey]);
      if (Boolean(autoValue)) {
        toast.info('자동모드에서는 설정을 변경할 수 없습니다. 수동모드로 전환 후 다시 시도하세요.', {
          id: `unit-settings-auto-mode-${unitKey}`,
          duration: 3000,
        });
        return;
      }

      setSelectedUnit({ device, unit });

      // 해당 유닛의 기존 폼 데이터가 없으면 초기값 설정
      setUnitForms(prev => {
        if (!prev[unitKey]) {
          const deviceSpec = deviceSpecs?.[device.type];
          if (deviceSpec) {
            const initialValues = getInitialFormValues(unit, deviceSpec);
            console.log('📝 폼 초기값 설정:', { unitKey, initialValues });
            return {
              ...prev,
              [unitKey]: initialValues,
            };
          } else {
            console.log('⚠️ deviceSpec을 찾을 수 없음:', { deviceType: device.type, deviceSpecs });
            return {
              ...prev,
              [unitKey]: {},
            };
          }
        }
        console.log('📝 기존 폼 데이터 사용:', { unitKey, existingForm: prev[unitKey] });
        return prev;
      });
    },
    [deviceSpecs, unitForms]
  );

  // 폼 변경 핸들러 (선택된 유닛 또는 deviceId/unitId를 받아서 폼 변경)
  const handleFormChange = useCallback(
    (key: string, value: any, deviceId?: string, unitId?: string) => {
      // deviceId와 unitId가 제공되면 사용, 없으면 selectedUnit 사용
      let targetDeviceId: string | undefined;
      let targetUnitId: string | undefined;

      if (deviceId && unitId) {
        // 직접 제공된 deviceId/unitId 사용 (선택되지 않은 유닛도 지원)
        targetDeviceId = deviceId;
        targetUnitId = unitId;
      } else if (selectedUnit) {
        // selectedUnit이 있으면 사용
        targetDeviceId = selectedUnit.device.id;
        targetUnitId = selectedUnit.unit.id;
      } else {
        console.warn('⚠️ selectedUnit이 없고 deviceId/unitId도 제공되지 않아 handleFormChange 무시:', {
          key,
          value,
        });
        return;
      }

      const unitKey = `${targetDeviceId}_${targetUnitId}`;
      console.log('📝 폼 데이터 변경:', { unitKey, key, value, deviceId, unitId });

      setUnitForms(prev => ({
        ...prev,
        [unitKey]: {
          ...prev[unitKey],
          [key]: value,
        },
      }));
    },
    [selectedUnit]
  );

  // 설정 저장 핸들러
  const handleSave = useCallback(async () => {
    if (!selectedUnit) return;

    const unitKey = `${selectedUnit.device.id}_${selectedUnit.unit.id}`;
    const currentUnitForm = unitForms[unitKey] || {};
    console.log('💾 설정 저장 시작:', { selectedUnit, unitKey, currentUnitForm });

    // 여기서 실제 저장 로직은 useCommandExecution에서 처리
    // 이 훅은 폼 상태 관리만 담당
  }, [selectedUnit, unitForms]);

  // 설정 취소 핸들러
  const handleCancel = useCallback(() => {
    setSelectedUnit(null);
    // 개별 unitForm 초기화는 하지 않음 (사용자가 다시 열었을 때 기존 값 유지)
  }, []);

  // 복사 기능
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('복사 실패:', err);
      toast.error('복사 실패했습니다', {
        duration: 2000,
        position: 'top-right',
      });
    }
  }, []);

  // 붙여넣기 기능
  const handlePaste = useCallback(
    async (key: string) => {
      if (!selectedUnit) {
        console.warn('⚠️ selectedUnit이 없어서 handlePaste 무시:', key);
        toast.error('선택된 유닛이 없습니다', {
          duration: 2000,
          position: 'top-right',
        });
        return;
      }

      try {
        const text = await navigator.clipboard.readText();
        // 시간 형식 검증 (HH:mm)
        if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(text)) {
          const unitKey = `${selectedUnit.device.id}_${selectedUnit.unit.id}`;
          setUnitForms(prev => ({
            ...prev,
            [unitKey]: {
              ...prev[unitKey],
              [key]: text,
            },
          }));
        } else {
          toast.error(`올바르지 않은 시간 형식입니다: ${text}`, {
            duration: 3000,
            position: 'top-right',
          });
        }
      } catch (err) {
        console.error('붙여넣기 실패:', err);
        toast.error('붙여넣기 실패했습니다', {
          duration: 2000,
          position: 'top-right',
        });
      }
    },
    [selectedUnit]
  );

  // 유닛별 폼 상태 가져오기 (키 기반)
  const getUnitForm = useCallback(
    (deviceId: string, unitId: string) => {
      const unitKey = `${deviceId}_${unitId}`;
      const unitForm = unitForms[unitKey] || {};

      return unitForm;
    },
    [unitForms]
  );

  // updateSelectedUnit을 직접 정의하여 undefined 문제 해결
  const finalUpdateSelectedUnit = useCallback((updatedUnit: any) => {
    console.log('🔄 finalUpdateSelectedUnit 호출:', { updatedUnit });
    setSelectedUnit(prev => {
      if (prev && prev.unit.id === updatedUnit.id) {
        console.log('🔄 selectedUnit 업데이트:', {
          unitId: updatedUnit.id,
          oldData: prev.unit.data,
          newData: updatedUnit.data,
        });
        return { ...prev, unit: updatedUnit };
      }
      return prev;
    });
  }, []);

  // 현재 선택된 유닛의 폼 가져오기
  const currentUnitForm = selectedUnit ? unitForms[`${selectedUnit.device.id}_${selectedUnit.unit.id}`] || {} : {};

  return {
    selectedUnit,
    setSelectedUnit,
    unitForm: currentUnitForm, // 현재 선택된 유닛의 폼 반환
    getUnitForm,
    setUnitForm: () => {}, // 레거시 호환성을 위해 빈 함수로 유지
    updateSelectedUnit,
    handleUnitClick,
    handleFormChange,
    handleSave,
    handleCancel,
    handleCopy,
    handlePaste,
  };
};
