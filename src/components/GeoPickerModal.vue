<!-- 地图选点弹窗：点击地图录入经纬度，支持搜索地名与逆地理编码 -->
<template>
  <dialog ref="dlg" class="modal" @close="onNativeClose">
    <div class="modal-box w-11/12 max-w-4xl p-0 flex flex-col overflow-hidden">
      <!-- 标题栏 -->
      <div class="px-5 pt-4 pb-2 flex flex-wrap items-center gap-2">
        <h3 class="font-bold text-lg shrink-0">地图选点</h3>
        <div class="join ml-auto mr-2 shrink-0" title="切换底图来源（高德/天地图为国内可直接访问的地图服务）">
          <button
              v-for="t in TILES.slice(0, 3)"
              :key="t.name"
              class="btn btn-xs join-item"
              :class="tileName === t.name ? 'btn-primary' : ''"
              @click="switchTile(t.name)"
          >{{ t.label }}</button>
        </div>
        <form method="dialog" class="shrink-0">
          <button class="btn btn-sm btn-ghost btn-circle" aria-label="关闭">✕</button>
        </form>
      </div>

      <!-- 搜索行 -->
      <div class="px-5 pb-2 flex gap-2">
        <input
            v-model="keyword"
            type="text"
            class="input input-sm input-bordered w-full"
            placeholder="输入地名 / POI 搜索，回车定位（如：天安门）"
            @keyup.enter="doSearch"
        />
        <button class="btn btn-sm btn-primary shrink-0" :disabled="searching" @click="doSearch">
          {{ searching ? '搜索中…' : '搜索' }}
        </button>
        <button class="btn btn-sm shrink-0" title="定位到我的当前位置（需浏览器授权）" :disabled="locating" @click="locateMe">
          {{ locating ? '定位中…' : '⊕ 定位' }}
        </button>
        <button class="btn btn-sm shrink-0" title="回到上次选中的位置" :disabled="!picked" @click="flyToPicked">回中心</button>
      </div>

      <!-- 地图容器 -->
      <div class="px-5">
        <div
            ref="mapBox"
            class="geo-map w-full h-[420px] rounded-lg border border-base-300 cursor-crosshair overflow-hidden"
        ></div>
      </div>

      <!-- 选中结果编辑区 -->
      <div class="p-5 flex flex-col gap-2 text-sm">
        <div v-if="!picked" class="opacity-60 text-center py-1">
          在地图上任意位置单击即可录入经纬度；也可先搜索地名再微调。
        </div>
        <div v-else class="flex flex-col sm:flex-row gap-2">
          <label class="form-control grow min-w-28">
            <span class="label-text mb-1">纬度</span>
            <input v-model="pickLat" type="text" class="input input-bordered input-sm w-full font-mono"/>
          </label>
          <label class="form-control grow min-w-28">
            <span class="label-text mb-1">经度</span>
            <input v-model="pickLng" type="text" class="input input-bordered input-sm w-full font-mono"/>
          </label>
          <label class="form-control grow min-w-40">
            <span class="label-text mb-1">地点名称</span>
            <input v-model="pickLabel" type="text" class="input input-bordered input-sm w-full" placeholder="地名（可选）"/>
          </label>
        </div>
        <p v-if="picked" class="text-xs opacity-60">
          当前位置：<span class="font-mono">{{ pickLat }}, {{ pickLng }}</span>
          <span v-if="reverseLoading">（正在解析地名…）</span>
        </p>
      </div>

      <!-- 底部按钮 -->
      <div class="modal-action px-5 pb-4 mt-0 w-full">
        <form method="dialog" class="flex gap-2">
          <button class="btn btn-sm">取消</button>
          <button class="btn btn-sm btn-primary" :disabled="!picked" @click.prevent="confirmPick">确定录入</button>
        </form>
      </div>
    </div>
    <div class="modal-backdrop bg-black/50" @click="close">关闭</div>
  </dialog>
</template>

