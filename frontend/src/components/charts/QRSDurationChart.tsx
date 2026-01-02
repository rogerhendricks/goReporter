import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { useTheme } from '@/components/theme-provider'


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

type QrsReportLike = {
  reportDate: string | Date
  qrs_duration: number | null
}

interface QRSDurationChartProps {
  reports: QrsReportLike[]
}

export function QRSDurationChart({ reports }: QRSDurationChartProps) {
  // const { theme } = useTheme()
  
  // Get theme-aware colors
  const root = document.documentElement
  const style = getComputedStyle(root)
  const primaryColor = style.getPropertyValue('--color-chart-1').trim() || 'hsl(var(--chart-1))'
  const textColor = style.getPropertyValue('--color-foreground').trim() || 'hsl(var(--foreground))'
  const gridColor = style.getPropertyValue('--color-border').trim() || 'hsl(var(--border))'
  
  // Normalize and filter reports that have usable QRS duration data.
  // In practice these values can arrive as strings/undefined depending on source.
  const qrsReports = reports
    .map((r) => {
      const date = new Date(r.reportDate)
      const qrs = r.qrs_duration === null ? NaN : Number(r.qrs_duration)
      return { date, qrs }
    })
    .filter((r) => Number.isFinite(r.qrs) && !Number.isNaN(r.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  if (qrsReports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QRS Duration Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No QRS duration data available</p>
        </CardContent>
      </Card>
    )
  }

  const data = {
    labels: qrsReports.map((r) => r.date.toLocaleDateString()),
    datasets: [
      {
        label: 'QRS Duration (ms)',
        data: qrsReports.map((r) => r.qrs),
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        tension: 0.1,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: textColor,
        },
      },
      title: {
        display: true,
        text: 'QRS Duration Measurements',
        color: textColor,
      },
      tooltip: {
        backgroundColor: 'hsl(var(--popover))',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: gridColor,
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Duration (ms)',
          color: textColor,
        },
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
      x: {
        title: {
          display: true,
          text: 'Report Date',
          color: textColor,
        },
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QRS Duration Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <Line data={data} options={options} style={{ width: '100%', height: '100%' }} />
        </div>
      </CardContent>
    </Card>
  )
}