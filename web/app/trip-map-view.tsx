'use client';

import 'leaflet/dist/leaflet.css';
import { divIcon, latLngBounds } from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { MapPoint, TripMap } from '@/lib/trip-map';

const DEFAULT_ZOOM = 12;

function numberedIcon(order: number) {
  return divIcon({
    className: 'map-marker',
    html: `<span>${order}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

const destinationIcon = divIcon({
  className: 'map-marker map-marker-destination',
  html: '<span aria-hidden="true"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11],
});

function FitToPoints({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(latLngBounds(points.map((point) => [point.lat, point.lon])), { padding: [32, 32] });
  }, [map, points]);
  return null;
}

export function TripMapView({ data }: { data: TripMap }) {
  const origin = data.points[0] ?? data.center;
  if (!origin) return <p className="muted">Destination introuvable sur la carte.</p>;

  return (
    <MapContainer center={[origin.lat, origin.lon]} zoom={DEFAULT_ZOOM} scrollWheelZoom={false} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {data.points.length > 1 && (
        <Polyline positions={data.points.map((point) => [point.lat, point.lon])} pathOptions={{ color: '#2563eb', weight: 2, dashArray: '6 6' }} />
      )}
      {data.points.length === 0 && data.center && (
        <Marker position={[data.center.lat, data.center.lon]} icon={destinationIcon} title={data.center.label}>
          <Popup>{data.center.label}</Popup>
        </Marker>
      )}
      {data.points.map((point) => (
        <Marker key={point.order} position={[point.lat, point.lon]} icon={numberedIcon(point.order)} title={point.name}>
          <Popup>
            <strong>
              {point.order}. {point.name}
            </strong>
            {point.day !== null && <div>Jour {point.day}</div>}
            {point.note && <div>{point.note}</div>}
            <small>{point.label}</small>
          </Popup>
        </Marker>
      ))}
      <FitToPoints points={data.points} />
    </MapContainer>
  );
}