<script lang="ts" setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { popupTip } from '@/common/utils';

/** 确认选点后向父组件抛出经纬度与地名 */
const emit = defineEmits<{
  (e: 'confirm', payload: { lat: string; lng: string; label: string }): void;
  (e: 'closed'): void;
}>();

/** 弹窗打开状态由父组件控制 */
const props = defineProps<{ open: boolean }>();

/** 天地图公开演示 key（若失效，可切换到高德/OSM 底图，功能不受影响） */
const TIANDITU_TK = 'ea1990f425dbd6ad57e24f32d88223f1';

/** 底图源列表：优先国内可直接访问的地图服务（高德 / 天地图），并保留 OSM 作为兜底。
 *  注意：高德底图使用 GCJ-02 坐标系；天地图 img_w 瓦片为 Web Mercator（EPSG:3857）投影，
 *  与 WGS84 近似一致。在 GCJ-02 底图上点选时，内部会把点击坐标反算为 WGS84 再录入，
 *  保证 geo: URI 在手机地图 App（按 WGS84/GPS 解析）中显示位置正确。 */
const TILES = [
  {
    name: 'amap', label: '高德地图', crs: 'gcj02' as const,
    url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    subdomains: ['1', '2', '3', '4'],
    attribution: '&copy; 高德地图',
  },
  {
    name: 'amap-sat', label: '高德影像', crs: 'gcj02' as const,
    url: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    subdomains: ['1', '2', '3', '4'],
    attribution: '&copy; 高德地图',
  },
  {
    name: 'tiandu-img', label: '天地图影像', crs: 'wgs84' as const,
    url: `https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TIANDITU_TK}`,
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    attribution: '&copy; 国家地理信息公共服务平台 天地图',
  },
  {
    // 国外备选：当上述国内源都不可用时兜底（WGS84 坐标系）
    name: 'osm', label: 'OSM(备选)', crs: 'wgs84' as const,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; OpenStreetMap contributors',
  },
] as const;

type TileName = (typeof TILES)[number]['name'];

const dlg = ref<HTMLDialogElement>();
const mapBox = ref<HTMLDivElement>();
/** 当前生效的底图名（瓦片加载失败时可能自动切到备选 OSM） */
const tileName = ref<TileName>('amap');
/** 已尝试过的底图集合，避免失败回退时来回切换 */
let triedTiles = new Set<TileName>();
const keyword = ref('');
const searching = ref(false);
const locating = ref(false);
const reverseLoading = ref(false);

/** 当前选中的坐标（字符串便于直接回填输入框） */
const picked = ref<{ lat: number; lng: number } | null>(null);
const pickLat = ref('');
const pickLng = ref('');
const pickLabel = ref('');

let map: L.Map | null = null;
let tileLayer: L.TileLayer | null = null;
let marker: L.Marker | null = null;

/* ==================== 坐标系转换（WGS84 ⇄ GCJ-02） ==================== */
const PI = Math.PI;
const A = 6378245.0; // 克拉索夫斯基椭球长半轴
const EE = 0.00669342162296594323; // 偏心率平方

