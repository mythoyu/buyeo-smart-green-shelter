import React from 'react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui';
import { CommandRenderer } from '../DeviceListShowDetail/CommandRenderer';
import { filterCommands } from '../DeviceListShowDetail/utils';

import { getEditableCommands } from './quickSettingsUtils';
import { QuickSettingsFormProps } from './types';
import { getQuickSettingsUnitKey } from './types';

export const QuickSettingsForm: React.FC<QuickSettingsFormProps> = ({
  deviceTypes,
  deviceSpecs,
  formsByUnit,
  unitCountByType,
  unitsByDeviceType,
  onFieldChange,
}) => {
  if (deviceTypes.length === 0) {
    return null;
  }

  return (
    <Accordion type='multiple' defaultValue={deviceTypes} className='w-full min-w-0'>
      {deviceTypes.map((deviceType) => {
        const deviceSpec = deviceSpecs[deviceType];
        const unitCount = unitCountByType[deviceType] ?? 0;
        const units = unitsByDeviceType[deviceType] ?? [];
        const deviceName = (deviceSpec as { deviceName?: string })?.deviceName ?? deviceType;
        const editableCommands = getEditableCommands(deviceSpec?.commands ?? []);
        const otherCommands = filterCommands(editableCommands, 'other');

        return (
          <AccordionItem key={deviceType} value={deviceType}>
            <AccordionTrigger className='py-3 hover:no-underline'>
              <span className='flex items-center gap-2'>
                <span>{deviceName}</span>
                <span className='text-xs font-normal text-muted-foreground'>({unitCount}유닛)</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className='min-w-0 space-y-4'>
              {units.map(({ device, unit }) => {
                const unitKey = getQuickSettingsUnitKey(device.id, unit.id);
                const form = formsByUnit[unitKey] ?? {};
                const unitLabel = unit.name || unit.id;

                return (
                  <div key={unitKey} className='space-y-3 rounded-lg border border-border bg-muted/20 p-3'>
                    <p className='text-xs font-semibold text-foreground'>{unitLabel}</p>

                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4'>
                      {otherCommands.map((cmd, index) => (
                        <CommandRenderer
                          key={cmd.key}
                          command={cmd}
                          value={form[cmd.key]}
                          onChange={(value) => onFieldChange(unitKey, cmd.key, value)}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

