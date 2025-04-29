
import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";

interface TradeData {
  time: number;
  price: number;
  volume: number;
  side: 'buy' | 'sell';
}

interface VolumeTimeChartProps {
  data: TradeData[];
}

export const VolumeTimeChart: React.FC<VolumeTimeChartProps> = ({ data }) => {
  // Process data for the chart
  const processChartData = () => {
    if (!data.length) return [];
    
    // Group data by time intervals (every minute)
    const timeIntervalMs = 60000; // 1 minute in milliseconds
    const now = new Date().getTime() / 1000;
    const minTime = Math.min(...data.map(d => d.time));
    
    // Create time buckets for the chart
    const buckets: Record<string, {
      time: number;
      buyVolume: number;
      sellVolume: number;
      totalVolume: number;
      timestamp: string;
    }> = {};
    
    // Fill buckets with data points
    data.forEach(trade => {
      // Create a time bucket key (rounded to nearest minute)
      const bucketTime = Math.floor(trade.time / (timeIntervalMs/1000)) * (timeIntervalMs/1000);
      const key = bucketTime.toString();
      
      if (!buckets[key]) {
        buckets[key] = {
          time: bucketTime,
          buyVolume: 0,
          sellVolume: 0,
          totalVolume: 0,
          timestamp: new Date(bucketTime * 1000).toLocaleTimeString()
        };
      }
      
      if (trade.side === 'buy') {
        buckets[key].buyVolume += trade.volume;
      } else {
        buckets[key].sellVolume += trade.volume;
      }
      
      buckets[key].totalVolume += trade.volume;
    });
    
    // Convert to array and sort by time
    return Object.values(buckets).sort((a, b) => a.time - b.time);
  };

  const chartData = processChartData();

  return (
    <ChartContainer config={{
      buyVolume: { color: "#22c55e" }, // Green
      sellVolume: { color: "#ef4444" }, // Red
      totalVolume: { color: "#3b82f6" }, // Blue
    }} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="timestamp"
            tickFormatter={(value) => value.split(':').slice(0, 2).join(':')}
          />
          <YAxis 
            tickFormatter={value => 
              value >= 1000000
                ? `${(value / 1000000).toFixed(1)}M`
                : value >= 1000
                ? `${(value / 1000).toFixed(1)}K`
                : value.toFixed(1)
            }
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          <defs>
            <linearGradient id="colorBuy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-buyVolume)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--color-buyVolume)" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorSell" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-sellVolume)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--color-sellVolume)" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="buyVolume" 
            name="Buy Volume"
            stroke="var(--color-buyVolume)" 
            fillOpacity={1} 
            fill="url(#colorBuy)" 
            stackId="1"
          />
          <Area 
            type="monotone" 
            dataKey="sellVolume" 
            name="Sell Volume"
            stroke="var(--color-sellVolume)" 
            fillOpacity={1} 
            fill="url(#colorSell)" 
            stackId="1"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
