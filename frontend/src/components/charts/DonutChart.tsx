import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import type { ChartOptions } from 'chart.js'
// import { useTheme } from '@/components/theme-provider'

ChartJS.register(ArcElement, Tooltip, Legend)

type Slice = { label: string; count: number }
interface DonutChartProps {
  title: string
  slices: Slice[]
  colors?: string[]
}

// Use CSS custom properties for theme-aware colors
const getChartColors = () => {
  const root = document.documentElement
  const style = getComputedStyle(root)
  return [
    style.getPropertyValue('--color-chart-1').trim() || 'hsl(var(--chart-1))',
    style.getPropertyValue('--color-chart-2').trim() || 'hsl(var(--chart-2))',
    style.getPropertyValue('--color-chart-3').trim() || 'hsl(var(--chart-3))',
    style.getPropertyValue('--color-chart-4').trim() || 'hsl(var(--chart-4))',
    style.getPropertyValue('--color-chart-5').trim() || 'hsl(var(--chart-5))',
  ]
}

const getBorderColor = () => {
  const root = document.documentElement
  const style = getComputedStyle(root)
  return style.getPropertyValue('--color-border').trim() || 'hsl(var(--border))'
}

const getTextColor = () => {
  const root = document.documentElement
  const style = getComputedStyle(root)
  return style.getPropertyValue('--color-foreground').trim() || 'hsl(var(--foreground))'
}

export function DonutChart({ title, slices, colors }: DonutChartProps) {
  // const { theme } = useTheme()
  const themeColors = colors || getChartColors()
  const borderColor = getBorderColor()
  const textColor = getTextColor()
  const data = {
    labels: slices.map(s => s.label || 'Unknown'),
    datasets: [
      {
        data: slices.map(s => s.count),
        backgroundColor: slices.map((_, i) => themeColors[i % themeColors.length]),
        borderColor: borderColor,
        borderWidth: 1,
      },
    ],
  }

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
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
          color: textColor,
        },
      },
      tooltip: { 
        enabled: true,
        backgroundColor: 'hsl(var(--popover))',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: borderColor,
        borderWidth: 1,
      },
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