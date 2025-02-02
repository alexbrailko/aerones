import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Annotation, FrameData, VideoPlayerProps } from '../types/types';
import { VideoControls } from './VideoControls';

const VIDEO_WIDTH = 5376;
const VIDEO_HEIGHT = 2688;
const SPHERE_RADIUS = 500;

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, metadata }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const boundingBoxRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [currentFrame, setCurrentFrame] = useState<FrameData | null>(null);
  const [currentAnnotations, setCurrentAnnotations] = useState<Annotation[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoError, setVideoError] = useState(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || !videoRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Create sphere for 360 video
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 60, 40);
    geometry.scale(-1, 1, 1);

    const texture = new THREE.VideoTexture(videoRef.current);

    const material = new THREE.MeshBasicMaterial({ map: texture });
    const sphere = new THREE.Mesh(geometry, material);

    scene.add(sphere);
    camera.position.set(0, 0, 0.1);

    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.rotateSpeed = -0.5;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      updateBoundingBoxPositions();
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      controls.dispose();
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = containerRef.current.clientWidth;
      // Calculate height based on 16:9 aspect ratio
      const height = width * (9 / 16);

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once initially to set correct size
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const worldToScreen = useCallback(
    (pos: THREE.Vector3): { x: number; y: number } | null => {
      if (!cameraRef.current || !containerRef.current) return null;

      const vector = pos.clone();
      const canvas = containerRef.current;

      const cameraDirection = new THREE.Vector3(0, 0, -1);
      cameraDirection.applyQuaternion(cameraRef.current.quaternion);
      const pointDirection = vector.clone().normalize();
      const dotProduct = pointDirection.dot(cameraDirection);

      if (dotProduct > 0) return null;

      vector.project(cameraRef.current);

      return {
        x: ((vector.x + 1) / 2) * canvas.clientWidth,
        y: ((-vector.y + 1) / 2) * canvas.clientHeight,
      };
    },
    [cameraRef, containerRef]
  );

  const updateBoundingBoxPositions = useCallback(() => {
    if (!containerRef.current) return;

    const scale = SPHERE_RADIUS;
    const twoPi = Math.PI * 2;
    const pi = Math.PI;

    boundingBoxRefs.current.forEach((boxRef, index) => {
      if (!boxRef || !currentAnnotations[index]) return;

      const annotation = currentAnnotations[index];
      const [x, y] = annotation.bbox;

      const phi = (x / VIDEO_WIDTH) * twoPi;
      const theta = (y / VIDEO_HEIGHT) * pi;

      // Precalculate shared values
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      const position = new THREE.Vector3(
        scale * sinTheta * cosPhi,
        scale * cosTheta,
        scale * sinTheta * sinPhi
      );

      const screenPos = worldToScreen(position);
      if (screenPos) {
        boxRef.style.left = `${screenPos.x}px`;
        boxRef.style.top = `${screenPos.y}px`;
      }
    });
  }, [currentAnnotations, worldToScreen]);

  useEffect(() => {
    let rafId: number;
    const animate = () => {
      updateBoundingBoxPositions();
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafId);
  }, [updateBoundingBoxPositions]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    updateFrameData(videoRef.current.currentTime);
  };

  const updateFrameData = (currentVideoTime: number) => {
    const frameData = findCurrentFrameData(currentVideoTime);

    if (frameData) {
      setCurrentFrame(frameData);
      setCurrentAnnotations(frameData.annotations?.length > 0 ? frameData.annotations : []);
    }
  };

  const findCurrentFrameData = (currentTime: number) => {
    const frameNumber = Math.round(currentTime * 3);

    // First try exact match
    const frameData = frameMap.get(frameNumber);
    if (frameData) return frameData;

    // Find closest frame if no exact match
    const allFrameNumbers = Array.from(frameMap.keys());
    const closestFrame = allFrameNumbers.reduce((prev, curr) => {
      return Math.abs(curr - frameNumber) < Math.abs(prev - frameNumber) ? curr : prev;
    });

    return frameMap.get(closestFrame);
  };

  const frameMap = new Map(
    Object.entries(metadata).map(([key, value]) => {
      // Extract frame number from filename (e.g., "3_None_0_0_.png" -> 3)
      const frameNumber = parseInt(key.split('_')[0]);
      return [frameNumber, value];
    })
  );

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const renderBoundingBoxes = () => {
    if (!currentAnnotations || currentAnnotations.length === 0) return null;

    // Calculate scale factors
    const scaleX =
      containerRef && containerRef.current ? containerRef.current.clientWidth / VIDEO_WIDTH : 1;
    const scaleY =
      containerRef && containerRef.current ? containerRef.current.clientHeight / VIDEO_HEIGHT : 1;

    return currentAnnotations.map((annotation, index) => {
      const [x, y, width, height] = annotation.bbox;

      // Calculate relative positions based on video dimensions
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      const scaledWidth = (width - x) * scaleX;
      const scaledHeight = (height - y) * scaleY;

      return (
        <div
          key={index}
          ref={(el) => (boundingBoxRefs.current[index] = el)}
          className='absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2'
          data-x={x}
          data-y={y}
          data-width={width}
          data-height={height}
          style={{
            left: `${scaledX}%`,
            top: `${scaledY}%`,
            width: `${scaledWidth}%`,
            height: `${scaledHeight}%`,
            border: '2px solid red',
            backgroundColor: 'rgba(255, 0, 0, 0.2)',
            zIndex: 1000,
          }}
        >
          <div className='absolute top-0 left-0 bg-black bg-opacity-50 text-white text-xs p-1 whitespace-nowrap'>
            {annotation.category_name} ({(parseFloat(annotation.confidence) * 100).toFixed(1)}%)
          </div>
        </div>
      );
    });
  };

  const handleVideoError = () => {
    setVideoError(true);
    setIsPlaying(false);
  };

  return (
    <div className='flex flex-col md:flex-row'>
      <div className='md:w-3/4 w-full relative flex flex-col'>
        <div ref={containerRef} className='w-full relative'>
          <video
            ref={videoRef}
            className='hidden'
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleVideoError}
          >
            <source src={videoUrl} type='video/mp4' />
          </video>
          {videoError && (
            <div className='absolute inset-0 flex items-center justify-center bg-gray-900'>
              <div className='text-white text-xl'>
                Video cannot be played. The file might be missing or corrupted.
              </div>
            </div>
          )}
          <div className='absolute inset-0 pointer-events-none overflow-hidden'>
            {renderBoundingBoxes()}
          </div>
        </div>

        <VideoControls
          duration={duration}
          currentTime={currentTime}
          videoRef={videoRef}
          isPlaying={isPlaying}
          handleCurrentTime={setCurrentTime}
          handleIsPlaying={setIsPlaying}
          onSeek={updateFrameData}
        />
      </div>

      <div className='md:w-1/4 w-full bg-gray-100 p-4 overflow-y-auto'>
        <h2 className='text-xl font-bold mb-4'>Frame Information</h2>

        <div>
          <p>QR Value: {currentFrame?.qr_val}</p>
          <p>Distance: {currentFrame?.distance}m</p>
          <p>Time: {currentFrame?.video_time}</p>
          <h3 className='font-bold mt-4'>Annotations</h3>
          {currentAnnotations.map((ann, index) => (
            <div key={index} className='mt-2 p-2 bg-white rounded'>
              <p>Type: {ann.category_name}</p>
              <p>Confidence: {ann.confidence}</p>
              <p>Area: {ann.area}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