function outOfChina(lat: number, lng: number): boolean {
  return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

/** WGS84 → GCJ-02（在高德等 GCJ 底图上打点时使用） */
function wgs84ToGcj02(lat: number, lng: number): [number, number] {
  if (outOfChina(lat, lng)) return [lat, lng];
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
  return [lat + dLat, lng + dLng];
}

/** GCJ-02 → WGS84（迭代逼近，误差可忽略；点击 GCJ 底图后反算真实 GPS 坐标） */
function gcj02ToWgs84(gcjLat: number, gcjLng: number): [number, number] {
  if (outOfChina(gcjLat, gcjLng)) return [gcjLat, gcjLng];
  let guessLat = gcjLat, guessLng = gcjLng;
  for (let i = 0; i < 6; i++) {
    const [eLat, eLng] = wgs84ToGcj02(guessLat, guessLng);
    guessLat += gcjLat - eLat;
    guessLng += gcjLng - eLng;
  }
  return [guessLat, guessLng];
}

/** 当前底图是否为 GCJ-02 坐标系 */
function currentCrsIsGcj(): boolean {
  return TILES.find((x) => x.name === tileName.value)?.crs === 'gcj02';
}

/** Nominatim 对同一服务地址限速约1次/秒，这里做简单节流 */
let lastNominatimAt = 0;
async function nominatimThrottledFetch(url: string): Promise<any> {
  const wait = Math.max(0, 1100 - (Date.now() - lastNominatimAt));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastNominatimAt = Date.now();
  const res = await fetch(url, { headers: { 'Accept-Language': 'zh-CN,zh' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** 初始化 Leaflet 地图 */
function initMap() {
  if (!mapBox.value || map) return;
  map = L.map(mapBox.value, { zoomControl: true }).setView([39.90469, 116.40717], 11);
  triedTiles = new Set([tileName.value]);
  addTileLayer();
  map.on('click', (ev: L.LeafletMouseEvent) => {
    // 点击的是底图屏幕位置：GCJ 底图上先把 GCJ-02 反算为 WGS84 再录入
    const gcjLat = ev.latlng.lat, gcjLng = ev.latlng.lng;
    if (currentCrsIsGcj()) {
      const [wLat, wLng] = gcj02ToWgs84(gcjLat, gcjLng);
      placeMarker(wLat, wLng, undefined, { lat: gcjLat, lng: gcjLng });
    } else {
      placeMarker(gcjLat, gcjLng);
    }
  });
}

/** 加载并显示指定底图；瓦片连续加载失败时自动回退到备选源（OSM） */
function addTileLayer(name: TileName = tileName.value) {
  if (!map) return;
  if (tileLayer) map.removeLayer(tileLayer);
  const t = TILES.find((x) => x.name === name)!;
  let failCount = 0;
  tileLayer = L.tileLayer(t.url, {
    maxZoom: 19,
    subdomains: [...t.subdomains],
    attribution: t.attribution,
  }).addTo(map);
  tileLayer.on('tileerror', () => {
    failCount++;
    // 连续多块瓦片失败才判定为源不可用，避免个别瓦片偶发失败误切换
    if (failCount >= 6 && name !== 'osm' && !triedTiles.has('osm')) {
      triedTiles.add('osm');
      tileName.value = 'osm';
      popupTip('当前底图加载失败，已自动切换到 OSM 备选源', 'warning');
      addTileLayer('osm');
    }
  });
}

function switchTile(name: TileName) {
  tileName.value = name;
  triedTiles = new Set([name]);
  addTileLayer(name);
  // 切换底图后，把标记按新坐标系重新放置（保持录入的 WGS84 值不变）
  if (picked.value) refreshMarkerPosition();
}

/** 格式化经纬度为6位小数字符串 */
function fmt(n: number): string {
  return n.toFixed(6);
}

/** 根据当前底图坐标系，把已选中的 WGS84 坐标换算到屏幕上应显示的位置 */
function toDisplayLatLng(lat: number, lng: number): [number, number] {
  return currentCrsIsGcj() ? wgs84ToGcj02(lat, lng) : [lat, lng];
}

function refreshMarkerPosition() {
  if (!map || !marker || !picked.value) return;
  const [dLat, dLng] = toDisplayLatLng(picked.value.lat, picked.value.lng);
  marker.setLatLng([dLat, dLng]);
}

/**
 * 放置/移动标记并触发逆地理编码。
 * lat/lng 为最终录入的 WGS84 坐标；display 为标记在地图上应显示的坐标
 * （GCJ 底图时与录入值不同），缺省与录入值一致。
 */
function placeMarker(lat: number, lng: number, label?: string, display?: { lat: number; lng: number }) {
  picked.value = { lat, lng };
  pickLat.value = fmt(lat);
  pickLng.value = fmt(lng);
  if (label !== undefined) pickLabel.value = label;
  if (!map) return;
  const pos: [number, number] = display ? [display.lat, display.lng] : currentCrsIsGcj() ? wgs84ToGcj02(lat, lng) : [lat, lng];
  if (!marker) {
    marker = L.marker(pos).addTo(map);
  } else {
    marker.setLatLng(pos);
  }
  reverseGeocode(lat, lng);
}

/* ==================== 地名搜索 / 逆地理编码：优先高德，失败回退 Nominatim ==================== */

/** 高德 Web 服务 key。官方 REST 接口需要申请免费 key 并绑定域名白名单；
 *  未配置时自动跳过高德，直接走 Nominatim（不影响地图点选与定位功能）。
 *  申请地址：https://console.amap.com/dev/key/app —— 创建"Web服务"类型 key 后填入此处即可。 */
const AMAP_KEY = (import.meta as any).env?.VITE_AMAP_KEY || '';

let lastAmapAt = 0;
async function amapFetch(url: string): Promise<any> {
  if (!AMAP_KEY) throw new Error('未配置高德 Web 服务 key');
  const wait = Math.max(0, 250 - (Date.now() - lastAmapAt));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastAmapAt = Date.now();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data?.status !== '1') throw new Error(data?.info || '高德接口异常');
  return data;
}

/** 从省/市/区/街道 POI 名称拼一个简短地名 */
function shortName(displayName: string): string {
  const parts = String(displayName || '').split(',').map((s) => s.trim()).filter(Boolean);
  // 优先取最后一个非行政区划成分（通常是 POI/道路），否则取最短的一段
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!/([省市区县旗])$/u.test(parts[i]) || i === 0) return parts[i];
  }
  return parts[0] || '';
}

/** 关键词搜索：先高德（国内快、中文准），无结果或失败时回退 Nominatim */
async function doSearch() {
  const q = keyword.value.trim();
  if (!q) return;
  searching.value = true;
  try {
    // 1) 高德地理编码（返回 GCJ-02 坐标）
    try {
      const data = await amapFetch(
          `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(q)}&output=JSON`
      );
      const geo = data.geocodes?.[0];
      if (geo?.location) {
        const [gcjLng, gcjLat] = geo.location.split(',').map(Number);
        const [wLat, wLng] = gcj02ToWgs84(gcjLat, gcjLng);
        map?.setView([gcjLat, gcjLng], 15);
        placeMarker(wLat, wLng, geo.name || shortName(geo.formatted_address), { lat: gcjLat, lng: gcjLng });
        return;
      }
    } catch { /* 高德不可用则继续走 Nominatim */ }

    // 2) 回退 Nominatim（返回 WGS84 坐标）
    const data = await nominatimThrottledFetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&accept-language=zh-CN`
    );
    if (Array.isArray(data) && data.length > 0) {
      const r = data[0];
      const lat = Number(r.lat), lng = Number(r.lon);
      const pos: [number, number] = currentCrsIsGcj() ? wgs84ToGcj02(lat, lng) : [lat, lng];
      map?.setView(pos, 15);
      placeMarker(lat, lng, r.name || shortName(r.display_name));
    } else {
      popupTip('未找到该地点，请尝试更换关键词', 'warning');
    }
  } catch (e) {
    popupTip(`搜索失败：${e instanceof Error ? e.message : String(e)}（可能是网络问题，请稍后重试）`, 'error');
  } finally {
    searching.value = false;
  }
}

/** 逆地理编码：根据坐标反查地名（失败时静默，不影响经纬度录入）。入参为 WGS84。 */
async function reverseGeocode(lat: number, lng: number) {
  reverseLoading.value = true;
  try {
    // 1) 优先高德（需要 GCJ 坐标）
    const [gcjLat, gcjLng] = wgs84ToGcj02(lat, lng);
    try {
      const data = await amapFetch(
          `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${gcjLng.toFixed(6)},${gcjLat.toFixed(6)}&extensions=all`
      );
      const re = data.regeocode;
      if (picked.value && picked.value.lat === lat && picked.value.lng === lng) {
        const aois = re?.aois as Array<{ name?: string }> | undefined;
        const roads = re?.roads as Array<{ name?: string }> | undefined;
        const poisp = re?.pois as Array<{ name?: string }> | undefined;
        const name = aois?.[0]?.name || roads?.[0]?.name || poisp?.[0]?.name
            || shortName(re?.formatted_address || '');
        if (name) pickLabel.value = name;
      }
      return;
    } catch { /* 高德失败则回退 Nominatim */ }

    // 2) 回退 Nominatim
    const data = await nominatimThrottledFetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&accept-language=zh-CN`
    );
    // 期间用户可能又点了别的位置，只回填最新一次的结果
    if (picked.value && picked.value.lat === lat && picked.value.lng === lng && data?.display_name) {
      const name = data.address?.road || data.address?.neighbourhood || data.address?.suburb
          || data.address?.city || data.address?.town || data.address?.village
          || String(data.display_name).split(',')[0];
      if (name) pickLabel.value = name;
    }
  } catch {
    /* 逆解析失败忽略，用户可手动填写地名 */
  } finally {
    reverseLoading.value = false;
  }
}

/** 定位到当前位置：浏览器 Geolocation（GPS 原生 WGS84），成功后打点并飞行过去 */
function locateMe() {
  if (!navigator.geolocation) {
    popupTip('当前浏览器不支持定位功能', 'error');
    return;
  }
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
      (pos) => {
        locating.value = false;
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        const disp: [number, number] = currentCrsIsGcj() ? wgs84ToGcj02(lat, lng) : [lat, lng];
        map?.setView(disp, Math.max(map.getZoom(), 16));
        placeMarker(lat, lng, undefined, { lat: disp[0], lng: disp[1] });
        popupTip('已定位到当前位置', 'success', 1500);
      },
      (err) => {
        locating.value = false;
        const msg = err.code === err.PERMISSION_DENIED ? '定位权限被拒绝，请在浏览器设置中允许本页面获取位置'
            : err.code === err.TIMEOUT ? '定位超时，请检查网络或稍后重试'
                : '定位失败，无法获取当前位置';
        popupTip(msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
}

/** 回到已选点位置 */
function flyToPicked() {
  if (!picked.value || !map) return;
  const pos: [number, number] = currentCrsIsGcj()
      ? wgs84ToGcj02(picked.value.lat, picked.value.lng)
      : [picked.value.lat, picked.value.lng];
  map.setView(pos, Math.max(map.getZoom(), 15));
}

/** 确认录入：校验后抛给父组件并关闭 */
function confirmPick() {
  const lat = Number(pickLat.value), lng = Number(pickLng.value);
  if (!picked.value || isNaN(lat) || isNaN(lng)) {
    popupTip('经纬度格式不正确', 'error');
    return;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    popupTip('经纬度超出有效范围（纬度±90，经度±180）', 'error');
    return;
  }
  emit('confirm', { lat: fmt(lat), lng: fmt(lng), label: pickLabel.value.trim() });
  close();
}

function close() {
  dlg.value?.close();
}

/** dialog 原生关闭（含 Esc / method=dialog 按钮）时通知父组件 */
function onNativeClose() {
  emit('closed');
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    if (!dlg.value) return;
    if (!dlg.value.open) dlg.value.showModal();
    initMap();
    // 弹窗刚显示时容器尺寸才确定，需刷新布局
    setTimeout(() => map?.invalidateSize(), 100);
  } else {
    dlg.value?.open && dlg.value.close();
  }
}, { immediate: true });

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});
</script>

<style scoped>
/* Leaflet 容器内 z-index 较高，避免遮挡 daisyui modal 层级问题 */
.geo-map :deep(.leaflet-container) {
  background: var(--color-base-200, #eee);
  font: inherit;
}
</style>
