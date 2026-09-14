import { LeadCalculation, LeadCalculationBreakdownLine } from "../types";

export interface PriceItem {
  id: string;
  category: "fabric" | "profile" | "angles" | "lights" | "cornices" | "discounts";
  name: string;
  unit: string;
  min: number;
  max: number;
  description?: string;
  isCustom?: boolean;
}

export const DEFAULT_PRICE_ITEMS: PriceItem[] = [
  // 1. Полотна
  {
    id: "fabric_narrow",
    category: "fabric",
    name: "Полотно матовое MSD Premium (периметр ≤ 16м)",
    unit: "м²",
    min: 650,
    max: 880,
    description: "Стандартные комнаты до 16м периметра с установкой",
  },
  {
    id: "fabric_wide",
    category: "fabric",
    name: "Полотно матовое MSD Premium широкое (периметр > 16м)",
    unit: "м²",
    min: 880,
    max: 1200,
    description: "Бесшовные полотна шириной 3.6-5.0м с установкой",
  },
  {
    id: "fabric_bauf",
    category: "fabric",
    name: "Полотно премиум Bauf (Германия)",
    unit: "м²",
    min: 1100,
    max: 1600,
    description: "Экологичный премиум ПВХ повышенной плотности",
  },

  // 2. Профили
  {
    id: "profile_classic",
    category: "profile",
    name: "Классический профиль с маскировочной лентой",
    unit: "пог.м",
    min: 300,
    max: 500,
    description: "Базовый алюминиевый или ПВХ профиль",
  },
  {
    id: "profile_shadow_plastic",
    category: "profile",
    name: "Теневой профиль ПВХ (пластик)",
    unit: "пог.м",
    min: 800,
    max: 1100,
    description: "Ровный темный зазор 6-7мм по периметру стен",
  },
  {
    id: "profile_shadow_metal",
    category: "profile",
    name: "Теневой профиль EuroKraab (алюминий)",
    unit: "пог.м",
    min: 1100,
    max: 1500,
    description: "Флагманский дизайнерский теневой профиль",
  },
  {
    id: "profile_shadow_fake",
    category: "profile",
    name: "Имитация теневого (чёрная декоративная вставка)",
    unit: "пог.м",
    min: 500,
    max: 700,
    description: "Эконом-вариант визуального теневого зазора",
  },
  {
    id: "profile_floating_single",
    category: "profile",
    name: "Парящий потолок (одноцветная LED-подсветка)",
    unit: "пог.м",
    min: 700,
    max: 1000,
    description: "Эффект парения потолка в воздухе",
  },
  {
    id: "profile_floating_rgb",
    category: "profile",
    name: "Парящий RGB / Бегущий огонь",
    unit: "пог.м",
    min: 900,
    max: 1500,
    description: "Многоцветная подсветка с контроллером",
  },
  {
    id: "profile_contour",
    category: "profile",
    name: "Контурный профиль с подсветкой",
    unit: "пог.м",
    min: 1000,
    max: 1400,
    description: "Четкая световая линия вдоль стены",
  },

  // 3. Углы
  {
    id: "angle_extra_classic",
    category: "angles",
    name: "Дополнительные углы (свыше 4-х в комнате)",
    unit: "шт",
    min: 330,
    max: 400,
    description: "Первые 4 угла входят в базу, свыше — платно",
  },
  {
    id: "angle_shadow_inner",
    category: "angles",
    name: "Внутренний угол теневого EuroKraab",
    unit: "шт",
    min: 400,
    max: 500,
    description: "Идеальная состыковка без накладок",
  },
  {
    id: "angle_shadow_outer",
    category: "angles",
    name: "Внешний угол теневого EuroKraab",
    unit: "шт",
    min: 800,
    max: 900,
    description: "Сложный запил под 45° с усилением",
  },
  {
    id: "angle_floating",
    category: "angles",
    name: "Углы парящего профиля",
    unit: "шт",
    min: 400,
    max: 550,
    description: "Запил и пайка светодиодной ленты на углу",
  },

  // 4. Освещение
  {
    id: "light_gx53",
    category: "lights",
    name: "Точечный светильник GX53 (монтаж и подключение)",
    unit: "шт",
    min: 400,
    max: 550,
    description: "Самый популярный тонкий спот под лампу GX53",
  },
  {
    id: "light_spot",
    category: "lights",
    name: "Накладной спот-стаканчик",
    unit: "шт",
    min: 550,
    max: 650,
    description: "Цилиндрический стильный светильник накладного типа",
  },
  {
    id: "light_embedded",
    category: "lights",
    name: "Встраиваемый светильник с кольцом",
    unit: "шт",
    min: 550,
    max: 1150,
    description: "Врезной светильник MR16 / GU10",
  },
  {
    id: "light_chandelier",
    category: "lights",
    name: "Установка и подключение люстры",
    unit: "шт",
    min: 800,
    max: 2500,
    description: "Крючковая или на планке с усиленной платформой",
  },
  {
    id: "light_line",
    category: "lights",
    name: "Световые линии (с LED-лентой и экраном)",
    unit: "пог.м",
    min: 3000,
    max: 4500,
    description: "Современное основное или акцентное освещение",
  },
  {
    id: "track_overlay",
    category: "lights",
    name: "Накладной однофазный шинопровод",
    unit: "пог.м",
    min: 600,
    max: 1500,
    description: "Монтаж трека на черную или белую шину",
  },
  {
    id: "track_embedded",
    category: "lights",
    name: "Встроенный трек заподлицо",
    unit: "пог.м",
    min: 2500,
    max: 3200,
    description: "Трек утоплен в уровень с полотном",
  },
  {
    id: "track_magnetic",
    category: "lights",
    name: "Магнитная трековая система (премиум)",
    unit: "пог.м",
    min: 4500,
    max: 6500,
    description: "Низковольтная шина 48V с магнитными модулями",
  },

  // 5. Карнизы
  {
    id: "cornice_overlay_plastic",
    category: "cornices",
    name: "Накладной пластиковый карниз (шина)",
    unit: "пог.м",
    min: 300,
    max: 900,
    description: "Крепится через полотно к скрытому брусу",
  },
  {
    id: "cornice_niche",
    category: "cornices",
    name: "Ниша под карниз с перегибом полотна",
    unit: "пог.м",
    min: 1500,
    max: 3500,
    description: "Формирование скрытой ступени у окна",
  },
  {
    id: "cornice_hidden",
    category: "cornices",
    name: "Скрытый алюминиевый карниз ПК-5",
    unit: "пог.м",
    min: 1500,
    max: 4500,
    description: "Интегрированный трёхрядный карниз в натяжной потолок",
  },
  {
    id: "cornice_single_row",
    category: "cornices",
    name: "Однорядный алюминиевый карниз",
    unit: "пог.м",
    min: 800,
    max: 3000,
    description: "Для тюля, ванных комнат или зонирования",
  },
  {
    id: "cornice_led",
    category: "cornices",
    name: "Скрытая LED-подсветка карниза",
    unit: "пог.м",
    min: 400,
    max: 700,
    description: "Мягкое свечение штор от потолка",
  },

  // 6. Скидки
  {
    id: "discount_novosel",
    category: "discounts",
    name: "Скидка новосёлам (новые ЖК и частные дома)",
    unit: "%",
    min: 10,
    max: 10,
    description: "При заказе в новостройках",
  },
  {
    id: "discount_pensioner",
    category: "discounts",
    name: "Скидка пенсионерам и ветеранам",
    unit: "%",
    min: 10,
    max: 10,
    description: "Социальная скидка",
  },
  {
    id: "discount_multikids",
    category: "discounts",
    name: "Скидка многодетным семьям",
    unit: "%",
    min: 10,
    max: 10,
    description: "Поддержка семей с 3 и более детьми",
  },
];

