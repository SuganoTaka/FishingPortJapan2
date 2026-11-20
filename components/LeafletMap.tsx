"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { clusterItems, itemsInBounds } from "@/lib/cluster";
import type { LatLon, Port, Shop } from "@/lib/types";

interface Props {
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
}

const BASES = {
  pale: { label: "淡色", url: "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png" },
  std: { label: "標準", url: "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png" },
  photo: { label: "写真", url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg" },
} as const;

type BaseKey = keyof typeof BASES;

const ATTRIB =
  '&copy; <a href="https://www.gsi.go.jp/" target="_blank" rel="noreferrer">国土地理院</a>' +
  ' ／ 漁港・港湾: <a href="https://nlftp.mlit.go.jp/ksj/" target="_blank" rel="noreferrer">国土数値情報</a>';

const portDotHtml = (p: Port, active: boolean) =>
  `<span class="port-dot ${p.k === "h" ? "port-dot--harbor" : ""} ${
    active ? "port-dot--active" : ""
  }"></span>`;

const shopDotHtml = (active: boolean) =>
  `<span class="shop-dot ${active ? "shop-dot--active" : ""}"></span>`;

const clusterSize = (count: number) =>
  count > 200 ? 46 : count > 40 ? 40 : count > 8 ? 34 : 28;

const clusterHtml = (count: number, kind: "port" | "shop") => {
  const size = clusterSize(count);
  const variant = kind === "shop" ? "cluster-dot--shop" : count > 40 ? "cluster-dot--lg" : "";
  return {
    size,
    html: `<span class="cluster-dot ${variant}" style="width:${size}px;height:${size}px">${count}</span>`,
  };
};

export default function LeafletMap({
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
}: Props) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseRef = useRef<L.TileLayer | null>(null);
  const portLayerRef = useRef<L.LayerGroup | null>(null);
  const shopLayerRef = useRef<L.LayerGroup | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const meRef = useRef<L.Marker | null>(null);
  const hadMeRef = useRef(false);

  const stateRef = useRef({
    ports,
    shops,
    selectedPortId,
    selectedShopId,
    onSelectPort,
    onSelectShop,
  });
  stateRef.current = { ports, shops, selectedPortId, selectedShopId, onSelectPort, onSelectShop };

  const [base, setBase] = useState<BaseKey>("pale");
  const [ready, setReady] = useState(false);

  const renderMarkers = useCallback(() => {
    const map = mapRef.current;
    const portLayer = portLayerRef.current;
    const shopLayer = shopLayerRef.current;
    if (!map || !portLayer || !shopLayer) return;

    const s = stateRef.current;
    portLayer.clearLayers();
    shopLayer.clearLayers();

    const b = map.getBounds();
    const pad = 0.2;
    const bounds = {
      north: b.getNorth() + pad,
      south: b.getSouth() - pad,
      east: b.getEast() + pad,
      west: b.getWest() - pad,
    };
    const zoom = map.getZoom();

    const visiblePorts = itemsInBounds(s.ports, bounds);
    const portGroups = clusterItems(visiblePorts, zoom);
    for (const p of portGroups.singles) {
      L.marker([p.la, p.lo], {
        icon: L.divIcon({
          className: "port-marker",
          html: portDotHtml(p, p.i === s.selectedPortId),
          iconSize: [13, 13],
          iconAnchor: [6.5, 6.5],
        }),
        keyboard: false,
        title: p.n,
        riseOnHover: true,
      })
        .on("click", () => s.onSelectPort(p))
        .addTo(portLayer);
    }
    for (const c of portGroups.clusters) {
      const { size, html } = clusterHtml(c.count, "port");
      L.marker([c.lat, c.lon], {
        icon: L.divIcon({
          className: "port-marker",
          html,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
        keyboard: false,
      })
        .on("click", () => map.setView([c.lat, c.lon], Math.min(18, map.getZoom() + 2)))
        .addTo(portLayer);
    }

    const visibleShops = itemsInBounds(s.shops, bounds);
    const shopGroups = clusterItems(visibleShops, zoom);
    for (const shop of shopGroups.singles) {
      L.marker([shop.la, shop.lo], {
        icon: L.divIcon({
          className: "port-marker",
          html: shopDotHtml(shop.i === s.selectedShopId),
          iconSize: [11, 11],
          iconAnchor: [5.5, 5.5],
        }),
        keyboard: false,
        title: shop.n,
        riseOnHover: true,
      })
        .on("click", () => s.onSelectShop(shop))
        .addTo(shopLayer);
    }
    for (const c of shopGroups.clusters) {
      const { size, html } = clusterHtml(c.count, "shop");
      L.marker([c.lat, c.lon], {
        icon: L.divIcon({
          className: "port-marker",
          html,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
        keyboard: false,
      })
        .on("click", () => map.setView([c.lat, c.lon], Math.min(18, map.getZoom() + 2)))
        .addTo(shopLayer);
    }
  }, []);

  useEffect(() => {
    if (!holderRef.current || mapRef.current) return;

    const map = L.map(holderRef.current, {
      center: [37.4, 137.0],
      zoom: 5,
      zoomSnap: 0.5,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
      worldCopyJump: true,
    });
    mapRef.current = map;
    L.control.zoom({ position: "bottomright" }).addTo(map);

    baseRef.current = L.tileLayer(BASES.pale.url, {
      maxZoom: 18,
      attribution: ATTRIB,
      crossOrigin: true,
    }).addTo(map);

    portLayerRef.current = L.layerGroup().addTo(map);
    shopLayerRef.current = L.layerGroup().addTo(map);

    const width = holderRef.current.clientWidth;
    map.setView([37.4, 137.0], width < 700 ? 4.5 : 5.5);

    let scheduled = false;
    const onMove = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        renderMarkers();
      });
    };
    map.on("moveend zoomend", onMove);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(holderRef.current);

    setReady(true);

    return () => {
      ro.disconnect();
      map.off("moveend zoomend", onMove);
      map.remove();
      mapRef.current = null;
      portLayerRef.current = null;
      shopLayerRef.current = null;
      baseRef.current = null;
      routeRef.current = null;
      meRef.current = null;
    };
  }, [renderMarkers]);

  useEffect(() => {
    if (!ready) return;
    renderMarkers();
  }, [ready, ports, shops, selectedPortId, selectedShopId, renderMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (baseRef.current) map.removeLayer(baseRef.current);
    baseRef.current = L.tileLayer(BASES[base].url, {
      maxZoom: 18,
      attribution: ATTRIB,
      crossOrigin: true,
    }).addTo(map);
  }, [base, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeRef.current) {
      map.removeLayer(routeRef.current);
      routeRef.current = null;
    }
    if (routeGeometry && routeGeometry.length > 1) {
      routeRef.current = L.polyline(routeGeometry, {
        color: "#c2412f",
        weight: 3,
        opacity: 0.85,
      }).addTo(map);
      map.fitBounds(routeRef.current.getBounds(), { padding: [48, 48], maxZoom: 13 });
    }
  }, [routeGeometry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (meRef.current) {
      map.removeLayer(meRef.current);
      meRef.current = null;
    }
    if (me) {
      meRef.current = L.marker([me.lat, me.lon], {
        icon: L.divIcon({
          className: "port-marker",
          html: `<span class="me-dot"></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
        keyboard: false,
        interactive: false,
      }).addTo(map);
      if (!hadMeRef.current) {
        hadMeRef.current = true;
        map.flyTo([me.lat, me.lon], Math.max(map.getZoom(), 9), { duration: 0.9 });
      }
    } else {
      hadMeRef.current = false;
    }
  }, [me, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusPoint || focusToken === 0) return;
    map.flyTo([focusPoint.lat, focusPoint.lon], Math.max(map.getZoom(), 12), { duration: 0.7 });
  }, [focusPoint, focusToken]);

  return (
    <div className="relative w-full h-full">
      <div ref={holderRef} className="absolute inset-0 z-0" aria-label="漁港・港湾・釣具店の地図" />

      <div className="absolute top-3 right-3 z-[500] flex border border-ink/25 bg-paper-2 shadow-panel overflow-hidden">
        {(Object.keys(BASES) as BaseKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setBase(key)}
            className={[
              "px-2.5 py-1 text-[11px] transition-colors",
              base === key ? "bg-ink text-paper-2" : "text-ink-2 hover:bg-paper",
            ].join(" ")}
          >
            {BASES[key].label}
          </button>
        ))}
      </div>
    </div>
  );
}
