import { useEffect, useState } from 'react';
import { useUserStore } from '@/stores/userStore';
import type { User } from '@/stores/userStore';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Edit, Trash2, Save, X, Plus, Loader2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';

import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;

export function UserManagementTable() {
    const { users, loading, fetchUsers, createUser, updateUser, deleteUser } = useUserStore();
    const [saving, setSaving] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editedUser, setEditedUser] = useState<Partial<User> | null>(null);
    const [isAdding, setIsAdding] = useState(false);


    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleEdit = (user: User) => {
        setIsAdding(false);
        setEditingRowId(user.ID);
        setEditedUser({ ...user, password: '' });
    };

    const handleCancel = () => {
        setEditingRowId(null);
        setEditedUser(null);
        setIsAdding(false);
    };

    const handleSave = async () => {
        if (!editedUser) return;

        if (editedUser.isTemporary && !editedUser.expiresAt) {
            toast.error('Temporary users require an expiration date.');
            return;
        }

        try {
            setSaving(true);

            if (isAdding) {
                if (!editedUser.username || !editedUser.email || !editedUser.password || !editedUser.role || !editedUser.fullName) {
                    toast.error('All fields are required to create a new user.');
                    return;
                }
                const { ID, ...userDataForCreation } = editedUser;
                const newUser = await createUser(userDataForCreation);
                if (newUser) {
                    await fetchUsers();
                    handleCancel();
                }
            } else if (editingRowId) {
                const { password, ...userData } = editedUser;
                const payload = password ? editedUser : userData;

                const updatedUser = await updateUser(editingRowId, payload);
                if (updatedUser) {
                    await fetchUsers();
                    handleCancel();
                }
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (user: User) => {
        if (window.confirm(`Are you sure you want to delete the user "${user.username}"?`)) {
            deleteUser(user.ID);
        }
    };

    const handleInputChange = (field: keyof User, value: string | boolean | null) => {
        if (!editedUser) return;

        if (field === 'role' && value === 'doctor' && editedUser.role !== 'doctor') {
            if (!confirm('Changing role to "Doctor" will create a doctor record for patient access. Continue?')) {
                return;
            }
        }

        const nextState: Partial<User> = { ...editedUser, [field]: value as never };

        if (field === 'isTemporary' && value === false) {
            nextState.expiresAt = null;
        }

        if (field === 'expiresAt') {
            nextState.expiresAt = (value as string | null) || null;
        }

        setEditedUser(nextState);
    };

    const handleAddNew = () => {
        handleCancel();
        setIsAdding(true);
        setEditedUser({
            username: '',
            email: '',
            role: 'user',
            password: '',
            fullName: '',
            isTemporary: false,
            expiresAt: null,
        });
    };

    const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentUsers = users.slice(startIndex, endIndex);

    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const goToPreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const renderTemporaryControls = (userState: Partial<User>) => {
        const isTemporary = Boolean(userState.isTemporary);
        const expiresAt = userState.expiresAt ? new Date(userState.expiresAt) : null;
        const isExpired = isTemporary && expiresAt ? expiresAt < new Date() : false;
        const expiresLabel = expiresAt ? formatDistanceToNow(expiresAt, { addSuffix: true }) : 'Not set';
        const switchId = userState.ID ? `temp-access-${userState.ID}` : 'temp-access-new';

        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor={switchId} className="text-xs uppercase tracking-wide text-muted-foreground">
                        Temporary Access
                    </Label>
                    <Switch
                        id={switchId}
                        checked={isTemporary}
                        onCheckedChange={(checked) => handleInputChange('isTemporary', checked)}
                    />
                </div>
                <div className={cn('rounded-md border p-3 space-y-2', isTemporary ? 'bg-muted' : 'opacity-60')}>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Expiration
                    </div>
                    {isTemporary ? (
                        <div className="space-y-2">
                            <Input
                                type="datetime-local"
                                value={userState.expiresAt ? format(new Date(userState.expiresAt), "yyyy-MM-dd'T'HH:mm") : ''}
                                onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                            />
                            <div className="flex items-center gap-2 text-xs">
                                {expiresAt && (
                                    <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                                        {isExpired ? 'Expired' : `Expires ${expiresLabel}`}
                                    </Badge>
                                )}
                                {!expiresAt && <span className="text-destructive">Expiration required</span>}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">Enable to grant limited-time access.</p>
                    )}
                </div>
            </div>
        );
    };

    const renderTemporaryStatus = (user: User) => {
        if (!user.isTemporary) return null;
        const expiresAt = user.expiresAt ? new Date(user.expiresAt) : null;
        const isExpired = expiresAt ? expiresAt < new Date() : false;

        return (
            <div className="flex flex-col gap-1">
                <Badge variant={isExpired ? 'destructive' : 'secondary'} className="w-fit">
                    {isExpired ? 'Expired' : 'Temporary'}
                </Badge>
                {expiresAt && (
                    <span className="text-xs text-muted-foreground">
                        Expires {formatDistanceToNow(expiresAt, { addSuffix: true })}
                    </span>
                )}
            </div>
        );
    };

    return (
        <>
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Create, edit, and manage system users.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end mb-4">
                    <Button onClick={handleAddNew} disabled={isAdding || !!editingRowId}>
                        <Plus className="mr-2 h-4 w-4" /> Add New User
                    </Button>
                </div>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-left">Full Name</TableHead>
                                <TableHead className="text-left">Username</TableHead>
                                <TableHead className="text-left">Email</TableHead>
                                <TableHead className="text-left">Password</TableHead>
                                <TableHead className="text-left">Role</TableHead>
                                <TableHead className="text-left">Temporary Access</TableHead>
                                <TableHead className="text-left">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && users.length === 0 ? (
                                <TableRow className="text-left">
                                    <TableCell colSpan={7} className="text-center">
                                        <Skeleton className="h-8 w-full" />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                    {isAdding && editedUser && (
                                        <TableRow key="add-new-user-row" className="text-left">
                                            <TableCell>
                                                <Input value={editedUser.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} placeholder="Full Name" />
                                            </TableCell>
                                            <TableCell>
                                                <Input value={editedUser.username} onChange={(e) => handleInputChange('username', e.target.value)} placeholder="Username" />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="email" value={editedUser.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="Email" />
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-2">
                                                    <PasswordInput
                                                        value={editedUser.password || ''}
                                                        onChange={(e) => handleInputChange('password', e.target.value)}
                                                        placeholder="Password"
                                                        showStrength={false}
                                                    />
                                                    {editedUser.password && (
                                                        <div className="absolute z-50 mt-1 p-3 bg-popover border rounded-lg shadow-lg w-[350px]">
                                                            <PasswordStrengthIndicator
                                                                password={editedUser.password}
                                                                showRequirements={true}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select value={editedUser.role} onValueChange={(value) => handleInputChange('role', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                        <SelectItem value="doctor">Doctor</SelectItem>
                                                        <SelectItem value="user">User</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                {renderTemporaryControls(editedUser)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button onClick={handleSave} size="sm" disabled={saving}>
                                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                    </Button>
                                                    <Button onClick={handleCancel} variant="outline" size="sm">
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {currentUsers.map((user) => {
                                        const isEditing = editingRowId === user.ID;

                                        if (isEditing && editedUser) {
                                            return (
                                                <TableRow key={user.ID} className="text-left">
                                                    <TableCell>
                                                        <Input value={editedUser.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input value={editedUser.username} onChange={(e) => handleInputChange('username', e.target.value)} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input type="email" value={editedUser.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-2">
                                                            <PasswordInput
                                                                value={editedUser.password || ''}
                                                                onChange={(e) => handleInputChange('password', e.target.value)}
                                                                placeholder="New password (optional)"
                                                                showStrength={false}
                                                            />
                                                            {editedUser.password && (
                                                                <div className="absolute z-50 mt-1 p-3 bg-popover border rounded-lg shadow-lg w-[350px]">
                                                                    <PasswordStrengthIndicator
                                                                        password={editedUser.password}
                                                                        showRequirements={true}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select value={editedUser.role} onValueChange={(value) => handleInputChange('role', value)}>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="admin">Admin</SelectItem>
                                                                <SelectItem value="doctor">Doctor</SelectItem>
                                                                <SelectItem value="user">User</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        {renderTemporaryControls({ ...editedUser, ID: user.ID })}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button onClick={handleSave} size="sm" disabled={saving}>
                                                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                            </Button>
                                                            <Button onClick={handleCancel} variant="outline" size="sm">
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }

                                        return (
                                            <TableRow key={user.ID} className="text-left">
                                                <TableCell>{user.fullName}</TableCell>
                                                <TableCell>{user.username}</TableCell>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>******</TableCell>
                                                <TableCell>{user.role}</TableCell>
                                                <TableCell>{renderTemporaryStatus(user)}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button onClick={() => handleEdit(user)} variant="outline" size="sm" disabled={isAdding || (!!editingRowId && editingRowId !== user.ID)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button onClick={() => handleDelete(user)} variant="destructive" size="sm" disabled={isAdding || !!editingRowId}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {users.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                            Showing {startIndex + 1} to {Math.min(endIndex, users.length)} of {users.length} users
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToPreviousPage}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <div className="text-sm">
                                Page {currentPage} of {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
        </>
    );
}