const LOCAL_STORAGE_PRICES_KEY = "phoenix_custom_pricing";
const LEGACY_STORAGE_PRICES_KEY = "fenix_pro_prices_v2";

/**
 * Хранилище позиций прайс-листа (с сохранением в localStorage: "phoenix_custom_pricing")
 */
export function getPricingItems(): PriceItem[] {
  try {
    const raw =
      localStorage.getItem(LOCAL_STORAGE_PRICES_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_PRICES_KEY);
    if (!raw) return [...DEFAULT_PRICE_ITEMS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error("Error reading pricing from localStorage:", e);
  }
  return [...DEFAULT_PRICE_ITEMS];
}

export function savePricingItems(items: PriceItem[]): void {
  try {
    const serialized = JSON.stringify(items);
    localStorage.setItem(LOCAL_STORAGE_PRICES_KEY, serialized);
    localStorage.setItem(LEGACY_STORAGE_PRICES_KEY, serialized);
    syncPricesObject(items);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fenix_pricing_updated", { detail: items }));
    }
  } catch (e) {
    console.error("Error saving pricing to localStorage:", e);
  }
}

export function resetPricingToDefaults(): PriceItem[] {
  try {
    localStorage.removeItem(LOCAL_STORAGE_PRICES_KEY);
    localStorage.removeItem(LEGACY_STORAGE_PRICES_KEY);
    syncPricesObject(DEFAULT_PRICE_ITEMS);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fenix_pricing_updated", { detail: DEFAULT_PRICE_ITEMS }));
    }
  } catch (e) {
    console.error("Error resetting pricing in localStorage:", e);
  }
  return [...DEFAULT_PRICE_ITEMS];
}

