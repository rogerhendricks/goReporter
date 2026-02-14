import { useEffect, useMemo, useState } from "react"
import { Loader2, Mail, RefreshCw } from "lucide-react"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

import { appointmentService, type Appointment } from "@/services/appointmentService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const PAGE_SIZE = 15

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type AdminAppointmentsResponse = {
  data: Appointment[]
  pagination: Pagination
  graceMinutes?: number
  lookbackDays?: number
}

export function MissedAppointments() {
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Appointment[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [graceMinutes, setGraceMinutes] = useState<number | undefined>()
  const [lookbackDays, setLookbackDays] = useState<number | undefined>()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res: AdminAppointmentsResponse = await appointmentService.getAdminAppointments({
          page,
          limit: PAGE_SIZE,
          filter: "missed",
        })
        if (!active) return
        setRows(res.data || [])
        setPagination(res.pagination)
        setGraceMinutes(res.graceMinutes)
        setLookbackDays(res.lookbackDays)
      } catch (err: any) {
        if (!active) return
        const message = err?.response?.data?.error || "Failed to load appointments"
        setError(message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [page])

  const allSelected = useMemo(() => {
    if (!rows.length) return false
    return rows.every((r) => selected.has(r.id))
  }, [rows, selected])

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (!rows.length) return
    setSelected((prev) => {
      if (rows.every((r) => prev.has(r.id))) {
        return new Set()
      }
      return new Set(rows.map((r) => r.id))
    })
  }

  const selectedAppointments = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected],
  )

  const formatDateStr = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const buildLettersPdf = async (appointments: Appointment[]) => {
    if (!appointments.length) return
    setGenerating(true)
    try {
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      const A5_WIDTH = 420 // points (~148mm)
      const A5_HEIGHT = 595 // points (~210mm)
      const margin = 32
      const usableWidth = A5_WIDTH - margin * 2

      for (const appt of appointments) {
        const page = pdfDoc.addPage([A5_WIDTH, A5_HEIGHT])
        const { height } = page.getSize()
        const patientName = `${appt.patient?.fname ?? ""} ${appt.patient?.lname ?? ""}`.trim() || "Patient"
        const mrnLine = appt.patient?.mrn ? `MRN: ${appt.patient.mrn}` : ""
        const cityStatePostal = [appt.patient?.city, appt.patient?.state, appt.patient?.postal]
          .filter(Boolean)
          .join(" ")
        const addressLines = [
          appt.patient?.street,
          cityStatePostal || undefined,
          appt.patient?.country,
        ].filter(Boolean) as string[]

        const addressYStart = height - margin - 20
        let cursorY = addressYStart

        // Address block for windowed envelope (top-left)
        page.drawText(patientName, { x: margin, y: cursorY, size: 12, font: boldFont, color: rgb(0, 0, 0) })
        cursorY -= 16
        if (mrnLine) {
          page.drawText(mrnLine, { x: margin, y: cursorY, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
          cursorY -= 14
        }
        for (const line of addressLines) {
          page.drawText(line, { x: margin, y: cursorY, size: 11, font, color: rgb(0, 0, 0) })
          cursorY -= 14
        }

        // Body
        let bodyY = cursorY - 24
        const lineHeight = 16
        const drawWrapped = (text: string, bold = false) => {
          const fontToUse = bold ? boldFont : font
          const words = text.split(" ")
          let line = ""
          for (const word of words) {
            const testLine = line ? `${line} ${word}` : word
            const width = fontToUse.widthOfTextAtSize(testLine, 11)
            if (width > usableWidth && line) {
              page.drawText(line, {
                x: margin,
                y: bodyY,
                size: 11,
                font: fontToUse,
                color: rgb(0, 0, 0),
              })
              bodyY -= lineHeight
              line = word
            } else {
              line = testLine
            }
          }
          if (line) {
            page.drawText(line, {
              x: margin,
              y: bodyY,
              size: 11,
              font: fontToUse,
              color: rgb(0, 0, 0),
            })
            bodyY -= lineHeight
          }
        }

        drawWrapped(`Date: ${formatDateStr(appt.startAt)}`, true)
        bodyY -= 6
        drawWrapped(`Dear ${patientName},`)
        drawWrapped(
          "Our records show your appointment was scheduled but not marked as arrived. Please contact our office to reschedule at your earliest convenience.",
        )
        drawWrapped(
          "If you have already rescheduled or attended, please disregard this notice.",
        )
        bodyY -= 6
        drawWrapped("Appointment Details", true)
        drawWrapped(`- Original date/time: ${formatDateStr(appt.startAt)}`)
        drawWrapped(`- Status: ${appt.status}`)
        bodyY -= 6
        drawWrapped("Thank you,")
        drawWrapped("Clinic Team")
      }

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, "_blank")
      if (!win) {
        // Fallback download if popup blocked
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = "missed-appointments.pdf"
        anchor.click()
      }

      // Mark letters as sent
      await appointmentService.markMissedLettersSent(appointments.map((a) => a.id))

      // Refresh current page to reflect sent status
      setRows((prev) =>
        prev.map((row) =>
          appointments.find((a) => a.id === row.id)
            ? { ...row, missedLetterSentAt: new Date().toISOString() }
            : row,
        ),
      )
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateSelected = () => {
    void buildLettersPdf(selectedAppointments)
  }

  const handleGenerateSingle = (appointment: Appointment) => {
    void buildLettersPdf([appointment])
  }

  const canGoPrev = pagination.page > 1
  const canGoNext = pagination.page < pagination.totalPages

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Missed Appointments</CardTitle>
          <p className="text-sm text-muted-foreground">
            Showing appointments still marked as scheduled after their start time
            {graceMinutes ? ` (grace ${graceMinutes} min)` : ""}
            {lookbackDays ? `, limited to past ${lookbackDays} day(s)` : ""}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button
            size="sm"
            disabled={!selectedAppointments.length || generating}
            onClick={handleGenerateSelected}
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Generate Letters
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Failed to load</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    aria-label="Select all"
                    checked={allSelected}
                    onCheckedChange={() => toggleAll()}
                    disabled={loading || !rows.length}
                  />
                </TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No missed appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const start = new Date(row.startAt)
                  const dateStr = isNaN(start.getTime()) ? row.startAt : start.toLocaleString()
                  const patientName = `${row.patient?.fname ?? ""} ${row.patient?.lname ?? ""}`.trim() || "Patient"
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Checkbox
                          aria-label={`Select appointment ${row.id}`}
                          checked={selected.has(row.id)}
                          onCheckedChange={() => toggleRow(row.id)}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{dateStr}</TableCell>
                      <TableCell>
                        <div className="font-medium">{patientName}</div>
                        {row.patient?.mrn && (
                          <div className="text-xs text-muted-foreground">MRN: {row.patient.mrn}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="capitalize w-fit">
                            {row.status}
                          </Badge>
                          {row.missedLetterSentAt && (
                            <Badge variant="outline" className="w-fit text-xs">
                              Letter sent
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGenerateSingle(row)}
                          disabled={generating}
                        >
                          {generating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="mr-2 h-4 w-4" />
                          )}
                          {row.missedLetterSentAt ? "Re-send" : "Letter"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canGoPrev || loading}>
              Previous
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => (canGoNext ? p + 1 : p))}
              disabled={!canGoNext || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}