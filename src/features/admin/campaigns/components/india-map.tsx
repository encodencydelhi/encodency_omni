"use client";

import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";

interface StateData {
  name: string;
  value: string;
  pct: number;
}

const GEO_URL = "/india-states-full.topojson";

const stateColorScale = (pct: number): string => {
  if (pct >= 20) return "#1a56db";
  if (pct >= 14) return "#2563eb";
  if (pct >= 10) return "#3b82f6";
  if (pct >= 7) return "#60a5fa";
  if (pct >= 5) return "#93c5fd";
  return "#bfdbfe";
};

const displayNameMap: Record<string, string> = {
  "Andaman and Nicobar": "Andaman & Nicobar",
  "Andhra Pradesh": "Andhra Pradesh",
  "Arunachal Pradesh": "Arunachal Pradesh",
  "Assam": "Assam",
  "Bihar": "Bihar",
  "Chandigarh": "Chandigarh",
  "Chhattisgarh": "Chhattisgarh",
  "Dadra and Nagar Haveli": "Dadra & Nagar Haveli",
  "Daman and Diu": "Daman & Diu",
  "Delhi": "Delhi",
  "Goa": "Goa",
  "Gujarat": "Gujarat",
  "Haryana": "Haryana",
  "Himachal Pradesh": "Himachal Pradesh",
  "Jammu and Kashmir": "Jammu & Kashmir",
  "Jharkhand": "Jharkhand",
  "Karnataka": "Karnataka",
  "Kerala": "Kerala",
  "Lakshadweep": "Lakshadweep",
  "Madhya Pradesh": "Madhya Pradesh",
  "Maharashtra": "Maharashtra",
  "Manipur": "Manipur",
  "Meghalaya": "Meghalaya",
  "Mizoram": "Mizoram",
  "Nagaland": "Nagaland",
  "Orissa": "Odisha",
  "Puducherry": "Puducherry",
  "Punjab": "Punjab",
  "Rajasthan": "Rajasthan",
  "Sikkim": "Sikkim",
  "Tamil Nadu": "Tamil Nadu",
  "Tripura": "Tripura",
  "Uttar Pradesh": "Uttar Pradesh",
  "Uttaranchal": "Uttarakhand",
  "West Bengal": "West Bengal",
  "Ladakh": "Ladakh",
};

interface TooltipData {
  name: string;
  value?: string;
  pct?: number;
}

export default function IndiaMap({ data }: { data: StateData[] }) {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const dataMap = new Map(data.map((d) => [d.name.toLowerCase(), d]));

  return (
    <div className="relative h-[180px] w-full">
      {tooltipData && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-[#e2e8f0] bg-white px-2.5 py-1.5 shadow-md"
          style={{ left: tooltipPos.x + 10, top: tooltipPos.y - 40 }}
        >
          <div className="mb-0.5 text-[10px] font-bold text-[#1e293b]">{tooltipData.name}</div>
          {tooltipData.value && (
            <div className="text-[9px] font-semibold text-[#475569]">
              {tooltipData.value} ({tooltipData.pct}%)
            </div>
          )}
        </div>
      )}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1200,
          center: [82.5, 22],
        }}
        className="h-full w-full [&_.rsm Geography]:transition-colors [&_.rsm-geography]:cursor-pointer"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const props = geo.properties as Record<string, string> | undefined;
              const rawName =
                props?.NAME_1 ||
                props?.name ||
                (geo.id as string);
              const stateName = displayNameMap[rawName] || rawName;
              const match = dataMap.get(stateName.toLowerCase());
              const pct = match?.pct ?? 0;
              const isHovered = hoveredState === geo.rsmKey;
              const fill = isHovered ? "#1e40af" : stateColorScale(pct);

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth={0.5}
                  onMouseEnter={() => {
                    setHoveredState(geo.rsmKey);
                    if (match) {
                      setTooltipData({ name: stateName, value: match.value, pct: match.pct });
                    } else {
                      setTooltipData({ name: stateName });
                    }
                  }}
                  onMouseMove={(evt) => {
                    setTooltipPos({ x: evt.clientX, y: evt.clientY });
                  }}
                  onMouseLeave={() => {
                    setHoveredState(null);
                    setTooltipData(null);
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
