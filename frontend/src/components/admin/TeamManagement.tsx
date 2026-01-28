import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Users, X, Search } from 'lucide-react'
import { teamService, type Team } from '@/services/teamService'
import { toast } from 'sonner'
import api from '@/utils/axios'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTeamStore } from '@/stores/teamStore'

interface User {
  ID: number
  username: string
  fullName: string
  email: string
  role: string
}

export function TeamManagement() {
  const { fetchTeams: fetchTeamsFromStore } = useTeamStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [memberPopoverOpen, setMemberPopoverOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    managerId: undefined as number | undefined,
    memberIds: [] as number[]
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [teamsData, usersData] = await Promise.all([
        teamService.getAllTeams(),
        api.get<User[]>('/users').then(res => res.data)
      ])
      setTeams(teamsData)
      // Also update the store so other components can use it
      fetchTeamsFromStore()
      setUsers(usersData)
    } catch (error) {
      toast.error('Failed to load teams')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (team?: Team) => {
    if (team) {
      setEditingTeam(team)
      setFormData({
        name: team.name,
        description: team.description || '',
        color: team.color || '#3b82f6',
        managerId: team.managerId,
        memberIds: team.members.map(m => m.ID)
      })
    } else {
      setEditingTeam(null)
      setFormData({
        name: '',
        description: '',
        color: '#3b82f6',
        managerId: undefined,
        memberIds: []
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTeam) {
        await teamService.updateTeam(editingTeam.id, formData)
        toast.success('Team updated successfully')
      } else {
        await teamService.createTeam(formData)
        toast.success('Team created successfully')
      }
      setDialogOpen(false)
      loadData()
    } catch (error) {
      toast.error(editingTeam ? 'Failed to update team' : 'Failed to create team')
      console.error(error)
    }
  }

  const handleDelete = async (teamId: number) => {
    if (!confirm('Are you sure you want to delete this team?')) return
    
    try {
      await teamService.deleteTeam(teamId)
      toast.success('Team deleted successfully')
      loadData()
    } catch (error) {
      toast.error('Failed to delete team')
      console.error(error)
    }
  }

  const addMember = (userId: number) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter(id => id !== userId)
        : [...prev.memberIds, userId]
    }))
  }

  const removeMember = (userId: number) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.filter(id => id !== userId)
    }))
  }

  const getSelectedUsers = () => {
    return users.filter(u => formData.memberIds.includes(u.ID))
  }

  const getAvailableUsers = () => {
    return users.filter(u => !formData.memberIds.includes(u.ID))
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>Create and manage teams for productivity tracking</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen} modal={false}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
                  <DialogDescription>
                    {editingTeam ? 'Update team details and members' : 'Create a new team and assign members'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Team Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="color">Team Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="color"
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-20 h-10"
                      />
                      <span className="text-sm text-muted-foreground">{formData.color}</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="manager">Team Manager (Optional)</Label>
                    <select
                      id="manager"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.managerId || ''}
                      onChange={(e) => setFormData({ ...formData, managerId: e.target.value ? Number(e.target.value) : undefined })}
                    >
                      <option value="">No manager</option>
                      {users.map(user => (
                        <option key={user.ID} value={user.ID}>
                          {user.fullName} (@{user.username})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Team Members *</Label>
                    <Popover open={memberPopoverOpen} onOpenChange={(open) => {
                      setMemberPopoverOpen(open)
                      if (!open) setUserSearch('') // Clear search when closing
                    }} modal={false}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {formData.memberIds.length === 0
                              ? 'Select team members...'
                              : `${formData.memberIds.length} member${formData.memberIds.length !== 1 ? 's' : ''} selected`}
                          </span>
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={true}>
                          <CommandInput 
                            placeholder="Search users..."
                            value={userSearch}
                            onValueChange={setUserSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                              {getAvailableUsers().map((user) => (
                                <CommandItem
                                  key={user.ID}
                                  value={`${user.fullName} ${user.username} ${user.email} ${user.ID}`}
                                  onSelect={() => {
                                    addMember(user.ID)
                                    setUserSearch('')
                                  }}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div>
                                      <div className="font-medium">{user.fullName}</div>
                                      <div className="text-xs text-muted-foreground">@{user.username}</div>
                                      <div className="text-xs text-muted-foreground">@{user.ID}</div>
                                    </div>
                                    <Badge variant="outline">{user.role}</Badge>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Selected Members */}
                    {getSelectedUsers().length > 0 && (
                      <div className="mt-2 border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                        {getSelectedUsers().map((user) => (
                          <div
                            key={user.ID}
                            className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{user.fullName}</div>
                                <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                              </div>
                              <Badge variant="outline" className="shrink-0">{user.role}</Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMember(user.ID)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground mt-2">
                      {formData.memberIds.length === 0
                        ? 'No members selected. Click above to add members.'
                        : `${formData.memberIds.length} member${formData.memberIds.length !== 1 ? 's' : ''} selected`}
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTeam ? 'Update Team' : 'Create Team'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No teams yet. Create your first team to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map(team => (
                <TableRow key={team.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {team.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                      )}
                      <span className="font-medium">{team.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {team.manager ? team.manager.fullName : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      {team.members.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {team.description || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDialog(team)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(team.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
