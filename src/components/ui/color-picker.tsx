import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string; // HSL format: "h s% l%"
  onChange: (hsl: string) => void;
  className?: string;
}

// Color conversion utilities
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.min(255, Math.max(0, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4))
  };
};

const rgbToCmyk = (r: number, g: number, b: number): { c: number; m: number; y: number; k: number } => {
  r /= 255; g /= 255; b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - r - k) / (1 - k)) * 100),
    m: Math.round(((1 - g - k) / (1 - k)) * 100),
    y: Math.round(((1 - b - k) / (1 - k)) * 100),
    k: Math.round(k * 100)
  };
};

const cmykToRgb = (c: number, m: number, y: number, k: number): { r: number; g: number; b: number } => {
  c /= 100; m /= 100; y /= 100; k /= 100;
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k))
  };
};

const parseHslString = (hsl: string): { h: number; s: number; l: number } => {
  const parts = hsl.replace(/%/g, '').split(/[\s,]+/).map(Number);
  return { h: parts[0] || 0, s: parts[1] || 0, l: parts[2] || 0 };
};

const formatHslString = (h: number, s: number, l: number): string => {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
};

export const ColorPicker = ({ value, onChange, className }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('picker');
  
  // Parse initial HSL value
  const initialHsl = parseHslString(value);
  const initialRgb = hslToRgb(initialHsl.h, initialHsl.s, initialHsl.l);
  
  const [hex, setHex] = useState(rgbToHex(initialRgb.r, initialRgb.g, initialRgb.b));
  const [rgb, setRgb] = useState(initialRgb);
  const [hsl, setHsl] = useState(initialHsl);
  const [cmyk, setCmyk] = useState(rgbToCmyk(initialRgb.r, initialRgb.g, initialRgb.b));

  // Sync all formats when HSL changes from parent
  useEffect(() => {
    const newHsl = parseHslString(value);
    const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    setHsl(newHsl);
    setRgb(newRgb);
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    setCmyk(rgbToCmyk(newRgb.r, newRgb.g, newRgb.b));
  }, [value]);

  const updateFromRgb = useCallback((r: number, g: number, b: number) => {
    const newHsl = rgbToHsl(r, g, b);
    setRgb({ r, g, b });
    setHsl(newHsl);
    setHex(rgbToHex(r, g, b));
    setCmyk(rgbToCmyk(r, g, b));
    onChange(formatHslString(newHsl.h, newHsl.s, newHsl.l));
  }, [onChange]);

  const updateFromHsl = useCallback((h: number, s: number, l: number) => {
    const newRgb = hslToRgb(h, s, l);
    setHsl({ h, s, l });
    setRgb(newRgb);
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    setCmyk(rgbToCmyk(newRgb.r, newRgb.g, newRgb.b));
    onChange(formatHslString(h, s, l));
  }, [onChange]);

  const handleHexChange = (newHex: string) => {
    setHex(newHex);
    const parsed = hexToRgb(newHex);
    if (parsed) {
      updateFromRgb(parsed.r, parsed.g, parsed.b);
    }
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const newRgb = { ...rgb, [channel]: Math.min(255, Math.max(0, val)) };
    updateFromRgb(newRgb.r, newRgb.g, newRgb.b);
  };

  const handleHslChange = (channel: 'h' | 's' | 'l', val: number) => {
    const max = channel === 'h' ? 360 : 100;
    const newHsl = { ...hsl, [channel]: Math.min(max, Math.max(0, val)) };
    updateFromHsl(newHsl.h, newHsl.s, newHsl.l);
  };

  const handleCmykChange = (channel: 'c' | 'm' | 'y' | 'k', val: number) => {
    const newCmyk = { ...cmyk, [channel]: Math.min(100, Math.max(0, val)) };
    setCmyk(newCmyk);
    const newRgb = cmykToRgb(newCmyk.c, newCmyk.m, newCmyk.y, newCmyk.k);
    updateFromRgb(newRgb.r, newRgb.g, newRgb.b);
  };

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleHexChange(e.target.value);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
          )}
        >
          <div 
            className="w-6 h-6 rounded border border-border flex-shrink-0"
            style={{ backgroundColor: `hsl(${value})` }}
          />
          <span className="text-muted-foreground truncate">{value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-popover z-50" align="start">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="picker" className="text-xs">Picker</TabsTrigger>
            <TabsTrigger value="hex" className="text-xs">HEX</TabsTrigger>
            <TabsTrigger value="rgb" className="text-xs">RGB</TabsTrigger>
            <TabsTrigger value="cmyk" className="text-xs">CMYK</TabsTrigger>
          </TabsList>

          <TabsContent value="picker" className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={hex}
                onChange={handleNativePickerChange}
                className="w-16 h-16 rounded cursor-pointer border-0 p-0"
              />
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Hue</Label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={hsl.h}
                    onChange={(e) => handleHslChange('h', Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Saturation</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hsl.s}
                    onChange={(e) => handleHslChange('s', Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lightness</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hsl.l}
                    onChange={(e) => handleHslChange('l', Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hex" className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">HEX Color</Label>
              <Input
                value={hex}
                onChange={(e) => handleHexChange(e.target.value)}
                placeholder="#000000"
                maxLength={7}
              />
            </div>
          </TabsContent>

          <TabsContent value="rgb" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">R</Label>
                <Input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.r}
                  onChange={(e) => handleRgbChange('r', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">G</Label>
                <Input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.g}
                  onChange={(e) => handleRgbChange('g', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">B</Label>
                <Input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.b}
                  onChange={(e) => handleRgbChange('b', Number(e.target.value))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cmyk" className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">C</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={cmyk.c}
                  onChange={(e) => handleCmykChange('c', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">M</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={cmyk.m}
                  onChange={(e) => handleCmykChange('m', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Y</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={cmyk.y}
                  onChange={(e) => handleCmykChange('y', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">K</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={cmyk.k}
                  onChange={(e) => handleCmykChange('k', Number(e.target.value))}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* HSL output always visible */}
        <div className="mt-4 pt-4 border-t border-border">
          <Label className="text-xs text-muted-foreground">HSL Output</Label>
          <div className="flex items-center gap-2 mt-1">
            <div 
              className="w-8 h-8 rounded border border-border flex-shrink-0"
              style={{ backgroundColor: `hsl(${value})` }}
            />
            <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{value}</code>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};