export function subscribePricingUpdated(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("fenix_pricing_updated", handler);
  return () => {
    window.removeEventListener("fenix_pricing_updated", handler);
  };
}

/**
 * Глобальный объект тарифов PRICES (актуализируется на лету)
 */
export const PRICES = {
  fabric_narrow: { min: 650, max: 880 },
  fabric_wide: { min: 880, max: 1200 },
  fabric_bauf: { min: 1100, max: 1600 },

  profile_classic: { min: 300, max: 500 },
  profile_shadow_plastic: { min: 800, max: 1100 },
  profile_shadow_metal: { min: 1100, max: 1500 },
  profile_shadow_fake: { min: 500, max: 700 },
  profile_floating_single: { min: 700, max: 1000 },
  profile_floating_rgb: { min: 900, max: 1500 },
  profile_contour: { min: 1000, max: 1400 },

  angle_extra_classic: { min: 330, max: 400 },
  angle_shadow_inner: { min: 400, max: 500 },
  angle_shadow_outer: { min: 800, max: 900 },
  angle_floating: { min: 400, max: 550 },

  light_gx53: { min: 400, max: 550 },
  light_spot: { min: 550, max: 650 },
  light_embedded: { min: 550, max: 1150 },
  light_chandelier: { min: 800, max: 2500 },
  light_line: { min: 3000, max: 4500 },
  track_overlay: { min: 600, max: 1500 },
  track_embedded: { min: 2500, max: 3200 },
  track_magnetic: { min: 4500, max: 6500 },

  cornices: {
    overlay_plastic: { min: 300, max: 900 },
    niche: { min: 1500, max: 3500 },
    hidden: { min: 1500, max: 4500 },
    single_row: { min: 800, max: 3000 },
  },
  cornice_led: { min: 400, max: 700 },

  discounts: {
    novosel: 10,
    pensioner: 10,
    multikids: 10,
  },
};

function syncPricesObject(items: PriceItem[]) {
  const map = new Map<string, PriceItem>(items.map((it) => [it.id, it]));

  const getP = (id: string, defMin: number, defMax: number) => {
    const it = map.get(id);
    return it ? { min: it.min, max: it.max } : { min: defMin, max: defMax };
  };

  PRICES.fabric_narrow = getP("fabric_narrow", 650, 880);
  PRICES.fabric_wide = getP("fabric_wide", 880, 1200);
  PRICES.fabric_bauf = getP("fabric_bauf", 1100, 1600);

  PRICES.profile_classic = getP("profile_classic", 300, 500);
  PRICES.profile_shadow_plastic = getP("profile_shadow_plastic", 800, 1100);
  PRICES.profile_shadow_metal = getP("profile_shadow_metal", 1100, 1500);
  PRICES.profile_shadow_fake = getP("profile_shadow_fake", 500, 700);
  PRICES.profile_floating_single = getP("profile_floating_single", 700, 1000);
  PRICES.profile_floating_rgb = getP("profile_floating_rgb", 900, 1500);
  PRICES.profile_contour = getP("profile_contour", 1000, 1400);

  PRICES.angle_extra_classic = getP("angle_extra_classic", 330, 400);
  PRICES.angle_shadow_inner = getP("angle_shadow_inner", 400, 500);
  PRICES.angle_shadow_outer = getP("angle_shadow_outer", 800, 900);
  PRICES.angle_floating = getP("angle_floating", 400, 550);

  PRICES.light_gx53 = getP("light_gx53", 400, 550);
  PRICES.light_spot = getP("light_spot", 550, 650);
  PRICES.light_embedded = getP("light_embedded", 550, 1150);
  PRICES.light_chandelier = getP("light_chandelier", 800, 2500);
  PRICES.light_line = getP("light_line", 3000, 4500);
  PRICES.track_overlay = getP("track_overlay", 600, 1500);
  PRICES.track_embedded = getP("track_embedded", 2500, 3200);
  PRICES.track_magnetic = getP("track_magnetic", 4500, 6500);

  PRICES.cornices.overlay_plastic = getP("cornice_overlay_plastic", 300, 900);
  PRICES.cornices.niche = getP("cornice_niche", 1500, 3500);
  PRICES.cornices.hidden = getP("cornice_hidden", 1500, 4500);
  PRICES.cornices.single_row = getP("cornice_single_row", 800, 3000);
  PRICES.cornice_led = getP("cornice_led", 400, 700);

  PRICES.discounts.novosel = map.get("discount_novosel")?.min || 10;
  PRICES.discounts.pensioner = map.get("discount_pensioner")?.min || 10;
  PRICES.discounts.multikids = map.get("discount_multikids")?.min || 10;
}

