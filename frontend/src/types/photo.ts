export type Photo = {
  id: number;
  filename: string;
  file_path: string;
  thumbnail_path: string;
  file_size: number;
  width: number;
  height: number;
  taken_at: string | null;
  latitude: number | null;
  longitude: number | null;
  uploaded_at: string;
  mime_type: string;
};
