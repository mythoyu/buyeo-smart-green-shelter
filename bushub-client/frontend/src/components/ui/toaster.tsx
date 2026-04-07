import { Toaster as SonnerToaster } from 'sonner';

interface ToasterProps {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  richColors?: boolean;
  closeButton?: boolean;
}

export const Toaster: React.FC<ToasterProps> = ({
  duration = 5000, // 기본값 5초
  position = 'top-right',
  richColors = true,
  closeButton = true,
}) => {
  return <SonnerToaster duration={duration} position={position} richColors={richColors} closeButton={closeButton} />;
};
