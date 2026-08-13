import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressivePicture, type ImageSource } from './ProgressivePicture';

const source = (
  format: string,
  width: number,
  src = `/img-${width}.${format}`,
): ImageSource => ({ src, width, height: Math.round(width * 0.6), format });

/** What `?w=30;480&format=avif;webp&as=metadata` gives you. */
const SOURCES: ImageSource[] = [
  source('avif', 30),
  source('avif', 480),
  source('webp', 30),
  source('webp', 480),
];

const renderPicture = (props: Partial<Parameters<typeof ProgressivePicture>[0]> = {}) => {
  const { container } = render(
    <ProgressivePicture sources={SOURCES} alt="A bike" {...props} />,
  );
  const root = container.firstElementChild as HTMLElement | null;
  return {
    container,
    root,
    img: container.querySelector('img') as HTMLImageElement,
    sources: [...container.querySelectorAll('source')],
  };
};

describe('source generation', () => {
  it('emits one <source> per format group with `src widthw` entries', () => {
    const { sources } = renderPicture();

    expect(sources).toHaveLength(2);
    expect(sources[0].getAttribute('type')).toBe('image/avif');
    expect(sources[0].getAttribute('srcset')).toBe(
      '/img-30.avif 30w, /img-480.avif 480w',
    );
    expect(sources[1].getAttribute('type')).toBe('image/webp');
  });

  it('orders groups by the preference table, unknown formats last', () => {
    const { sources } = renderPicture({
      sources: [
        source('heic', 100),
        source('webp', 100),
        source('bmp', 100),
        source('avif', 100),
        source('gif', 100),
      ],
    });

    expect(sources.map((s) => s.getAttribute('type'))).toEqual([
      'image/avif',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/bmp',
    ]);
  });

  it('sorts widths ascending within a group regardless of input order', () => {
    const { sources } = renderPicture({
      sources: [source('webp', 1440), source('webp', 30), source('webp', 480)],
    });

    expect(sources[0].getAttribute('srcset')).toBe(
      '/img-30.webp 30w, /img-480.webp 480w, /img-1440.webp 1440w',
    );
  });

  it('falls back to the widest entry of the last group', () => {
    expect(renderPicture().img.getAttribute('src')).toBe('/img-480.webp');
  });

  it('renders nothing for an empty sources array', () => {
    const { container } = render(<ProgressivePicture sources={[]} alt="" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('placeholder', () => {
  it('uses the narrowest entry of the last group', () => {
    expect(renderPicture().root?.style.backgroundImage).toBe('url("/img-30.webp")');
  });

  it('emits no background-image and no blur when disabled', () => {
    const { root } = renderPicture({ placeholder: false });

    expect(root?.style.backgroundImage).toBe('');
    expect(root?.className).toContain('rpp-plain');
  });

  it('uses an explicit placeholder verbatim', () => {
    const { root } = renderPicture({ placeholder: 'data:image/png;base64,AAAA' });
    expect(root?.style.backgroundImage).toBe('url("data:image/png;base64,AAAA")');
  });
});

/**
 * happy-dom never fetches, but reports every image as `complete`. Pin it so the mount
 * check and the event path can each be tested for what they actually do.
 */
function withComplete<T>(complete: boolean, run: () => T): T {
  const original = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    'complete',
  );
  Object.defineProperty(HTMLImageElement.prototype, 'complete', {
    configurable: true,
    get: () => complete,
  });

  try {
    return run();
  } finally {
    if (original) {
      Object.defineProperty(HTMLImageElement.prototype, 'complete', original);
    } else {
      delete (HTMLImageElement.prototype as { complete?: boolean }).complete;
    }
  }
}

describe('load state', () => {
  it('is loaded on mount when the image is already complete', () => {
    withComplete(true, () => {
      expect(renderPicture().root?.className).toContain('rpp-loaded');
    });
  });

  it('becomes loaded on the load event', () => {
    withComplete(false, () => {
      const { root, img } = renderPicture();

      expect(root?.className).not.toContain('rpp-loaded');
      fireEvent.load(img);
      expect(root?.className).toContain('rpp-loaded');
    });
  });

  it('becomes loaded on the error event so the alt text surfaces', () => {
    withComplete(false, () => {
      const { root, img } = renderPicture();

      expect(root?.className).not.toContain('rpp-loaded');
      fireEvent.error(img);
      expect(root?.className).toContain('rpp-loaded');
    });
  });
});

describe('pass-through', () => {
  it('merges a consumer style instead of replacing the custom properties', () => {
    const { root } = renderPicture({
      ratio: '4 / 3',
      style: { borderRadius: '8px' },
    });

    expect(root?.style.borderRadius).toBe('8px');
    expect(root?.style.getPropertyValue('--rpp-ratio')).toBe('4 / 3');
    expect(root?.style.backgroundImage).toBe('url("/img-30.webp")');
  });

  it('merges className with rpp-root', () => {
    const { root } = renderPicture({ className: 'my-hero' });

    expect(root?.className).toContain('rpp-root');
    expect(root?.className).toContain('my-hero');
  });

  it('resolves both ratio forms, including auto', () => {
    const { root } = renderPicture({ ratio: { mobile: '1 / 1', desktop: 'auto' } });

    expect(root?.style.getPropertyValue('--rpp-ratio')).toBe('1 / 1');
    expect(root?.style.getPropertyValue('--rpp-ratio-desktop')).toBe('auto');

    const plain = renderPicture({ ratio: '16 / 9' });
    expect(plain.root?.style.getPropertyValue('--rpp-ratio')).toBe('16 / 9');
    expect(plain.root?.style.getPropertyValue('--rpp-ratio-desktop')).toBe('16 / 9');
  });

  it('puts loading, fetchPriority and sizes on the img', () => {
    const { img, sources } = renderPicture({
      loading: 'eager',
      fetchPriority: 'high',
      sizes: '(min-width: 768px) 50vw, 100vw',
    });

    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
    expect(img.getAttribute('sizes')).toBe('(min-width: 768px) 50vw, 100vw');
    expect(sources[0].getAttribute('sizes')).toBe('(min-width: 768px) 50vw, 100vw');
  });

  it('defaults sizes to 100vw rather than an invalid percentage', () => {
    expect(renderPicture().img.getAttribute('sizes')).toBe('100vw');
  });

  it('exposes the required alt text', () => {
    renderPicture();
    expect(screen.getByAltText('A bike')).toBeTruthy();
  });
});
