import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export const STATUS_OPTIONS = [
  {
    key: 'all',
    label: '전체',
    icon: () => <Activity className='w-4 h-4' />,
    cardIcon: () => <Activity className='w-6 h-6' />,
    colorClass: 'bg-gray-100 text-gray-700',
    cardColor: 'text-gray-900',
    cardBg: 'bg-gray-100',
    cardIconColor: 'text-gray-600',
  },
  {
    key: '0',
    label: '정상',
    icon: () => <CheckCircle className='w-4 h-4' />,
    cardIcon: () => <CheckCircle className='w-6 h-6' />,
    colorClass: 'bg-green-100 text-green-700',
    cardColor: 'text-green-600',
    cardBg: 'bg-green-100',
    cardIconColor: 'text-green-600',
  },
  {
    key: '1',
    label: '일부비정상',
    icon: () => <AlertTriangle className='w-4 h-4' />,
    cardIcon: () => <AlertTriangle className='w-6 h-6' />,
    colorClass: 'bg-yellow-100 text-yellow-700',
    cardColor: 'text-yellow-600',
    cardBg: 'bg-yellow-100',
    cardIconColor: 'text-yellow-600',
  },
  {
    key: '2',
    label: '전체비정상',
    icon: () => <XCircle className='w-4 h-4' />,
    cardIcon: () => <XCircle className='w-6 h-6' />,
    colorClass: 'bg-red-100 text-red-700',
    cardColor: 'text-red-600',
    cardBg: 'bg-red-100',
    cardIconColor: 'text-red-600',
  },
];
