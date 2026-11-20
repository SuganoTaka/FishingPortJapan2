"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clusterItems, itemsInBounds } from "@/lib/cluster";
import type { LatLon, Port, Shop } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  apiKey: string;
  mapId?: string;
}

declare global {
  interface Window {
    google?: any;
    __vfGoogleMapsPromise?: Promise<any>;
  }
}

function loadMaps(apiKey: string): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (window.__vfGoogleMapsPromise) return window.__vfGoogleMapsPromise;

  window.__vfGoogleMapsPromise = new Promise((resolve, reject) => {
    const cbName = "__vfGoogleMapsInit";
    (window as any)[cbName] = () => resolve(window.google);
    const s = document.createElement("script");
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&v=weekly&libraries=marker&language=ja&region=JP&loading=async&callback=${cbName}`;
    s.async = true;
    s.onerror = () => reject(new Error("Google Maps の読み込みに失敗しました"));
    document.head.appendChild(s);
  });
  return window.__vfGoogleMapsPromise;
}

const clusterSize = (count: number) =>
  count > 200 ? 46 : count > 40 ? 40 : count > 8 ? 34 : 28;

export default function GoogleMap({
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
  apiKey,
  mapId = "DEMO_MAP_ID",
}: Props) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeRef = useRef<any>(null);
  const meMarkerRef = useRef<any>(null);
  const markerLibRef = useRef<any>(null);
  const stateRef = useRef({ ports, shops, selectedPortId, selectedShopId, onSelectPort, onSelectShop });
  stateRef.current = { ports, shops, selectedPortId, selectedShopId, onSelectPort, onSelectShop };

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const renderMarkers = useCallback(() => {
    const map = mapRef.current;
    const lib = markerLibRef.current;
    if (!map || !lib) return;
    const { AdvancedMarkerElement } = lib;
    const s = stateRef.current;

    for (const m of markersRef.current) m.map = null;
    markersRef.current = [];

    const bounds = map.getBounds();
    if (!bounds) return;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const box = {
      north: ne.lat() + 0.2,
      south: sw.lat() - 0.2,
      east: ne.lng() + 0.2,
      west: sw.lng() - 0.2,
    };
    const zoom = Math.round(map.getZoom() ?? 5);

    const addMarker = (
      lat: number,
      lon: number,
      html: string,
      onClick: () => void,
      title: string
    ) => {
      const el = document.createElement("div");
      el.innerHTML = html;
      el.style.cursor = "pointer";
      el.title = title;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onClick();
      });
      markersRef.current.push(
        new AdvancedMarkerElement({ map, position: { lat, lng: lon }, content: el, title })
      );
    };

    const portGroups = clusterItems(itemsInBounds(s.ports, box), zoom);
    for (const p of portGroups.singles) {
      addMarker(
        p.la,
        p.lo,
        `<span class="port-dot ${p.k === "h" ? "port-dot--harbor" : ""} ${
          p.i === s.selectedPortId ? "port-dot--active" : ""
        }"></span>`,
        () => s.onSelectPort(p),
        p.n
      );
    }
    for (const c of portGroups.clusters) {
      const size = clusterSize(c.count);
      addMarker(
        c.lat,
        c.lon,
        `<span class="cluster-dot ${c.count > 40 ? "cluster-dot--lg" : ""}" style="width:${size}px;height:${size}px">${c.count}</span>`,
        () => {
          map.setZoom(Math.min(18, (map.getZoom() ?? 5) + 2));
          map.panTo({ lat: c.lat, lng: c.lon });
        },
        `${c.count}件`
      );
    }

    const shopGroups = clusterItems(itemsInBounds(s.shops, box), zoom);
    for (const shop of shopGroups.singles) {
      addMarker(
        shop.la,
        shop.lo,
        `<span class="shop-dot ${shop.i === s.selectedShopId ? "shop-dot--active" : ""}"></span>`,
        () => s.onSelectShop(shop),
        shop.n
      );
    }
    for (const c of shopGroups.clusters) {
      const size = clusterSize(c.count);
      addMarker(
        c.lat,
        c.lon,
        `<span class="cluster-dot cluster-dot--shop" style="width:${size}px;height:${size}px">${c.count}</span>`,
        () => {
          map.setZoom(Math.min(18, (map.getZoom() ?? 5) + 2));
          map.panTo({ lat: c.lat, lng: c.lon });
        },
        `釣具店 ${c.count}件`
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let listeners: any[] = [];
    loadMaps(apiKey)
      .then(async (google) => {
        if (cancelled || !holderRef.current) return;
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
        markerLibRef.current = { AdvancedMarkerElement };

        const map = new google.maps.Map(holderRef.current, {
          center: { lat: 37.4, lng: 137.0 },
          zoom: 5,
          minZoom: 4,
          maxZoom: 18,
          mapId,
          mapTypeControl: true,
          mapTypeControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT,
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          },
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        const idle = map.addListener("idle", () => renderMarkers());
        const ro = new ResizeObserver(() => google.maps.event.trigger(map, "resize"));
        ro.observe(holderRef.current);
        listeners = [idle];
        (map as any).__ro = ro;
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err?.message ?? err));
      });

    return () => {
      cancelled = true;
      listeners.forEach((l) => l.remove?.());
      const map = mapRef.current;
      if (map?.__ro) map.__ro.disconnect();
      for (const m of markersRef.current) m.map = null;
      markersRef.current = [];
      mapRef.current = null;
    };
  }, [apiKey, mapId, renderMarkers]);

  useEffect(() => {
    if (!ready) return;
    renderMarkers();
  }, [ready, ports, shops, selectedPortId, selectedShopId, renderMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    if (routeRef.current) {
      routeRef.current.setMap(null);
      routeRef.current = null;
    }
    if (routeGeometry && routeGeometry.length > 1) {
      const path = routeGeometry.map(([lat, lon]) => ({ lat, lng: lon }));
      routeRef.current = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "#c2412f",
        strokeOpacity: 0.9,
        strokeWeight: 3,
        map,
      });
      const b = new window.google.maps.LatLngBounds();
      path.forEach((pt) => b.extend(pt));
      map.fitBounds(b, 48);
    }
  }, [routeGeometry, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = markerLibRef.current;
    if (!map || !lib || !ready) return;
    if (meMarkerRef.current) {
      meMarkerRef.current.map = null;
      meMarkerRef.current = null;
    }
    if (me) {
      const el = document.createElement("div");
      el.innerHTML = `<span class="me-dot"></span>`;
      meMarkerRef.current = new lib.AdvancedMarkerElement({
        map,
        position: { lat: me.lat, lng: me.lon },
        content: el,
      });
    }
  }, [me, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusPoint || focusToken === 0) return;
    map.panTo({ lat: focusPoint.lat, lng: focusPoint.lon });
    map.setZoom(Math.max(map.getZoom() ?? 5, 12));
  }, [focusPoint, focusToken]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 bg-paper chart-paper">
        <div className="max-w-md border border-signal/40 bg-paper-2 p-4">
          <p className="text-[13px] font-semibold text-signal">Google マップを表示できません</p>
          <p className="mt-1.5 text-[11.5px] text-ink-2 leading-relaxed">{error}</p>
          <p className="mt-2 text-[11px] text-ink-3 leading-relaxed">
            API キー・課金設定・Maps JavaScript API の有効化を確認してください。
            キーを外すと国土地理院タイル（Leaflet）で表示されます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={holderRef} className="absolute inset-0 z-0" aria-label="漁港・港湾・釣具店の地図" />
    </div>
  );
}
