import { useEffect, useRef, useState } from 'react';
import '@mediapipe/hands';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

interface Point {
  x: number;
  y: number;
}

export const HandDrawing = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handposeModelRef = useRef<handpose.HandPose | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cursorCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const currentPointRef = useRef<Point | null>(null);

  useEffect(() => {
    const initializeHandpose = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize TensorFlow and load handpose model
        await tf.ready();
        console.log('TensorFlow initialized');
        
        handposeModelRef.current = await handpose.load();
        console.log('Handpose model loaded');

        // Setup camera
        await setupCamera();
        console.log('Camera initialized');
        
        // Initialize drawing canvas context
        if (canvasRef.current) {
          ctxRef.current = canvasRef.current.getContext('2d');
          if (ctxRef.current) {
            // Set drawing styles
            ctxRef.current.lineJoin = 'round';
            ctxRef.current.lineCap = 'round';
            ctxRef.current.strokeStyle = '#ff0000';
            ctxRef.current.lineWidth = 3;
            ctxRef.current.shadowColor = 'rgba(255, 0, 0, 0.3)';
            ctxRef.current.shadowBlur = 5;
            ctxRef.current.globalCompositeOperation = 'source-over';
            
            // Enable image smoothing for better quality
            ctxRef.current.imageSmoothingEnabled = true;
            ctxRef.current.imageSmoothingQuality = 'high';
            console.log('Drawing canvas initialized');
          }
        }

        // Initialize cursor canvas context
        if (cursorCanvasRef.current) {
          cursorCtxRef.current = cursorCanvasRef.current.getContext('2d');
          if (cursorCtxRef.current) {
            cursorCtxRef.current.lineJoin = 'round';
            cursorCtxRef.current.lineCap = 'round';
            console.log('Cursor canvas initialized');
          }
        }
        
        // Start hand detection loop
        detectHands();
        console.log('Hand detection started');
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize the application');
        setIsLoading(false);
      }
    };

    initializeHandpose();

    // Cleanup function
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const setupCamera = async () => {
    if (!videoRef.current || !canvasRef.current || !cursorCanvasRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      videoRef.current.srcObject = stream;
      
      return new Promise<void>((resolve) => {
        if (!videoRef.current) return;

        videoRef.current.onloadedmetadata = () => {
          if (!videoRef.current || !canvasRef.current || !cursorCanvasRef.current) return;

          // Set video dimensions
          videoRef.current.width = 640;
          videoRef.current.height = 480;

          // Set canvas dimensions to match video
          canvasRef.current.width = videoRef.current.width;
          canvasRef.current.height = videoRef.current.height;
          cursorCanvasRef.current.width = videoRef.current.width;
          cursorCanvasRef.current.height = videoRef.current.height;

          videoRef.current.play();
          resolve();
        };
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
      throw new Error('Could not access the camera');
    }
  };

  const drawCursor = (point: Point) => {
    if (!cursorCtxRef.current || !cursorCanvasRef.current) return;
    
    // Clear previous cursor
    cursorCtxRef.current.clearRect(0, 0, cursorCanvasRef.current.width, cursorCanvasRef.current.height);
    
    // Draw outer glow
    const gradient = cursorCtxRef.current.createRadialGradient(
      point.x, point.y, 0,
      point.x, point.y, 15
    );
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
    gradient.addColorStop(0.5, 'rgba(255, 0, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    
    cursorCtxRef.current.beginPath();
    cursorCtxRef.current.arc(point.x, point.y, 15, 0, Math.PI * 2);
    cursorCtxRef.current.fillStyle = gradient;
    cursorCtxRef.current.fill();
    
    // Draw cursor
    cursorCtxRef.current.beginPath();
    cursorCtxRef.current.arc(point.x, point.y, 4, 0, Math.PI * 2);
    cursorCtxRef.current.fillStyle = '#ff0000';
    cursorCtxRef.current.fill();
    cursorCtxRef.current.strokeStyle = '#ffffff';
    cursorCtxRef.current.lineWidth = 2;
    cursorCtxRef.current.stroke();
  };

  const detectHands = async () => {
    // Skip detection if tab is not visible to save resources
    if (document.hidden) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
      return;
    }
    if (!handposeModelRef.current || !videoRef.current || !canvasRef.current) return;

    try {
      const predictions = await handposeModelRef.current.estimateHands(videoRef.current);
      
      if (predictions.length > 0) {
        const indexFinger = predictions[0].annotations.indexFinger[3];
        const point: Point = {
          x: canvasRef.current.width - (indexFinger[0] * (canvasRef.current.width / videoRef.current.videoWidth)),
          y: indexFinger[1] * (canvasRef.current.height / videoRef.current.videoHeight)
        };

        // Update cursor position
        drawCursor(point);
        currentPointRef.current = point;

        if (!isDrawingRef.current) {
          isDrawingRef.current = true;
          lastPointRef.current = point;
        } else if (lastPointRef.current) {
          const dx = point.x - lastPointRef.current.x;
          const dy = point.y - lastPointRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0.2) {
            draw(lastPointRef.current, point);
            lastPointRef.current = point;
          }
        }
      } else {
        isDrawingRef.current = false;
        lastPointRef.current = null;
        currentPointRef.current = null;
        
        // Clear cursor when no hand is detected
        if (cursorCtxRef.current && cursorCanvasRef.current) {
          cursorCtxRef.current.clearRect(0, 0, cursorCanvasRef.current.width, cursorCanvasRef.current.height);
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectHands);
    } catch (error) {
      console.error('Error detecting hands:', error);
      animationFrameRef.current = requestAnimationFrame(detectHands);
    }
  };

  const points: Point[] = [];
  const smoothingFactor = 0.3;
  const interpolationPoints = 10;

  const interpolatePoints = (start: Point, end: Point): Point[] => {
    const points: Point[] = [];
    for (let i = 0; i <= interpolationPoints; i++) {
      points.push({
        x: start.x + (end.x - start.x) * (i / interpolationPoints),
        y: start.y + (end.y - start.y) * (i / interpolationPoints)
      });
    }
    return points;
  };

  const getCurvePoints = (points: Point[]): Point[] => {
    const curvePoints: Point[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      // Catmull-Rom to Cubic Bezier
      const cp1x = p1.x + (p2.x - p0.x) * smoothingFactor;
      const cp1y = p1.y + (p2.y - p0.y) * smoothingFactor;
      const cp2x = p2.x - (p3.x - p1.x) * smoothingFactor;
      const cp2y = p2.y - (p3.y - p1.y) * smoothingFactor;

      curvePoints.push(p1);
      curvePoints.push({ x: cp1x, y: cp1y });
      curvePoints.push({ x: cp2x, y: cp2y });
      curvePoints.push(p2);
    }
    return curvePoints;
  };

  const draw = (start: Point, end: Point) => {
    if (!ctxRef.current) return;

    // Add interpolated points between start and end
    const newPoints = interpolatePoints(start, end);
    points.push(...newPoints);
    if (points.length < 4) {
      // Draw straight line if we don't have enough points for a curve
      ctxRef.current.beginPath();
      ctxRef.current.strokeStyle = '#ff0000';
      ctxRef.current.lineWidth = 3;
      ctxRef.current.moveTo(start.x, start.y);
      ctxRef.current.lineTo(end.x, end.y);
      ctxRef.current.stroke();
      return;
    }

    // Get points for the curve
    const curvePoints = getCurvePoints(points.slice(-4));

    // Draw the curve
    ctxRef.current.beginPath();
    ctxRef.current.strokeStyle = '#ff0000';
    ctxRef.current.lineWidth = 3;
    ctxRef.current.moveTo(curvePoints[0].x, curvePoints[0].y);

    for (let i = 1; i < curvePoints.length - 2; i += 3) {
      ctxRef.current.bezierCurveTo(
        curvePoints[i].x, curvePoints[i].y,
        curvePoints[i + 1].x, curvePoints[i + 1].y,
        curvePoints[i + 2].x, curvePoints[i + 2].y
      );
    }

    ctxRef.current.stroke();

    // Keep only the last 100 points to prevent memory issues
    if (points.length > 100) {
      points.shift();
    }
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const recognizeDrawing = () => {
    // To be implemented with Gemini API
    console.log('Recognition feature coming soon!');
  };

  return (
    <div className="hand-drawing">
      {isLoading && (
        <div className="loading-overlay">
          <p>Loading hand tracking model...</p>
        </div>
      )}
      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
          <p>Please make sure you have granted camera permissions and try refreshing the page.</p>
        </div>
      )}
      <div className="video-container">
        <video
          ref={videoRef}
          style={{ transform: 'scaleX(-1)', objectFit: 'cover' }}
          width={640}
          height={480}
          playsInline
          autoPlay
          muted
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="drawing-canvas"
        />
        <canvas
          ref={cursorCanvasRef}
          width={640}
          height={480}
          className="cursor-canvas"
        />
      </div>
      <div className="controls">
        <button onClick={clearCanvas}>Clear Canvas</button>
        <button onClick={recognizeDrawing}>Recognize Drawing</button>
      </div>
    </div>
  );
};
