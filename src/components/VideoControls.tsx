import { Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import React, { FC, useEffect } from 'react';

interface VideoControlsProps {
  duration: number;
  currentTime: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  handleCurrentTime: (time: number) => void;
  handleIsPlaying: (isPlaying: boolean) => void;
  onSeek: (time: number) => void;
}

export const VideoControls: FC<VideoControlsProps> = ({
  duration,
  currentTime,
  videoRef,
  isPlaying,
  handleCurrentTime,
  handleIsPlaying,
  onSeek,
}) => {
  // Handle video playback state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play();
    } else {
      video.pause();
    }
  }, [isPlaying]);

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      handleCurrentTime(time);
      onSeek(time);
    }
  };

  const handleSkip = (direction: 'forward' | 'backward') => {
    if (videoRef.current) {
      const newTime = currentTime + (direction === 'forward' ? 1 : -1);
      videoRef.current.currentTime = Math.max(0, Math.min(newTime, duration));
    }
  };

  const handleStop = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      handleIsPlaying(false);
      handleCurrentTime(0);
    }
  };

  return (
    <div className='bg-gray-800 p-4 w-full'>
      <div className='flex items-center gap-4'>
        <button onClick={() => handleSkip('backward')} className='text-white hover:text-gray-300'>
          <SkipBack size={24} />
        </button>

        <button
          onClick={() => handleIsPlaying(!isPlaying)}
          className='text-white hover:text-gray-300'
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>

        <button onClick={handleStop} className='text-white hover:text-gray-300'>
          <Square size={24} />
        </button>

        <button onClick={() => handleSkip('forward')} className='text-white hover:text-gray-300'>
          <SkipForward size={24} />
        </button>

        <div className='flex-grow flex items-center gap-2'>
          <span className='text-white text-sm'>{formatTime(currentTime)}</span>
          <input
            type='range'
            min='0'
            max={videoRef?.current?.duration}
            value={currentTime}
            onChange={handleSeek}
            className='flex-grow h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer'
          />
          <span className='text-white text-sm'>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};
