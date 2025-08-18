import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Staff {
  id: string;
  employee_id: string;
  department: string;
  position: string;
  hire_date: string;
  salary?: number;
  profiles: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

const StaffManagement = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
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
          profiles (
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
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
        // Note: user_id field needs to be handled properly
        toast({ 
          variant: "destructive",
          title: "Feature Not Available", 
          description: "Staff creation requires user account setup" 
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Staff member deleted successfully" });
      fetchStaff();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
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
    return <div>Loading staff...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Staff Management</CardTitle>
            <CardDescription>Manage staff members and their information</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingStaff(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingStaff ? 'Edit' : 'Add'} Staff Member</DialogTitle>
                <DialogDescription>
                  {editingStaff ? 'Update' : 'Add new'} staff member information.
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
                  {editingStaff ? 'Update' : 'Add'} Staff Member
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
                <TableCell>{staffMember.profiles.full_name}</TableCell>
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
                      onClick={() => handleDelete(staffMember.id)}
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
            No staff members found. Add some staff to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffManagement;