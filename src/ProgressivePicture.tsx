import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react';

/**
 * One image variant. Exactly the shape `vite-imagetools` returns for
 * `?w=30;480;1440&format=avif;webp&as=metadata`, but any array of this shape works.
 */
export interface ImageSource {
  src: string;
  width: number;
  height: number;
  format: string;
}

export interface ProgressivePictureProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Ordered image variants. Any format/width mix; grouped and sorted internally. */
  sources: ImageSource[];
  /** Required. Pass "" for decorative images. */
  alt: string;
  /** CSS aspect-ratio. A string applies at all widths; the object form switches at 768px. */
  ratio?: string | { mobile: string; desktop: string };
  /** Placeholder blur radius. Default '2rem'. */
  blur?: string;
  /** Default 'cover'. */
  objectFit?: CSSProperties['objectFit'];
  /** Default '100vw'. Must be a valid source-size list. */
  sizes?: string;
  /** Default 'lazy'. Use 'eager' for LCP images. */
  loading?: 'lazy' | 'eager';
  /** Maps to the img fetchpriority attribute. */
  fetchPriority?: 'high' | 'low' | 'auto';
  /** Override the placeholder URL, or false to disable blur-up entirely. */
  placeholder?: string | false;
  /** Escape hatch onto the underlying <img>. */
  imgProps?: ComponentPropsWithoutRef<'img'>;
}

/**
 * `<picture>` picks the first `<source>` the browser supports, so source order is
 * preference order. Deriving it from the input array would make the output depend on the
 * order of `format=` in an imagetools query string, so it is fixed here instead.
 */
const FORMAT_PREFERENCE = ['avif', 'webp', 'png', 'jpeg', 'jpg', 'gif'];

// ponytail: only the formats whose MIME subtype differs from the format name.
// Anything else passes through as `image/<format>`.
const MIME_SUBTYPE: Record<string, string> = { jpg: 'jpeg', svg: 'svg+xml' };

/** Group by format, order groups by preference, sort each group ascending by width. */
function groupByFormat(sources: ImageSource[]): ImageSource[][] {
  const groups = new Map<string, ImageSource[]>();
  for (const source of sources) {
    const group = groups.get(source.format);
    if (group) group.push(source);
    else groups.set(source.format, [source]);
  }

  const rank = (format: string) => {
    const index = FORMAT_PREFERENCE.indexOf(format);
    return index === -1 ? FORMAT_PREFERENCE.length : index;
  };

  // Map keeps insertion order and sort is stable, so unrecognised formats land after the
  // known ones in first-appearance order.
  return [...groups.values()]
    .sort((a, b) => rank(a[0].format) - rank(b[0].format))
    .map((group) => [...group].sort((a, b) => a.width - b.width));
}

const cx = (...values: unknown[]) => values.filter(Boolean).join(' ');

export function ProgressivePicture({
  sources,
  alt,
  ratio,
  blur,
  objectFit,
  sizes = '100vw',
  loading = 'lazy',
  fetchPriority,
  placeholder,
  imgProps,
  className,
  style,
  ...rest
}: ProgressivePictureProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // A cached image can finish before React attaches onLoad, in which case the event
  // never fires and the blur would never clear.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  const groups = groupByFormat(sources);
  if (groups.length === 0) return null;

  // The last group is the most broadly compatible format present. `<picture>` negotiation
  // does not apply to the `<img src>` fallback or to a CSS background, so both come from it.
  const fallbackGroup = groups[groups.length - 1];
  const fallbackSrc = fallbackGroup[fallbackGroup.length - 1].src;
  const placeholderSrc =
    placeholder === undefined ? fallbackGroup[0].src : placeholder;

  const mobileRatio = typeof ratio === 'string' ? ratio : ratio?.mobile;
  const desktopRatio = typeof ratio === 'string' ? ratio : ratio?.desktop;

  // Only emit a custom property when the prop was given, so the stylesheet's defaults —
  // and any consumer override of them — stay in play. Consumer `style` is spread last so
  // it wins per property instead of replacing the whole object.
  const containerStyle = {
    ...(mobileRatio ? { '--rpp-ratio': mobileRatio } : null),
    ...(desktopRatio ? { '--rpp-ratio-desktop': desktopRatio } : null),
    ...(blur ? { '--rpp-blur': blur } : null),
    ...(objectFit ? { '--rpp-object-fit': objectFit } : null),
    ...(placeholderSrc
      ? { backgroundImage: `url("${placeholderSrc.replaceAll('"', '%22')}")` }
      : null),
    ...style,
  } as CSSProperties;

  // `error` is terminal too: otherwise a broken image sits behind the blur forever and
  // neither the broken-image affordance nor the alt text ever surfaces.
  const settle = () => setLoaded(true);

  return (
    <div
      className={cx(
        'rpp-root',
        loaded && 'rpp-loaded',
        !placeholderSrc && 'rpp-plain',
        className,
      )}
      style={containerStyle}
      {...rest}
    >
      <picture className="rpp-picture">
        {groups.map((group) => (
          <source
            key={group[0].format}
            type={`image/${MIME_SUBTYPE[group[0].format] ?? group[0].format}`}
            srcSet={group.map((s) => `${s.src} ${s.width}w`).join(', ')}
            sizes={sizes}
          />
        ))}
        <img
          {...imgProps}
          ref={imgRef}
          className={cx('rpp-img', imgProps?.className)}
          src={fallbackSrc}
          alt={alt}
          sizes={sizes}
          loading={loading}
          fetchPriority={fetchPriority}
          onLoad={(event) => {
            imgProps?.onLoad?.(event);
            settle();
          }}
          onError={(event) => {
            imgProps?.onError?.(event);
            settle();
          }}
        />
      </picture>
    </div>
  );
}
