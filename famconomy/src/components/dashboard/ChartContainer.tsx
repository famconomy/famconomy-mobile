import React from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { ChartData } from '../../types';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartContainerProps {
  title: string;
  type: 'line' | 'bar' | 'pie';
  data: ChartData;
  height?: number;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ 
  title, 
  type, 
  data,
  height = 300
}) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return <Line options={options} data={data} height={height} />;
      case 'bar':
        return <Bar options={options} data={data} height={height} />;
      case 'pie':
        return <Pie data={data} height={height} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-card p-6 h-full">
      <h3 className="text-lg font-medium text-neutral-800 mb-4">{title}</h3>
      <div style={{ height: `${height}px` }}>
        {renderChart()}
      </div>
    </div>
  );
};