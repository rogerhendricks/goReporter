import { useEffect, useMemo, useState } from "react"
import { Loader2, Mail, RefreshCw } from "lucide-react"

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

  const openLettersPreview = (appointments: Appointment[]) => {
    if (!appointments.length) {
      return
    }
    const html = appointments
      .map((appt, index) => {
        const patientName = `${appt.patient?.fname ?? ""} ${appt.patient?.lname ?? ""}`.trim() || "Patient"
        const start = new Date(appt.startAt)
        const dateStr = isNaN(start.getTime()) ? appt.startAt : start.toLocaleString()
        return `
          <section style="font-family: Arial, sans-serif; margin-bottom: 32px;">
            <p style="font-size: 14px; color: #555;">Letter ${index + 1} of ${appointments.length}</p>
            <h2 style="margin: 0 0 8px;">Missed Appointment Notice</h2>
            <p style="margin: 4px 0;">Dear ${patientName || "Patient"},</p>
            <p style="margin: 4px 0;">Our records show your appointment scheduled for <strong>${dateStr}</strong> was missed. Please contact our office to reschedule at your earliest convenience.</p>
            <p style="margin: 4px 0;">If you have already rescheduled, please disregard this notice.</p>
            <p style="margin: 12px 0 0;">Thank you,</p>
            <p style="margin: 4px 0;">Clinic Team</p>
          </section>
        `
      })
      .join("<hr style='margin:24px 0;' />")

    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>Missed Appointment Letters</title></head><body>${html}</body></html>`)
    win.document.close()
    win.focus()
  }

  const handleGenerateSelected = () => {
    openLettersPreview(selectedAppointments)
  }

  const handleGenerateSingle = (appointment: Appointment) => {
    openLettersPreview([appointment])
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
            disabled={!selectedAppointments.length}
            onClick={handleGenerateSelected}
          >
            <Mail className="mr-2 h-4 w-4" /> Generate Letters
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
                        <Badge variant="secondary" className="capitalize">
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleGenerateSingle(row)}>
                          <Mail className="mr-2 h-4 w-4" /> Letter
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