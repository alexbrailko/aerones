export interface Annotation {
  id_nr: number;
  category_name: string;
  bbox: number[];
  area: string;
  confidence: string;
  real_NIO: boolean;
  defect_size_mm: number;
  operator_found: boolean;
}

export interface FrameData {
  qr_val: string;
  distance: string;
  video_time?: string;
  width?: number;
  height?: number;
  annotations: Annotation[];
}

export interface VideoMetadata {
  [key: string]: FrameData;
}

export interface VideoPlayerProps {
  videoUrl: string;
  metadata: VideoMetadata;
}
