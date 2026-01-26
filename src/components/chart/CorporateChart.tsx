"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type CorporateJob = {
  id: string;
  totalPrice?: number;
  commissionRate?: number;
};

export function ChartBar({ data }: { data: CorporateJob[] }) {
  const chart_data = data.map((job) => ({
    name: job.id.trim().length > 10 ? job.id.slice(0, 10) + "..." : job.id,
    value: job.totalPrice! * (job.commissionRate! / 100) || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chart_data}
        margin={{
          top: 5,
          right: 10,
          left: 0,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={60}
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          formatter={(value, name) => [value + " ₺", name]}
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            padding: '8px'
          }}
        />
        <Bar dataKey="value" barSize={30} fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
}
