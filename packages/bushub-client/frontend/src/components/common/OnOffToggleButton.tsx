import React from 'react';

import { Button } from '../ui/button';

interface OnOffToggleButtonProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  labelOn: string;
  labelOff: string;
}

const OnOffToggleButton: React.FC<OnOffToggleButtonProps> = ({ checked, onChange, labelOn, labelOff }) => (
  <Button
    className={`min-w-[72px] px-3 py-1 rounded-md font-semibold text-xs shadow-sm transition-all
      ${checked ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
    onClick={() => onChange(!checked)}
    type='button'
  >
    {checked ? labelOn : labelOff}
  </Button>
);

export default OnOffToggleButton;
