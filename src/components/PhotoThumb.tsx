import { useEffect, useState } from 'react';
import { getPhoto } from '../db/repository';

/**
 * Photos live in IndexedDB as Blobs, so each render needs an object URL.
 * The URL is revoked on unmount to avoid leaking memory as you scroll history.
 */
export function usePhotoUrl(photoId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoId) {
      setUrl(null);
      return;
    }
    let revoked = false;
    let objectUrl: string | null = null;

    getPhoto(photoId).then((photo) => {
      if (revoked || !photo) return;
      objectUrl = URL.createObjectURL(photo.blob);
      setUrl(objectUrl);
    });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [photoId]);

  return url;
}

interface PhotoThumbProps {
  photoId: string;
  className?: string;
  alt?: string;
  onClick?: () => void;
}

export default function PhotoThumb({ photoId, className, alt, onClick }: PhotoThumbProps) {
  const url = usePhotoUrl(photoId);

  if (!url) {
    return <div className={`animate-pulse bg-plum-100 ${className ?? ''}`} aria-hidden="true" />;
  }

  return (
    <img
      src={url}
      alt={alt ?? 'Logged item'}
      className={className}
      onClick={onClick}
      loading="lazy"
    />
  );
}
