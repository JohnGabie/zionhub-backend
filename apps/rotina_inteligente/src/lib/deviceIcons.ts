import { 
  Plug, 
  Monitor, 
  Tv, 
  AirVent, 
  Printer, 
  Server, 
  Router, 
  Lightbulb, 
  Camera, 
  Coffee, 
  Fan, 
  Speaker, 
  Refrigerator,
  type LucideIcon 
} from 'lucide-react';

export interface DeviceIconOption {
  id: string;
  label: string;
  Icon: LucideIcon;
}

export const DEVICE_ICONS: DeviceIconOption[] = [
  { id: 'plug', label: 'Tomada', Icon: Plug },
  { id: 'monitor', label: 'Computador', Icon: Monitor },
  { id: 'tv', label: 'TV', Icon: Tv },
  { id: 'air-vent', label: 'Ar Condicionado', Icon: AirVent },
  { id: 'printer', label: 'Impressora', Icon: Printer },
  { id: 'server', label: 'Servidor', Icon: Server },
  { id: 'router', label: 'Roteador', Icon: Router },
  { id: 'lightbulb', label: 'Lâmpada', Icon: Lightbulb },
  { id: 'camera', label: 'Câmera', Icon: Camera },
  { id: 'coffee', label: 'Cafeteira', Icon: Coffee },
  { id: 'fan', label: 'Ventilador', Icon: Fan },
  { id: 'speaker', label: 'Alto-falante', Icon: Speaker },
  { id: 'refrigerator', label: 'Geladeira', Icon: Refrigerator },
];

export const getDeviceIcon = (iconId?: string): LucideIcon => {
  const found = DEVICE_ICONS.find(i => i.id === iconId);
  return found?.Icon ?? Plug;
};
