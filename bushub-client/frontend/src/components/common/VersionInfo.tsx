import { Info } from 'lucide-react';
import React, { useState } from 'react';

import { getFormattedVersion, getDetailedVersionInfo } from '../../utils/version';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface VersionInfoProps {
  className?: string;
  showDetailed?: boolean;
}

const VersionInfo: React.FC<VersionInfoProps> = ({ className = '', showDetailed = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  const version = getFormattedVersion();
  const detailedInfo = getDetailedVersionInfo();

  if (showDetailed) {
    return <div className={`text-xs text-muted-foreground ${className}`}>{detailedInfo}</div>;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className={`h-auto p-1 text-xs text-muted-foreground hover:text-foreground ${className}`}
        >
          <Info className='h-3 w-3 mr-1' />
          {version}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 p-3' align='end'>
        <div className='space-y-2'>
          <h4 className='font-medium text-sm'>버전 정보</h4>
          <div className='text-xs text-muted-foreground space-y-1'>
            <div className='font-mono'>{detailedInfo}</div>
            <div className='pt-2 border-t'>
              <div className='text-xs text-muted-foreground'>버전 정보를 클릭하면 상세 정보를 확인할 수 있습니다.</div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VersionInfo;
