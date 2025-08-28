import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data</p>
        ) : (
          <Doughnut data={data} />
        )}
      </CardContent>
    </Card>
  )
}