import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Staff {
  id: string;
  employee_id: string;
  department: string;
  position: string;
  hire_date: string;
  salary?: number;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
    phone?: string;
  } | null;
}

const StaffManagement = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    department: '',
    position: '',
    hire_date: new Date().toISOString().split('T')[0],
    salary: '',
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          profiles!staff_user_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff((data as any) || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch staff",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const staffData = {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary) : null,
      };

      if (editingStaff) {
        const { error } = await supabase
          .from('staff')
          .update(staffData)
          .eq('id', editingStaff.id);

        if (error) throw error;
        toast({ title: "Staff member updated successfully" });
      } else {
        toast({ 
          variant: "destructive",
          title: "Use User Registration", 
          description: "Please use the User Registration tab to add new staff" 
        });
        return;
      }

      setDialogOpen(false);
      setEditingStaff(null);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDeleteClick = (staffMember: Staff) => {
    setDeletingStaff(staffMember);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStaff) return;

    setDeleteLoading(true);
    try {
      const response = await supabase.functions.invoke('admin-delete-user', {
        body: {
          userId: deletingStaff.id,
          userType: 'staff',
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete staff');
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete staff');
      }

      toast({ title: "Staff member deleted successfully" });
      fetchStaff();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setDeletingStaff(null);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      department: '',
      position: '',
      hire_date: new Date().toISOString().split('T')[0],
      salary: '',
    });
  };

  const openEditDialog = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData({
      employee_id: staffMember.employee_id,
      department: staffMember.department,
      position: staffMember.position,
      hire_date: staffMember.hire_date,
      salary: staffMember.salary?.toString() || '',
    });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading staff...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>Manage staff members and their information</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => { resetForm(); setEditingStaff(null); }}>
                  Edit Mode
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Staff Member</DialogTitle>
                  <DialogDescription>
                    Update staff member information.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input
                      id="employee_id"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="hire_date">Hire Date</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary">Salary (Optional)</Label>
                    <Input
                      id="salary"
                      type="number"
                      step="0.01"
                      value={formData.salary}
                      onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Update Staff Member
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((staffMember) => (
                <TableRow key={staffMember.id}>
                  <TableCell className="font-medium">{staffMember.employee_id}</TableCell>
                  <TableCell>{staffMember.profiles?.full_name || 'Unknown Staff'}</TableCell>
                  <TableCell>{staffMember.department}</TableCell>
                  <TableCell>{staffMember.position}</TableCell>
                  <TableCell>{new Date(staffMember.hire_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(staffMember)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(staffMember)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {staff.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No staff members found. Use the User Registration tab to add staff.
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingStaff?.profiles?.full_name || 'this staff member'}? 
              This will permanently remove their account, profile, and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StaffManagement;
