import { Command, Unit, DeviceSpec } from './types';

// 애니메이션 딜레이 계산
export const getAnimationDelay = (deviceIndex: number, unitIndex: number, commandIndex?: number) => {
  if (commandIndex !== undefined) {
    return `${deviceIndex * 100 + unitIndex * 50 + commandIndex * 100}ms`;
  }
  return `${deviceIndex * 100 + unitIndex * 50}ms`;
};

// 디바이스 카드 스타일링
export const getDeviceCardStyles = () => ({
  container: `p-3 flex flex-col gap-3 bg-white border-2 border-gray-300 shadow-sm hover:border-blue-400 transition-colors duration-200 rounded-lg`,
  animation: 'fadeInUp 0.6s ease-out forwards',
});

// 유닛 카드 스타일링
export const getUnitCardStyles = (isSelected: boolean) => ({
  container: `flex flex-col text-sm px-0 py-3 rounded-lg cursor-pointer transition-all duration-300 ease-out flex-shrink-0 border transform ${
    isSelected
      ? 'bg-blue-50 border-blue-300 shadow-md'
      : 'bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-200 hover:shadow-sm'
  }`,
  animation: 'fadeInUp 0.4s ease-out forwards',
});

// 설정 폼 스타일링
export const getSettingsFormStyles = () => ({
  container: 'space-y-4 flex-shrink-0', // 다이얼로그 내부에서 사용하므로 간소화, 간격 확대
  animation: 'fadeIn 0.3s ease-out forwards',
});

// 명령어별 기본값 설정
export const getCommandDefaultValue = (command: Command): any => {
  if (command.defaultValue !== undefined) {
    return command.defaultValue;
  }

  switch (command.type) {
    case 'boolean':
      return false;
    case 'int':
    case 'float':
      return command.min || 0;
    case 'string':
      if (command.key.includes('time')) {
        return command.key.includes('start') ? '08:00' : '22:00';
      }
      if (Array.isArray(command.options) && command.options.length > 0) {
        return command.options[0];
      }
      return '';
    default:
      return '';
  }
};

// 명령어 필터링
export const filterCommands = (commands: Command[], filterType: 'time' | 'other' | 'auto') => {
  switch (filterType) {
    case 'time':
      return commands.filter(
        cmd =>
          cmd.key === 'start_time_1' ||
          cmd.key === 'end_time_1' ||
          cmd.key === 'start_time_2' ||
          cmd.key === 'end_time_2'
      );
    case 'other':
      return commands.filter(
        cmd =>
          cmd.key !== 'start_time_1' &&
          cmd.key !== 'end_time_1' &&
          cmd.key !== 'start_time_2' &&
          cmd.key !== 'end_time_2' &&
          cmd.set === true
      );
    case 'auto':
      return commands.filter(cmd => cmd.key === 'auto');
    default:
      return [];
  }
};

// 명령어 그룹화
export const groupCommands = (commands: Command[]) => {
  const timeCommands = filterCommands(commands, 'time');
  const otherCommands = filterCommands(commands, 'other');

  // auto 명령어는 단순한 boolean이므로 간단하게 처리
  const autoCommand = commands.find(cmd => cmd.key === 'auto') || null;

  // console.log('groupCommands Debug:', {
  //   commands,
  //   commandsLength: commands.length,
  //   commandKeys: commands.map(cmd => cmd.key),
  //   timeCommands: timeCommands.length,
  //   otherCommands: otherCommands.length,
  //   autoCommand: autoCommand || 'null',
  //   // auto 명령어가 있는지 직접 확인
  //   hasAutoCommand: commands.some(cmd => cmd.key === 'auto'),
  //   autoCommandIndex: commands.findIndex(cmd => cmd.key === 'auto'),
  // });

  return {
    timeCommands,
    otherCommands,
    autoCommand,
  };
};

// 폼 초기값 설정
export const getInitialFormValues = (unit: Unit, deviceSpec: DeviceSpec): Record<string, any> => {
  const initialForm: Record<string, any> = {};

  // unit.data에서 초기값 설정
  if (unit.data) {
    Object.keys(unit.data).forEach(key => {
      initialForm[key] = unit.data![key];
    });
  }

  // deviceSpecs에서 기본값 설정
  if (deviceSpec?.commands) {
    deviceSpec.commands.forEach(cmd => {
      if (cmd.set === true && !(cmd.key in initialForm)) {
        const defaultValue = getCommandDefaultValue(cmd);
        initialForm[cmd.key] = defaultValue;
      }
    });
  }

  console.log('✅ getInitialFormValues 완료:', {
    unitId: unit.id,
    initialForm,
    unitDataKeys: unit.data ? Object.keys(unit.data) : [],
  });
  return initialForm;
};

// 상태별 Badge 스타일링
export const getBadgeStyles = (status: string) => {
  switch (status) {
    case 'pending':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'success':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'failed':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'mixed':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

// 상태별 아이콘 및 텍스트
export const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        icon: 'animate-spin',
        text: '명령 처리 중...',
      };
    case 'success':
      return {
        icon: 'animate-bounce',
        text: '모든 명령이 성공적으로 완료되었습니다.',
      };
    case 'failed':
      return {
        icon: 'animate-shake',
        text: '일부 명령이 실패했습니다.',
      };
    case 'mixed':
      return {
        icon: 'animate-pulse',
        text: '명령 처리 결과가 혼재되어 있습니다.',
      };
    default:
      return {
        icon: '',
        text: '',
      };
  }
};
