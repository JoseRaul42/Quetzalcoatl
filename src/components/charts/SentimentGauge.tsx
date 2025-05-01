
import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label
} from 'recharts';

interface SentimentGaugeProps {
  value: number; // 0 to 1, where 0.5 is neutral
}

export const SentimentGauge: React.FC<SentimentGaugeProps> = ({ value }) => {
  // Ensure the value is within 0-1 range
  const safeValue = Math.max(0, Math.min(1, value));
  
  // Calculate colors based on sentiment value with enhanced deuteranopia-friendly colors
  const getBullColor = () => {
    // Use blue instead of green for bulls (deuteranopia-friendly)
    const intensity = Math.min(255, Math.floor(safeValue * 2 * 255));
    return `rgb(14, ${Math.max(100, intensity)}, 233)`; // Enhanced blue
  };
  
  const getBearColor = () => {
    // Use orange instead of red for bears (deuteranopia-friendly)
    const intensity = Math.min(255, Math.floor((1 - safeValue) * 2 * 255));
    return `rgb(${intensity}, 116, 10)`; // Enhanced orange
  };
  
  // Get sentiment text description with more distinctive value ranges
  const getSentimentText = () => {
    if (safeValue >= 0.7) return "Strongly Bullish";
    if (safeValue >= 0.6) return "Bullish";
    if (safeValue >= 0.45) return "Slightly Bullish";
    if (safeValue >= 0.35) return "Neutral";
    if (safeValue >= 0.2) return "Slightly Bearish";
    if (safeValue >= 0.1) return "Bearish";
    return "Strongly Bearish";
  };

  // Prepare data for the gauge
  const gaugeData = [
    { name: 'Bull', value: safeValue },
    { name: 'Bear', value: 1 - safeValue },
  ];
  
  // Calculate percentage for display
  const bullishPercentage = Math.round(safeValue * 100);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={0}
              dataKey="value"
            >
              <Cell fill={getBullColor()} />
              <Cell fill={getBearColor()} />
              <Label
                content={({ viewBox }) => {
                  if (!viewBox) return null;
                  // Explicitly type and access viewBox properties
                  const cx = typeof viewBox === 'object' && 'cx' in viewBox ? viewBox.cx : 0;
                  const cy = typeof viewBox === 'object' && 'cy' in viewBox ? viewBox.cy : 0;
                  return (
                    <>
                      <text 
                        x={cx} 
                        y={cy - 5} 
                        textAnchor="middle" 
                        dominantBaseline="central"
                        className="text-xl font-bold"
                        fill="#FFFFFF" // High contrast white text for better visibility
                        stroke="#000000" // Thin black outline for contrast
                        strokeWidth="0.7" // Increased outline thickness
                      >
                        {bullishPercentage}%
                      </text>
                      <text 
                        x={cx} 
                        y={cy + 15} 
                        textAnchor="middle" 
                        dominantBaseline="central"
                        className="text-xs"
                        fill="#FFFFFF" // High contrast white text
                        stroke="#000000" // Thin black outline for contrast
                        strokeWidth="0.5" // Increased outline thickness
                      >
                        Bullish
                      </text>
                    </>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 text-center">
        <div className="text-lg font-semibold bg-gray-800 text-white px-3 py-1 rounded-md">
          {getSentimentText()}
        </div>
        <div className="text-sm text-white bg-gray-700 px-2 py-1 mt-1 rounded">
          Market sentiment based on recent trade volume
        </div>
      </div>
    </div>
  );
};
