/**
 * ISO 3166-1 alpha-2 -> approximate centroid, used only to place a bubble on the audience map. This is geographic reference
 * data, not channel data. Names come from the platform's Intl data so no country name is hand-typed.
 */
const CENTROIDS: Record<string, readonly [number, number]> = {
  AE: [24, 54], AF: [33, 65], AL: [41, 20], AM: [40, 45], AO: [-12, 18], AR: [-34, -64], AT: [47.5, 14.5], AU: [-25, 134], AZ: [40.5, 47.5],
  BA: [44, 18], BD: [24, 90], BE: [50.6, 4.6], BF: [12.3, -1.7], BG: [42.7, 25.5], BH: [26, 50.5], BI: [-3.4, 29.9], BJ: [9.3, 2.3], BN: [4.5, 114.7],
  BO: [-17, -65], BR: [-10, -52], BT: [27.5, 90.4], BW: [-22, 24], BY: [53.7, 28], CA: [56, -106], CD: [-2.9, 23.7], CF: [6.6, 20.9], CG: [-0.7, 15.2],
  CH: [46.8, 8.2], CI: [7.5, -5.5], CL: [-30, -71], CM: [6, 12.7], CN: [35, 103], CO: [4, -73], CR: [10, -84], CU: [21.5, -79.5], CY: [35, 33],
  CZ: [49.8, 15.5], DE: [51, 10], DK: [56, 10], DO: [19, -70.7], DZ: [28, 3], EC: [-1.8, -78], EE: [58.6, 25], EG: [27, 30], ER: [15.2, 39.8],
  ES: [40, -4], ET: [9, 40], FI: [64, 26], FJ: [-17.7, 178], FR: [46.6, 2.2], GA: [-0.8, 11.6], GB: [54, -2], GE: [42.3, 43.4], GH: [7.9, -1],
  GN: [10.9, -10.9], GR: [39, 22], GT: [15.5, -90.3], GY: [5, -59], HK: [22.3, 114.2], HN: [14.8, -86.6], HR: [45.1, 15.2], HT: [19, -72.4],
  HU: [47, 19.5], ID: [-2, 118], IE: [53.4, -8], IL: [31.5, 34.8], IN: [21, 78], IQ: [33, 44], IR: [32, 53], IS: [65, -18], IT: [42.8, 12.5],
  JM: [18.1, -77.3], JO: [31, 36.5], JP: [36, 138], KE: [0.2, 37.9], KG: [41.5, 74.6], KH: [12.5, 105], KR: [36.5, 127.8], KW: [29.3, 47.6],
  KZ: [48, 67], LA: [18, 103], LB: [33.9, 35.9], LK: [7.8, 80.7], LR: [6.4, -9.4], LT: [55.2, 23.9], LU: [49.8, 6.1], LV: [57, 25], LY: [27, 17],
  MA: [32, -6], MD: [47, 28.4], ME: [42.7, 19.4], MG: [-19, 47], MK: [41.6, 21.7], ML: [17, -4], MM: [21, 96], MN: [46.9, 103.8], MO: [22.2, 113.5],
  MR: [20.3, -10.9], MT: [35.9, 14.4], MU: [-20.3, 57.6], MV: [3.2, 73.2], MW: [-13.3, 34.3], MX: [23, -102], MY: [4, 109.5], MZ: [-18.7, 35.5],
  NA: [-22, 17], NE: [17.6, 8], NG: [9.1, 8.7], NI: [12.9, -85], NL: [52.3, 5.5], NO: [62, 10], NP: [28, 84], NZ: [-41, 174], OM: [21, 57],
  PA: [8.5, -80], PE: [-9, -75], PG: [-6.3, 143.9], PH: [12.9, 121.8], PK: [30, 70], PL: [52, 19], PR: [18.2, -66.5], PS: [31.9, 35.2], PT: [39.6, -8],
  PY: [-23, -58], QA: [25.3, 51.2], RO: [46, 25], RS: [44, 21], RU: [60, 100], RW: [-2, 29.9], SA: [24, 45], SD: [15, 30], SE: [62, 15], SG: [1.3, 103.8],
  SI: [46.1, 14.8], SK: [48.7, 19.7], SL: [8.5, -11.8], SN: [14.5, -14.5], SO: [6, 46], SV: [13.8, -88.9], SY: [35, 38], TH: [15, 101], TJ: [38.9, 71],
  TM: [39, 59.6], TN: [34, 9], TR: [39, 35], TT: [10.7, -61.2], TW: [23.7, 121], TZ: [-6.4, 34.9], UA: [49, 32], UG: [1.4, 32.3], US: [39, -98],
  UY: [-33, -56], UZ: [41.4, 64.6], VE: [7, -66], VN: [16, 108], YE: [15.6, 48], ZA: [-29, 24], ZM: [-13.1, 27.8], ZW: [-19, 29.2],
};

let names: Intl.DisplayNames | null | undefined;

function displayName(code: string): string {
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      names = null;
    }
  }
  try {
    return names?.of(code) ?? code;
  } catch {
    return code;
  }
}

export interface CountryInfo {
  name: string;
  lat: number | null;
  lon: number | null;
}

export function lookupCountry(code: string): CountryInfo {
  const point = CENTROIDS[code.toUpperCase()];
  return { name: displayName(code.toUpperCase()), lat: point?.[0] ?? null, lon: point?.[1] ?? null };
}
