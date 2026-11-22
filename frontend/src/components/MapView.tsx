import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ParcelFeature } from "../services/api";

export const statusColor = (s: string | null) => s === "officer_verified" ? "#16A34A" : s === "rejected" ? "#DC2626" : s === "processed" ? "#2563EB" : s ? "#D97706" : "#6B7280";

interface Props { features: ParcelFeature[]; selected: string | null; onSelect: (id: string) => void; showHistory: boolean; showBoundaries: boolean; height?: number }

/** Leaflet map over an OpenStreetMap basemap (needs internet for tiles; outlines still draw without it). */
export default function MapView({ features, selected, onSelect, showHistory, showBoundaries, height = 460 }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current).setView([22.5, 79], 5);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map.current);
    layer.current = L.featureGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g || !map.current) return;
    g.clearLayers();
    const ll = (f: { coordinates: number[][][] }) => f.coordinates[0].map(([x, y]) => [y, x] as [number, number]);
    for (const f of features) {
      const k = f.properties.kind ?? "parcel";
      if (k !== "parcel" && !showBoundaries) continue;
      const style: L.PolylineOptions = k === "village" ? { color: "#7C3AED", weight: 2, dashArray: "6 4", fill: false } : k === "district" ? { color: "#0B2545", weight: 3, fill: false } : { color: selected === f.id ? "#2563EB" : statusColor(f.properties.status), weight: selected === f.id ? 4 : 2, fillOpacity: 0.3 };
      const poly = L.polygon(ll(f.geometry), style).addTo(g);
      poly.bindTooltip(`${k === "parcel" ? "" : k + ": "}${f.properties.survey}`, { permanent: k === "parcel", direction: "center", className: "il-label" });
      if (k === "parcel") poly.on("click", () => onSelect(f.id));
      if (showHistory && k === "parcel") f.properties.history?.forEach((h) => L.polygon(ll(h.geometry), { color: "#6B7280", weight: 2, dashArray: "4 4", fill: false }).bindTooltip("previous boundary").addTo(g));
    }
    if (features.length && g.getLayers().length) map.current.fitBounds(g.getBounds(), { padding: [30, 30], maxZoom: 18 });
  }, [features, selected, showHistory, showBoundaries, onSelect]);

  return <div ref={el} style={{ height }} className="w-full rounded-lg z-0" data-testid="map" />;
}
