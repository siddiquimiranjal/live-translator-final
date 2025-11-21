import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  color?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser, isActive, color = '#3b82f6' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const width = rect.width;
      const height = rect.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Idle Animation
      if (!isActive) {
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        // Draw a straight line with very subtle pulse
        const time = Date.now() * 0.002;
        for (let i = 0; i < width; i += 10) {
             const y = centerY + Math.sin(i * 0.05 + time) * 2;
             ctx.lineTo(i, y);
        }
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'; // Slate-400/20
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      if (analyser) {
        analyser.getByteTimeDomainData(dataArray);
      }

      // Create Gradient
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#3b82f6'); // Blue-500
      gradient.addColorStop(0.5, '#a855f7'); // Purple-500
      gradient.addColorStop(1, '#3b82f6'); // Blue-500

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Configuration for the wave
      const sliceWidth = width / (bufferLength / 4); // Spread it out
      let x = 0;
      
      // Extract points for smoothness
      const points: {x: number, y: number}[] = [];
      
      for (let i = 0; i < bufferLength; i += 4) {
        const v = dataArray[i] / 128.0;
        const amplitude = (v - 1); // -1 to 1
        
        // Window function (Hanning) to taper the edges to zero
        // ensuring the wave connects seamlessly to the center line at ends
        const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (bufferLength - 1)));
        
        // Scale the amplitude for visual impact
        const scaledAmp = amplitude * height * 1.5 * window; 
        
        const y = centerY + scaledAmp;
        points.push({x, y});
        
        x += sliceWidth;
        // Stop if we go off screen
        if (x > width) break;
      }

      // Function to draw a spline through points
      const drawSpline = (pts: {x: number, y: number}[], color: string | CanvasGradient, width: number) => {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          if (pts.length > 0) {
              ctx.moveTo(pts[0].x, pts[0].y);
              for (let i = 0; i < pts.length - 1; i++) {
                  const xc = (pts[i].x + pts[i + 1].x) / 2;
                  const yc = (pts[i].y + pts[i + 1].y) / 2;
                  ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
              }
              ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
          }
          ctx.stroke();
      };

      // Draw Primary Wave
      drawSpline(points, gradient, 3);

      // Draw Mirrored Ghost Wave (Top)
      const mirrorPoints = points.map(p => ({
          x: p.x,
          y: centerY - (p.y - centerY) * 0.7 // Invert and dampen
      }));
      drawSpline(mirrorPoints, 'rgba(59, 130, 246, 0.3)', 2);

      // Draw Second Mirrored Layer (Bottom)
      const secondaryPoints = points.map(p => ({
          x: p.x,
          y: centerY + (p.y - centerY) * 0.5 // Dampen
      }));
      drawSpline(secondaryPoints, 'rgba(168, 85, 247, 0.2)', 2);

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isActive, color]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-40"
    />
  );
};
