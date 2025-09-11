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
import { Edit, Trash2, Save, X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function UserManagementTable() {
    const { users, loading, fetchUsers, createUser, updateUser, deleteUser } = useUserStore();
    const [saving, setSaving] = useState(false);

    // State for tracking which row is being edited
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    
    // State for holding the data of the user being edited or added
    const [editedUser, setEditedUser] = useState<Partial<User> | null>(null);
    
    // State to toggle the "add new user" row
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleEdit = (user: User) => {
        setIsAdding(false); // Ensure we are not in 'add' mode
        setEditingRowId(user.ID);
        // Populate the editedUser state with the data of the selected row
        setEditedUser({ ...user, password: '' });
    };

    const handleCancel = () => {
        setEditingRowId(null);
        setEditedUser(null);
        setIsAdding(false);
    };

const handleSave = async () => {
    if (!editedUser) return;

    try {
        setSaving(true);

        if (isAdding) {
            if (!editedUser.username || !editedUser.email || !editedUser.password || !editedUser.role) {
                toast.error('All fields are required to create a new user.');
                return;
            }
            const newUser = await createUser(editedUser);
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

    // Update the 'editedUser' state as the user types in the input fields
    const handleInputChange = (field: keyof User, value: string) => {
        if (editedUser) {
            setEditedUser({ ...editedUser, [field]: value });
        }
    };

    const handleAddNew = () => {
        handleCancel(); // Reset any existing edit state
        setIsAdding(true);
        // Initialize an empty user object for the "add" row
        setEditedUser({ ID: 'new-user', username: '', email: '', role: 'user', password: '' });
    };

    return (
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-left">Username</TableHead>
                            <TableHead className="text-left">Email</TableHead>
                            <TableHead className="text-left">Password</TableHead>
                            <TableHead className="text-left">Role</TableHead>
                            <TableHead className="text-left">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && users.length === 0 ? (
                            <TableRow className="text-left">
                                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {/* Row for adding a new user appears here when isAdding is true */}
                                {isAdding && editedUser && (
                                    <TableRow key="add-new-user-row" className="text-left">
                                        <TableCell><Input value={editedUser.username} onChange={(e) => handleInputChange('username', e.target.value)} placeholder="Username" /></TableCell>
                                        <TableCell><Input type="email" value={editedUser.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="Email" /></TableCell>
                                        <TableCell><Input type="password" value={editedUser.password} onChange={(e) => handleInputChange('password', e.target.value)} placeholder="Password" /></TableCell>
                                        <TableCell>
                                            <Select value={editedUser.role} onValueChange={(value) => handleInputChange('role', value)}>
                                                <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="doctor">Doctor</SelectItem>
                                                    <SelectItem value="user">User</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button onClick={handleSave} size="sm" disabled={saving}>
                                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                </Button>
                                                <Button onClick={handleCancel} variant="outline" size="sm"><X className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}

                                {/* Map over existing users and render rows conditionally */}
                                {users.map((user) => {
                                    // This is the crucial check: is this specific row the one being edited?
                                    const isEditing = editingRowId === user.ID;

                                    // Render the editable row if 'isEditing' is true for this user
                                    if (isEditing && editedUser) {
                                        return (
                                            <TableRow key={user.ID} className="text-left">
                                                <TableCell><Input value={editedUser.username} onChange={(e) => handleInputChange('username', e.target.value)} /></TableCell>
                                                <TableCell><Input type="email" value={editedUser.email} onChange={(e) => handleInputChange('email', e.target.value)} /></TableCell>
                                                <TableCell><Input type="password" value={editedUser.password} onChange={(e) => handleInputChange('password', e.target.value)} placeholder="New password (optional)" /></TableCell>
                                                <TableCell>
                                                    <Select value={editedUser.role} onValueChange={(value) => handleInputChange('role', value)}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="admin">Admin</SelectItem>
                                                            <SelectItem value="doctor">Doctor</SelectItem>
                                                            <SelectItem value="user">User</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button onClick={handleSave} size="sm" disabled={saving}>
                                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                        </Button>
                                                        <Button onClick={handleCancel} variant="outline" size="sm"><X className="h-4 w-4" /></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }
                                    
                                    // Otherwise, render the standard display row
                                    return (
                                        <TableRow key={user.ID} className="text-left">
                                            <TableCell>{user.username}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>******</TableCell>
                                            <TableCell>{user.role}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button onClick={() => handleEdit(user)} variant="outline" size="sm" disabled={isAdding || !!editingRowId}><Edit className="h-4 w-4" /></Button>
                                                    <Button onClick={() => handleDelete(user)} variant="destructive" size="sm" disabled={isAdding || !!editingRowId}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
