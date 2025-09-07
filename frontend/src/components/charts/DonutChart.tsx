import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import type { ChartOptions } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

type Slice = { label: string; count: number }
interface DonutChartProps {
  title: string
  slices: Slice[]
  colors?: string[]
}

const defaultColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#d946ef', '#a3a3a3'
]

export function DonutChart({ title, slices, colors = defaultColors }: DonutChartProps) {
  const data = {
    labels: slices.map(s => s.label || 'Unknown'),
    datasets: [
      {
        data: slices.map(s => s.count),
        backgroundColor: slices.map((_, i) => colors[i % colors.length]),
        borderWidth: 1,
      },
    ],
  }

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false, // allow the parent height to control the canvas
    cutout: '60%',
    plugins: {
      legend: {
        position: 'left',
        align: 'center',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 10,
          padding: 12,
        },
      },
      tooltip: { enabled: true },
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data</p>
        ) : (
          <div className="h-full w-full">
            <Doughnut data={data} options={options} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}