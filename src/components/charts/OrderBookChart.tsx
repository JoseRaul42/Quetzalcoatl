
import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";

interface OrderBookChartProps {
  data: {
    asks: [number, number][]; // [price, volume]
    bids: [number, number][]; // [price, volume]
  };
}

export const OrderBookChart: React.FC<OrderBookChartProps> = ({ data }) => {
  // Transform the data for the chart
  const transformedData = () => {
    const chartData = [];

    // Find min and max price to determine range
    const allPrices = [...data.asks.map(ask => ask[0]), ...data.bids.map(bid => bid[0])];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    const pricePrecision = priceRange < 1 ? 4 : 2;

    // Get midpoint price (average of highest bid and lowest ask)
    const highestBid = data.bids.length ? Math.max(...data.bids.map(bid => bid[0])) : 0;
    const lowestAsk = data.asks.length ? Math.min(...data.asks.map(ask => ask[0])) : 0;
    const midPrice = (highestBid + lowestAsk) / 2;

    // Group bids by price level
    const bidsByPrice = data.bids.reduce<Record<string, number>>((acc, [price, volume]) => {
      const roundedPrice = price.toFixed(pricePrecision);
      acc[roundedPrice] = (acc[roundedPrice] || 0) + volume;
      return acc;
    }, {});

    // Group asks by price level
    const asksByPrice = data.asks.reduce<Record<string, number>>((acc, [price, volume]) => {
      const roundedPrice = price.toFixed(pricePrecision);
      acc[roundedPrice] = (acc[roundedPrice] || 0) + volume;
      return acc;
    }, {});

    // Create chart data entries
    const uniquePrices = [...new Set([
      ...Object.keys(bidsByPrice),
      ...Object.keys(asksByPrice)
    ])].map(Number).sort((a, b) => a - b);

    uniquePrices.forEach(price => {
      const priceStr = price.toFixed(pricePrecision);
      const bidVolume = bidsByPrice[priceStr] || 0;
      const askVolume = asksByPrice[priceStr] || 0;

      chartData.push({
        price: priceStr,
        bidVolume: price <= midPrice ? bidVolume : 0,
        askVolume: price >= midPrice ? askVolume : 0
      });
    });

    return chartData;
  };

  const chartData = transformedData();

  return (
    <ChartContainer config={{
      bidVolume: { color: "#0EA5E9" }, // Enhanced blue for bids (deuteranopia-friendly)
      askVolume: { color: "#F97316" }, // Enhanced orange for asks (deuteranopia-friendly)
    }} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          barGap={0}
          barCategoryGap={1}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="price" 
            scale="band"
            tickFormatter={value => Number(value).toLocaleString()}
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
          <Bar dataKey="bidVolume" name="Bids" fill="var(--color-bidVolume)" />
          <Bar dataKey="askVolume" name="Asks" fill="var(--color-askVolume)" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
