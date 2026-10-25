import { useEffect, useRef } from 'react';
import { renderOrbitalEarthCanvas } from '../utils/orbitalCanvas';

interface SatelliteLogoIconProps {
  size?: number;
  className?: string;
}

export function SatelliteLogoIcon({ size = 28, className = '' }: SatelliteLogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left solar array */}
      <rect
        x="3.2"
        y="12.5"
        width="7.6"
        height="4.8"
        rx="0.9"
        transform="rotate(-38 3.2 12.5)"
        fill="#0EA5E9"
        fillOpacity="0.22"
        stroke="#38BDF8"
        strokeWidth="1.5"
      />
      {/* Right solar array */}
      <rect
        x="18.2"
        y="21.4"
        width="7.6"
        height="4.8"
        rx="0.9"
        transform="rotate(-38 18.2 21.4)"
        fill="#0EA5E9"
        fillOpacity="0.22"
        stroke="#38BDF8"
        strokeWidth="1.5"
      />
      {/* Main satellite bus */}
      <rect
        x="10.8"
        y="14.2"
        width="8.4"
        height="6.4"
        rx="1.3"
        transform="rotate(-38 10.8 14.2)"
        fill="#0EA5E9"
        stroke="#7DD3FC"
        strokeWidth="1.5"
      />
      {/* Optical sensor dish & downlink waves */}
      <path
        d="M19.5 18.2L22.2 20.9"
        stroke="#7DD3FC"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M21.2 23.2C23.1 23.1 24.6 21.6 24.7 19.7"
        stroke="#38BDF8"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M22.8 25.8C25.8 25.5 28.0 23.3 28.3 20.3"
        stroke="#38BDF8"
        strokeOpacity="0.65"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface OrbitalHorizonBackdropProps {
  variant?: 'left-limb' | 'horizon-bottom';
  className?: string;
}

export function OrbitalHorizonBackdrop({
  variant = 'left-limb',
  className = '',
}: OrbitalHorizonBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => renderOrbitalEarthCanvas(canvas, variant);
    draw();

    const observer = new ResizeObserver(() => {
      draw();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none block h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
}