// Инициализируем PRICES при первом запуске
if (typeof window !== "undefined") {
  syncPricesObject(getPricingItems());
}

export type ProfileKey =
  | "classic"
  | "shadow_metal"
  | "shadow_plastic"
  | "shadow_fake"
  | "floating_single"
  | "floating_rgb"
  | "contour"
  | "shadow"
  | "shadow_pvc"
  | "shadow_eurokraab"
  | "floating";

export type CorniceKey =
  | "none"
  | "hidden"
  | "niche"
  | "overlay_plastic"
  | "single_row";

export interface LightsState {
  gx53: number;
  spot: number;
  embedded: number;
  chandelier: number;
  light_line: number;
  track_overlay: number;
  track_embedded: number;
  track_magnetic: number;
}

export interface DiscountsState {
  novosel: boolean;
  pensioner: boolean;
  multikids: boolean;
}

export interface CeilingCalculatorInput {
  area: number;
  customPerimeter?: number;
  profileType: ProfileKey;
  anglesCount?: number;
  anglesExternalCount?: number;
  corniceType?: CorniceKey;
  hasCornice?: boolean;
  corniceLength?: number;
  corniceWithLed?: boolean;
  lights?: Partial<LightsState> & {
    light_lines?: number;
  };
  discounts?: Partial<DiscountsState>;
}

export interface CeilingEstimateResult {
  area: number;
  perimeter: number;
  profileType: ProfileKey;
  estimateMin: number;
  estimateMax: number;
  rawMin: number;
  rawMax: number;
  appliedDiscountPercent: number;
  breakdown: LeadCalculationBreakdownLine[];
}

export function calculatePerimeter(area: number): number {
  if (!area || area <= 0) return 0;
  const base = Math.sqrt(area) * 4;
  const bonus = area > 50 ? 22 : 0;
  return Math.round(base + bonus);
}

export function normalizeProfileKey(key: string): {
  normalized: "classic" | "shadow_metal" | "shadow_plastic" | "shadow_fake" | "floating_single" | "floating_rgb" | "contour";
  label: string;
  priceRange: { min: number; max: number };
} {
  switch (key) {
    case "classic":
      return { normalized: "classic", label: "Классический (с вставкой)", priceRange: PRICES.profile_classic };
    case "shadow_plastic":
    case "shadow_pvc":
      return { normalized: "shadow_plastic", label: "Теневой (пластик)", priceRange: PRICES.profile_shadow_plastic };
    case "shadow_fake":
      return { normalized: "shadow_fake", label: "Теневой имитация (чёрная вставка)", priceRange: PRICES.profile_shadow_fake };
    case "floating_rgb":
      return { normalized: "floating_rgb", label: "Парящий RGB / Бегущий огонь", priceRange: PRICES.profile_floating_rgb };
    case "contour":
      return { normalized: "contour", label: "Контурный с подсветкой", priceRange: PRICES.profile_contour };
    case "floating":
    case "floating_single":
      return { normalized: "floating_single", label: "Парящий (одноцветная LED)", priceRange: PRICES.profile_floating_single };
    case "shadow_metal":
    case "shadow_eurokraab":
    case "shadow":
    default:
      return { normalized: "shadow_metal", label: "Теневой EuroKraab (алюминий)", priceRange: PRICES.profile_shadow_metal };
  }
}

