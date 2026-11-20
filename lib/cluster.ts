export interface Clusterable {
  la: number;
  lo: number;
}

export interface PortCluster<T> {
  id: string;
  lat: number;
  lon: number;
  count: number;
  items: T[];
}

export interface ClusterResult<T> {
  clusters: PortCluster<T>[];
  singles: T[];
}

const CELL_PX = 46;

/**
 * 画面ピクセル基準のグリッドでクラスタリングする。
 * 依存ライブラリなしで Leaflet / Google Maps どちらでも同じ見た目になる。
 */
export function clusterItems<T extends Clusterable>(
  items: T[],
  zoom: number
): ClusterResult<T> {
  if (zoom >= 14) {
    return { clusters: [], singles: items };
  }
  const degPerPx = 360 / (256 * Math.pow(2, Math.max(1, zoom)));
  const cell = CELL_PX * degPerPx;

  const buckets = new Map<string, T[]>();
  for (const p of items) {
    const key = `${Math.floor((p.lo + 180) / cell)}:${Math.floor((p.la + 90) / cell)}`;
    const list = buckets.get(key);
    if (list) list.push(p);
    else buckets.set(key, [p]);
  }

  const clusters: PortCluster<T>[] = [];
  const singles: T[] = [];
  for (const [key, list] of buckets) {
    if (list.length === 1) {
      singles.push(list[0]);
      continue;
    }
    let lat = 0;
    let lon = 0;
    for (const p of list) {
      lat += p.la;
      lon += p.lo;
    }
    clusters.push({
      id: key,
      lat: lat / list.length,
      lon: lon / list.length,
      count: list.length,
      items: list,
    });
  }
  return { clusters, singles };
}

export function itemsInBounds<T extends Clusterable>(
  items: T[],
  bounds: { north: number; south: number; east: number; west: number }
): T[] {
  return items.filter(
    (p) =>
      p.la <= bounds.north &&
      p.la >= bounds.south &&
      p.lo <= bounds.east &&
      p.lo >= bounds.west
  );
}
