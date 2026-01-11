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
  legendPosition?: 'top' | 'left' | 'right' | 'bottom'
  showCounts?: boolean
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

export function DonutChart({ title, slices, colors, legendPosition = 'left', showCounts = false }: DonutChartProps) {
  const themeColors = colors || getChartColors()
  const borderColor = getBorderColor()
  const textColor = getTextColor()
  
  // Format labels with counts if showCounts is true
  const labels = slices.map(s => {
    const label = s.label || 'Unknown'
    return showCounts ? `${label} (${s.count})` : label
  })
  
  const data = {
    labels: labels,
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
        position: legendPosition,
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
        // Use callback functions so colors are computed at render time
        backgroundColor: () => {
          const isDark = document.documentElement.classList.contains('dark')
          return isDark ? '#1f2937' : '#ffffff'
        },
        titleColor: () => {
          const isDark = document.documentElement.classList.contains('dark')
          return isDark ? '#f9fafb' : '#111827'
        },
        bodyColor: () => {
          const isDark = document.documentElement.classList.contains('dark')
          return isDark ? '#f9fafb' : '#111827'
        },
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
