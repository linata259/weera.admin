import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";

const ORANGE = "#EA580C";
const NAVY = "#0F172A";

export interface GrowthData {
  label: string;
  clients: number;
  bidders : number;
}

interface Props {
  data: GrowthData[];
}

export const GrowthChart: React.FC<Props> = ({ data }) => {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="clients" fill={ORANGE} radius={[6, 6, 0, 0]} />
          <Bar dataKey="bidders" fill={NAVY} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};