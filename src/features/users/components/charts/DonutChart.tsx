import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#EA580C", "#0F172A", "#CBD5E1"];

interface Props {
  clients: number;
  bidders: number;
  suspended: number;
}

export const DonutChart: React.FC<Props> = ({
  clients,
  bidders,
  suspended,
}) => {
  const data = [
    { name: "Clients", value: clients },
    { name: "Bidders", value: bidders },
    { name: "Suspended", value: suspended },
  ];

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};