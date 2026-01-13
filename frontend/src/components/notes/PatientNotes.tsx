import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { patientNoteService, type PatientNote } from '@/services/patientNoteService'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Edit2, Trash2, Save, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface PatientNotesProps {
  patientId: number
}

export function PatientNotes({ patientId }: PatientNotesProps) {
  const [notes, setNotes] = useState<PatientNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const { user } = useAuthStore()

  useEffect(() => {
    loadNotes()
  }, [patientId, page])

  const loadNotes = async () => {
    try {
      setLoading(true)
      const data = await patientNoteService.getAll(patientId, page, 8)
      setNotes(data.notes)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Failed to load notes:', error)
      toast.error('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) {
      toast.error('Please enter a note')
      return
    }

    try {
      setSubmitting(true)
      await patientNoteService.create(patientId, {
        content: newNoteContent,
      })
      setNewNoteContent('')
      setPage(1) // Go to first page to see new note
      await loadNotes() // Reload notes
      toast.success('Note created successfully')
    } catch (error) {
      console.error('Failed to create note:', error)
      toast.error('Failed to create note')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (note: PatientNote) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setEditContent('')
  }

  const handleSaveEdit = async (noteId: number) => {
    if (!editContent.trim()) {
      toast.error('Note content cannot be empty')
      return
    }

    try {
      setSubmitting(true)
      await patientNoteService.update(patientId, noteId, {
        content: editContent,
      })
      setEditingNoteId(null)
      setEditContent('')
      await loadNotes() // Reload to get updated timestamps
      toast.success('Note updated successfully')
    } catch (error) {
      console.error('Failed to update note:', error)
      toast.error('Failed to update note')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    try {
      setSubmitting(true)
      await patientNoteService.delete(patientId, noteId)
      setDeleteNoteId(null)
      // If we deleted the last note on this page, go to previous page
      if (notes.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        await loadNotes()
      }
      toast.success('Note deleted successfully')
    } catch (error) {
      console.error('Failed to delete note:', error)
      toast.error('Failed to delete note')
    } finally {
      setSubmitting(false)
    }
  }

  const canEditNote = (note: PatientNote) => {
    return user?.ID === note.userId
  }

  const formatNoteDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
    } catch {
      return new Date(date).toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-24 bg-muted rounded-lg"></div>
          <div className="h-24 bg-muted rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create New Note */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <Textarea
              placeholder="Add a new note..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={submitting}
            />
            <div className="flex justify-end">
              <Button onClick={handleCreateNote} disabled={submitting || !newNoteContent.trim()}>
                {submitting ? 'Creating...' : 'Add Note'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.length === 0 ? (
          <Card>
            <CardContent className="p-4">
              <p className="text-center text-muted-foreground">
                No notes yet. Create the first note above.
              </p>
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="relative">
              <CardContent className="p-4">
                {editingNoteId === note.id ? (
                  <div className="space-y-4">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[100px] resize-none"
                      disabled={submitting}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(note.id)}
                        disabled={submitting}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={submitting}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                      <div>
                        <span className="font-medium">
                          {note.user.fullName}
                        </span>
                        <span className="mx-2">•</span>
                        <span>{formatNoteDate(note.createdAt)}</span>
                        {note.createdAt !== note.updatedAt && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="italic">edited {formatNoteDate(note.updatedAt)}</span>
                          </>
                        )}
                      </div>
                      {canEditNote(note) && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(note)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Edit note</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteNoteId(note.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete note</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {notes.length > 0 ? ((page - 1) * 8) + 1 : 0} to {Math.min(page * 8, total)} of {total} notes
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                  className="w-8"
                >
                  {p}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteNoteId !== null} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteNoteId && handleDeleteNote(deleteNoteId)}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
