export type DeviceId =
  | 'iphone-15-pro'
  | 'iphone-15-pro-max'
  | 'iphone-16-pro'
  | 'iphone-16-pro-max'
  | 'iphone-16e'
  | 'iphone-17-pro'
  | 'iphone-17-pro-max';

export type Device = {
  id: DeviceId;
  label: string;
  /** Logical screen size in points — the exported PNG is width×height @3x. */
  width: number;
  height: number;
  /**
   * Dynamic Island phones show the island pill in screenshots; notch phones
   * (16e) do not — the notch is a hardware cutout that never appears in a
   * real iOS screenshot, so nothing is drawn for it.
   */
  cutout: 'island' | 'notch';
};

export const DEVICE_LIST: Device[] = [
  { id: 'iphone-15-pro', label: 'iPhone 15 Pro', width: 393, height: 852, cutout: 'island' },
  { id: 'iphone-15-pro-max', label: 'iPhone 15 Pro Max', width: 430, height: 932, cutout: 'island' },
  { id: 'iphone-16-pro', label: 'iPhone 16 Pro', width: 402, height: 874, cutout: 'island' },
  { id: 'iphone-16-pro-max', label: 'iPhone 16 Pro Max', width: 440, height: 956, cutout: 'island' },
  { id: 'iphone-16e', label: 'iPhone 16e', width: 390, height: 844, cutout: 'notch' },
  { id: 'iphone-17-pro', label: 'iPhone 17 Pro', width: 402, height: 874, cutout: 'island' },
  { id: 'iphone-17-pro-max', label: 'iPhone 17 Pro Max', width: 440, height: 956, cutout: 'island' },
];

export const DEVICES: Record<DeviceId, Device> = Object.fromEntries(
  DEVICE_LIST.map((d) => [d.id, d])
) as Record<DeviceId, Device>;

export const DEFAULT_DEVICE_ID: DeviceId = 'iphone-16-pro';

export function getDevice(id?: string): Device {
  return (id && DEVICES[id as DeviceId]) || DEVICES[DEFAULT_DEVICE_ID];
}