export function calculateCeilingsEstimate(input: CeilingCalculatorInput): CeilingEstimateResult {
  const area = Math.max(1, input.area || 18);
  const perimeter =
    typeof input.customPerimeter === "number" && input.customPerimeter > 0
      ? input.customPerimeter
      : calculatePerimeter(area);

  const breakdown: LeadCalculationBreakdownLine[] = [];
  let totalMin = 0;
  let totalMax = 0;

  // 1. Полотно
  const isWide = perimeter > 16;
  const fabricRate = isWide ? PRICES.fabric_wide : PRICES.fabric_narrow;
  const fabricTotalMin = Math.round(area * fabricRate.min);
  const fabricTotalMax = Math.round(area * fabricRate.max);

  breakdown.push({
    category: "fabric",
    label: `Полотно матовое/сатин (${area} м², ${isWide ? "широкое >16м" : "стандартное ≤16м"})`,
    unit: "м²",
    quantity: area,
    min_unit_price: fabricRate.min,
    max_unit_price: fabricRate.max,
    min_total: fabricTotalMin,
    max_total: fabricTotalMax,
  });
  totalMin += fabricTotalMin;
  totalMax += fabricTotalMax;

  // 2. Профиль
  const profInfo = normalizeProfileKey(input.profileType);
  const profTotalMin = Math.round(perimeter * profInfo.priceRange.min);
  const profTotalMax = Math.round(perimeter * profInfo.priceRange.max);

  breakdown.push({
    category: "profile",
    label: `Профиль: ${profInfo.label} (${perimeter} пог.м)`,
    unit: "пог.м",
    quantity: perimeter,
    min_unit_price: profInfo.priceRange.min,
    max_unit_price: profInfo.priceRange.max,
    min_total: profTotalMin,
    max_total: profTotalMax,
  });
  totalMin += profTotalMin;
  totalMax += profTotalMax;

  // 3. Углы
  const angles = input.anglesCount !== undefined ? Math.max(4, input.anglesCount) : 4;
  const profNorm = profInfo.normalized;

  if (profNorm === "classic" || profNorm === "contour" || profNorm === "shadow_fake") {
    const extraAngles = Math.max(0, angles - 4);
    if (extraAngles > 0) {
      const extraMin = extraAngles * PRICES.angle_extra_classic.min;
      const extraMax = extraAngles * PRICES.angle_extra_classic.max;
      breakdown.push({
        category: "angles",
        label: `Доп. углы (${extraAngles} шт, первые 4 бесплатно)`,
        unit: "шт",
        quantity: extraAngles,
        min_unit_price: PRICES.angle_extra_classic.min,
        max_unit_price: PRICES.angle_extra_classic.max,
        min_total: extraMin,
        max_total: extraMax,
      });
      totalMin += extraMin;
      totalMax += extraMax;
    }
  } else if (profNorm === "shadow_metal" || profNorm === "shadow_plastic") {
    const inner = Math.ceil(angles / 2);
    const outer = Math.floor(angles / 2);
    const innerMin = inner * PRICES.angle_shadow_inner.min;
    const innerMax = inner * PRICES.angle_shadow_inner.max;
    const outerMin = outer * PRICES.angle_shadow_outer.min;
    const outerMax = outer * PRICES.angle_shadow_outer.max;

    if (inner > 0) {
      breakdown.push({
        category: "angles",
        label: `Внутренние теневые углы (${inner} шт)`,
        unit: "шт",
        quantity: inner,
        min_unit_price: PRICES.angle_shadow_inner.min,
        max_unit_price: PRICES.angle_shadow_inner.max,
        min_total: innerMin,
        max_total: innerMax,
      });
      totalMin += innerMin;
      totalMax += innerMax;
    }
    if (outer > 0) {
      breakdown.push({
        category: "angles",
        label: `Внешние теневые углы (${outer} шт)`,
        unit: "шт",
        quantity: outer,
        min_unit_price: PRICES.angle_shadow_outer.min,
        max_unit_price: PRICES.angle_shadow_outer.max,
        min_total: outerMin,
        max_total: outerMax,
      });
      totalMin += outerMin;
      totalMax += outerMax;
    }
  } else if (profNorm === "floating_single" || profNorm === "floating_rgb") {
    const floatMin = angles * PRICES.angle_floating.min;
    const floatMax = angles * PRICES.angle_floating.max;
    breakdown.push({
      category: "angles",
      label: `Углы парящего профиля (${angles} шт)`,
      unit: "шт",
      quantity: angles,
      min_unit_price: PRICES.angle_floating.min,
      max_unit_price: PRICES.angle_floating.max,
      min_total: floatMin,
      max_total: floatMax,
    });
    totalMin += floatMin;
    totalMax += floatMax;
  }

  // 4. Освещение
  const lights = input.lights || {};

  if (lights.gx53 && lights.gx53 > 0) {
    const minP = lights.gx53 * PRICES.light_gx53.min;
    const maxP = lights.gx53 * PRICES.light_gx53.max;
    breakdown.push({
      category: "lights",
      label: `Точечные светильники GX53 (${lights.gx53} шт)`,
      unit: "шт",
      quantity: lights.gx53,
      min_unit_price: PRICES.light_gx53.min,
      max_unit_price: PRICES.light_gx53.max,
      min_total: minP,
      max_total: maxP,
    });
    totalMin += minP;
    totalMax += maxP;
  }

  if (lights.spot && lights.spot > 0) {
    const minP = lights.spot * PRICES.light_spot.min;
    const maxP = lights.spot * PRICES.light_spot.max;
    breakdown.push({
      category: "lights",
      label: `Накладные споты-стаканчики (${lights.spot} шт)`,
      unit: "шт",
      quantity: lights.spot,
      min_unit_price: PRICES.light_spot.min,
      max_unit_price: PRICES.light_spot.max,
      min_total: minP,
      max_total: maxP,
    });
    totalMin += minP;
    totalMax += maxP;
  }

  if (lights.embedded && lights.embedded > 0) {
    const minP = lights.embedded * PRICES.light_embedded.min;
    const maxP = lights.embedded * PRICES.light_embedded.max;
    breakdown.push({
      category: "lights",
      label: `Встраиваемые светильники (${lights.embedded} шт)`,
      unit: "шт",
      quantity: lights.embedded,
      min_unit_price: PRICES.light_embedded.min,
      max_unit_price: PRICES.light_embedded.max,
      min_total: minP,
      max_total: maxP,
    });
    totalMin += minP;
    totalMax += maxP;
  }

  if (lights.chandelier && lights.chandelier > 0) {
    const minP = lights.chandelier * PRICES.light_chandelier.min;
    const maxP = lights.chandelier * PRICES.light_chandelier.max;
    breakdown.push({
      category: "lights",
      label: `Установка и подключение люстры (${lights.chandelier} шт)`,
      unit: "шт",
      quantity: lights.chandelier,
      min_unit_price: PRICES.light_chandelier.min,
      max_unit_price: PRICES.light_chandelier.max,
      min_total: minP,
      max_total: maxP,
    });
    totalMin += minP;
    totalMax += maxP;
  }

  const lightLineLen = lights.light_line || lights.light_lines || 0;
  if (lightLineLen > 0) {
    const minP = Math.round(lightLineLen * PRICES.light_line.min);
    const maxP = Math.round(lightLineLen * PRICES.light_line.max);
    breakdown.push({
      category: "lights",
      label: `Световые линии (${lightLineLen} пог.м)`,
      unit: "пог.м",
      quantity: lightLineLen,
      min_unit_price: PRICES.light_line.min,
      max_unit_price: PRICES.light_line.max,
      min_total: minP,
      max_total: maxP,
    });
    totalMin += minP;
    totalMax += maxP;
  }

  if (lights.track_overlay && lights.track_overlay > 0) {
    const minP = Math.round(lights.track_overlay * PRICES.track_overlay.min);
    const maxP = Math.round(lights.track_overlay * PRICES.track_overlay.max);
    breakdown.push({
      category: "lights",
      label: `Накладной трек (${lights.track_overlay} пог.м)`,
      unit: "пог.м",
      quantity: lights.track_overlay,
      min_unit_price: PRICES.track_overlay.min,
      max_unit_price: PRICES.track_overlay.max,
      min_total: minP,
      max_total: maxP,
    });
    totalMin += minP;
    totalMax += maxP;
  }

  if (lights.track_embedded && lights.track_embedded > 0) {
    const minP = Math.round(lights.track_embedded * PRICES.track_embedded.min);
    const maxP = Math.round(lights.track_embedded * PRICES.track_embedded.max);
    breakdown.push({
      category: "lights",
      label: `Встроенный трек заподлицо (${lights.track_embedded} пог.м)`,
      unit: "пог.м",
      quantity: lights.track_embedded,
      min_unit_price: PRICES.track_embedded.min,
      max_unit_price: PRICES.track_embedded.max,
      min_total: minP,
      max_total: maxP,
    });
    totalMin += minP;
    totalMax += maxP;
  }

  if (lights.track_magnetic && lights.track_magnetic > 0) {
    const minP = Math.round(lights.track_magnetic * PRICES.track_magnetic.min);
    const maxP = Math.round(lights.track_magnetic * PRICES.track_magnetic.max);
    breakdown.push({
      category: "lights",
      label: `Магнитный трек премиум (${lights.track_magnetic} пог.м)`,
      unit: "пог.м",
      quantity: lights.track_magnetic,
      min_unit_price: PRICES.track_magnetic.min,
      max_unit_price: PRICES.track_magnetic.max,
      min_total: minP,
      max_total: maxP,
    });
    totalMin += minP;
    totalMax += maxP;
  }

  // 5. Карнизы
  let effCorniceType: CorniceKey = "none";
  if (input.corniceType) {
    effCorniceType = input.corniceType;
  } else if (input.hasCornice) {
    effCorniceType = "hidden";
  }

  if (effCorniceType !== "none") {
    const corniceLen = input.corniceLength && input.corniceLength > 0 ? input.corniceLength : 3.0;
    const cPrice = PRICES.cornices[effCorniceType] || PRICES.cornices.hidden;
    const cMin = Math.round(corniceLen * cPrice.min);
    const cMax = Math.round(corniceLen * cPrice.max);

    const corniceLabels: Record<CorniceKey, string> = {
      none: "Без карниза",
      hidden: "Скрытый карниз (ПК-5 / алюминий)",
      niche: "Ниша для карниза с перегибом",
      overlay_plastic: "Накладной пластиковый карниз",
      single_row: "Однорядный карниз (ванная/зонирование)",
    };

    breakdown.push({
      category: "cornice",
      label: `${corniceLabels[effCorniceType]} (${corniceLen} пог.м)`,
      unit: "пог.м",
      quantity: corniceLen,
      min_unit_price: cPrice.min,
      max_unit_price: cPrice.max,
      min_total: cMin,
      max_total: cMax,
    });
    totalMin += cMin;
    totalMax += cMax;

    if (input.corniceWithLed && effCorniceType !== "overlay_plastic") {
      const ledMin = Math.round(corniceLen * PRICES.cornice_led.min);
      const ledMax = Math.round(corniceLen * PRICES.cornice_led.max);
      breakdown.push({
        category: "cornice",
        label: `Скрытая LED-подсветка карниза (${corniceLen} пог.м)`,
        unit: "пог.м",
        quantity: corniceLen,
        min_unit_price: PRICES.cornice_led.min,
        max_unit_price: PRICES.cornice_led.max,
        min_total: ledMin,
        max_total: ledMax,
      });
      totalMin += ledMin;
      totalMax += ledMax;
    }
  }

  // 6. Округление до сотен
  const rawMin = Math.round(totalMin / 100) * 100;
  const rawMax = Math.round(totalMax / 100) * 100;

  // 7. Скидки
  const discounts = input.discounts || {};
  let maxDisc = 0;
  if (discounts.novosel && PRICES.discounts.novosel > maxDisc) maxDisc = PRICES.discounts.novosel;
  if (discounts.pensioner && PRICES.discounts.pensioner > maxDisc) maxDisc = PRICES.discounts.pensioner;
  if (discounts.multikids && PRICES.discounts.multikids > maxDisc) maxDisc = PRICES.discounts.multikids;

  let estimateMin = rawMin;
  let estimateMax = rawMax;

  if (maxDisc > 0) {
    estimateMin = Math.round(rawMin * (1 - maxDisc / 100));
    estimateMax = Math.round(rawMax * (1 - maxDisc / 100));

    breakdown.push({
      category: "discount",
      label: `Скидка клиента (−${maxDisc}%)`,
      unit: "%",
      quantity: maxDisc,
      min_total: estimateMin - rawMin,
      max_total: estimateMax - rawMax,
    });
  }

  return {
    area,
    perimeter,
    profileType: input.profileType,
    estimateMin,
    estimateMax,
    rawMin,
    rawMax,
    appliedDiscountPercent: maxDisc,
    breakdown,
  };
}
