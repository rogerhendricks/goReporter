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
  // Filter reports that have QRS duration data
  const qrsReports = reports
    // .filter((report) => report.qrs_duration !== null)
    .filter((r): r is QrsReportLike & { qrs_duration: number } => r.qrs_duration !== null)
    .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())

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
    labels: qrsReports.map((report) => new Date(report.reportDate).toLocaleDateString()),
    datasets: [
      {
        label: 'QRS Duration (ms)',
        data: qrsReports.map((report) => report.qrs_duration),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'QRS Duration Measurements',
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Duration (ms)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Report Date',
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
        <div className="h-64">
          <Line data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  )
}