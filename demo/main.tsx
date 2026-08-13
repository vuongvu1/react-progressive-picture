import { createRoot } from 'react-dom/client';
import { ProgressivePicture, type ImageSource } from '../src';

/** Hand-written here; in a Vite app this is what `?...&as=metadata` hands you. */
const scene: ImageSource[] = [
  { src: '/scene-30.webp', width: 30, height: 17, format: 'webp' },
  { src: '/scene-480.webp', width: 480, height: 270, format: 'webp' },
  { src: '/scene-1200.webp', width: 1200, height: 675, format: 'webp' },
  { src: '/scene-30.jpg', width: 30, height: 17, format: 'jpeg' },
  { src: '/scene-480.jpg', width: 480, height: 270, format: 'jpeg' },
  { src: '/scene-1200.jpg', width: 1200, height: 675, format: 'jpeg' },
];

createRoot(document.getElementById('root')!).render(
  <ProgressivePicture
    sources={scene}
    alt="Moonrise over three peaks"
    ratio="16 / 9"
    loading="eager"
  />,
);
