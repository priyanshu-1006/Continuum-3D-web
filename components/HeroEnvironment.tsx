'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './HeroEnvironment.module.css';

const scenery = {
  sky: { src: '/continuum/layers/sky.webp', mobile: '/continuum/layers/sky-mobile.webp', width: 1672, height: 941 },
  mountains: { src: '/continuum/layers/mountains.webp', mobile: '/continuum/layers/mountains-mobile.webp', width: 2172, height: 724 },
  valley: { src: '/continuum/layers/landscape.webp', mobile: '/continuum/layers/landscape-mobile.webp', width: 2172, height: 724 },
  path: { src: '/continuum/layers/castle-pathway.webp', mobile: '/continuum/layers/castle-pathway-mobile.webp', width: 1672, height: 941 },
};

type LayerProps = {
  name: keyof typeof scenery;
  className: string;
  priority?: boolean;
};

function Layer({ name, className, priority }: LayerProps) {
  const { src, mobile, width, height } = scenery[name];
  return (
    <picture className={className}>
      <source media="(max-width: 767px)" srcSet={mobile} />
      <img
        src={src}
        width={width}
        height={height}
        alt=""
        draggable={false}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'auto' : 'async'}
      />
    </picture>
  );
}

export default function HeroEnvironment({ children, motion }: { children: ReactNode; motion: boolean }) {
  const environment = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = environment.current;
    if (!motion || !node) return;

    const preference = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const journey = node.closest<HTMLElement>('.journey');
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    function paint() {
      frame = 0;
      if (!node || !preference.matches || document.hidden || journey?.dataset.heroWorld === 'entered') return;
      x += (targetX - x) * 0.12;
      y += (targetY - y) * 0.12;
      node.style.setProperty('--hero-pointer-x', x.toFixed(4));
      node.style.setProperty('--hero-pointer-y', y.toFixed(4));
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > 0.002) frame = requestAnimationFrame(paint);
    }

    function move(event: PointerEvent) {
      if (event.pointerType === 'touch' || !preference.matches || journey?.dataset.heroWorld === 'entered') return;
      targetX = event.clientX / window.innerWidth * 2 - 1;
      targetY = event.clientY / window.innerHeight * 2 - 1;
      if (!frame) frame = requestAnimationFrame(paint);
    }

    function center() {
      targetX = 0;
      targetY = 0;
      if (!frame) frame = requestAnimationFrame(paint);
    }

    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      targetX = 0;
      targetY = 0;
      x = 0;
      y = 0;
      node?.style.removeProperty('--hero-pointer-x');
      node?.style.removeProperty('--hero-pointer-y');
    }

    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', center);
    window.addEventListener('blur', center);
    document.addEventListener('visibilitychange', reset);
    preference.addEventListener('change', reset);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', center);
      window.removeEventListener('blur', center);
      document.removeEventListener('visibilitychange', reset);
      preference.removeEventListener('change', reset);
      reset();
    };
  }, [motion]);

  return (
    <div ref={environment} className={styles.composition} data-motion={motion}>
      <div className={styles.backdrop} data-hero-scenery>
        <Layer name="sky" className={styles.sky} priority />
        <div className={styles.clouds}>
          <img className={styles.cloudNear} src="/continuum/layers/cloud-near.webp" width="620" height="251" alt="" decoding="async" />
          <img className={styles.cloudMid} src="/continuum/layers/cloud-mid.webp" width="485" height="194" alt="" decoding="async" />
          <img className={styles.cloudFar} src="/continuum/layers/cloud-far.webp" width="212" height="87" alt="" decoding="async" />
        </div>
        <Layer name="mountains" className={styles.mountains} />
        <div className={styles.meadow} />
        <Layer name="valley" className={styles.valley} />
      </div>

      {children}

      <div className={styles.foreground} data-hero-scenery>
        <div className={styles.approach}>
          <Layer name="path" className={styles.path} priority />
          <i className={styles.leftLantern} /><i className={styles.rightLantern} />
        </div>
        <img className={styles.leftTree} src="/continuum/layers/forest-left-mobile.webp" width="520" height="523" alt="" decoding="async" />
        <img className={styles.rightTree} src="/continuum/layers/forest-right-mobile.webp" width="520" height="523" alt="" decoding="async" />
        <div className={styles.sunlight} />
        {motion && <div className={styles.dust}><i /><i /><i /><i /><i /></div>}
      </div>
    </div>
  );
}
