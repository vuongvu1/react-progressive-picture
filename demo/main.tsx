import { createRoot } from 'react-dom/client';
import { ProgressivePicture, type ImageSource } from '../src';

/** Hand-written here; in a Vite app this is what `?...&as=metadata` hands you. */
const bird: ImageSource[] = [
  { src: '/bird-30.webp', width: 30, height: 20, format: 'webp' },
  { src: '/bird-480.webp', width: 480, height: 320, format: 'webp' },
  { src: '/bird-1280.webp', width: 1280, height: 853, format: 'webp' },
  { src: '/bird-30.jpg', width: 30, height: 20, format: 'jpeg' },
  { src: '/bird-480.jpg', width: 480, height: 320, format: 'jpeg' },
  { src: '/bird-1280.jpg', width: 1280, height: 853, format: 'jpeg' },
];

createRoot(document.getElementById('root')!).render(
  <ProgressivePicture
    sources={bird}
    alt="A blue bird perched on a blossoming almond branch"
    ratio="3 / 2"
    loading="eager"
  />,
);
