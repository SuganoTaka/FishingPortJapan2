"use client";

import dynamic from "next/dynamic";
import type { LatLon, Port, Shop } from "@/lib/types";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
const GoogleMap = dynamic(() => import("./GoogleMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div className="w-full h-full chart-paper flex items-center justify-center">
      <span className="text-[11px] text-ink-3 tracking-widest">地図を読み込み中…</span>
    </div>
  );
}

export interface MapViewProps {
  ports: Port[];
  shops: Shop[];
  selectedPortId: string | null;
  selectedShopId: string | null;
  onSelectPort: (p: Port) => void;
  onSelectShop: (s: Shop) => void;
  me: LatLon | null;
  routeGeometry: [number, number][] | null;
  focusPoint: LatLon | null;
  focusToken: number;
  googleApiKey?: string;
  googleMapId?: string;
}

export default function MapView({
  ports,
  shops,
  selectedPortId,
  selectedShopId,
  onSelectPort,
  onSelectShop,
  me,
  routeGeometry,
  focusPoint,
  focusToken,
  googleApiKey,
  googleMapId,
}: MapViewProps) {
  const common = {
    ports,
    shops,
    selectedPortId,
    selectedShopId,
    onSelectPort,
    onSelectShop,
    me,
    routeGeometry,
    focusPoint,
    focusToken,
  };

  if (googleApiKey) {
    return <GoogleMap {...common} apiKey={googleApiKey} mapId={googleMapId} />;
  }
  return <LeafletMap {...common} />;
}
