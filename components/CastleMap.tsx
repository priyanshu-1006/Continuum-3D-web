'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { events } from '@/lib/events';
import { getRouteSample, JOURNEY_STOPS, WALK_ROUTE, type WorldPoint } from '@/lib/journey';

export function mapCoordinates([x, , z]: WorldPoint) {
  return [(31.5 - x) / 63 * 100, (31.5 - z) / 63 * 100];
}

const markers = events.map((event, index) => {
  const [x, y] = mapCoordinates(getRouteSample(JOURNEY_STOPS[index + 1]).position);
  return { event, x, y, offset: index % 2 === 0 ? -17 : 17 };
});
const [startX, startY] = mapCoordinates(getRouteSample(0).position);
const routePoints = WALK_ROUTE.map(mapCoordinates);
const routeSegments = routePoints.slice(1).map(([endX, endY], index) => {
  const [x, y] = routePoints[index];
  const dx = endX - x;
  const dy = endY - y;
  return { left: x + '%', top: y + '%', width: Math.hypot(dx, dy) + '%', transform: 'rotate(' + Math.atan2(dy, dx) + 'rad)' };
});

export default function CastleMap({ active, onNavigate }: { active: number; onNavigate: (index: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const choose = (index: number) => {
    onNavigate(index);
    setExpanded(false);
    if (expanded) toggleRef.current?.focus({ preventScroll: true });
  };

  return (
    <aside className={'castle-map' + (expanded ? ' is-expanded' : '')} aria-label="Castle map">
      <button ref={toggleRef} className="map-toggle" type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="map-stops">
        <span className="map-fold" aria-hidden="true"><i /><i /><i /></span>
        <span>Castle map</span>
        <span className="map-toggle-icon" aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      <div className="map-frame">
        <div className="map-sheet">
          <img src="/assets/castle-map.webp" alt="" width="1008" height="1008" />
          {routeSegments.map((style, index) => <span key={index} className="map-path" style={style} aria-hidden="true" />)}
          <span className="map-north" aria-hidden="true">N</span>
          <button type="button" className="map-entry" style={{ left: startX + '%', top: startY + '%' }} aria-label="Return to castle entrance" title="Castle entrance" onClick={() => choose(0)}>⌂</button>
          {markers.map(({ event, x, y, offset }, index) => (
            <button
              key={event.slug}
              type="button"
              className={'map-pin' + (active === index + 1 ? ' is-active' : '')}
              style={{ left: x + '%', top: y + '%', '--pin-offset': offset + 'px', '--pin-color': event.accent } as CSSProperties}
              aria-label={'Go to ' + event.title}
              aria-current={active === index + 1 ? 'step' : undefined}
              title={event.title}
              onClick={() => choose(index + 1)}
            >{index + 1}</button>
          ))}
          <span className="map-player" aria-hidden="true">▲</span>
        </div>
      </div>
      <div className="map-stops" id="map-stops">
        {events.map((event, index) => (
          <button type="button" key={event.slug} aria-current={active === index + 1 ? 'step' : undefined} onClick={() => choose(index + 1)}>
            <i style={{ background: event.accent }} aria-hidden="true">{index + 1}</i>{event.title}
          </button>
        ))}
      </div>
    </aside>
  );
}

