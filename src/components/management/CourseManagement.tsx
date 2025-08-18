import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  description?: string;
  credits: number;
  semester: number;
  instructor_id?: string;
  staff?: {
    profiles: {
      full_name: string;
    };
  };
}

interface StaffMember {
  id: string;
  profiles: {
    full_name: string;
  };
}

const CourseManagement = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [formData, setFormData] = useState({
    course_code: '',
    course_name: '',
    description: '',
    credits: 3,
    semester: 1,
    instructor_id: '',
  });

  useEffect(() => {
    fetchCourses();
    fetchStaff();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          staff (
            profiles (
              full_name
            )
          )
        `)
        .order('course_code');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch courses",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          id,
          profiles (
            full_name
          )
        `);

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const courseData = {
        ...formData,
        instructor_id: formData.instructor_id || null,
      };

      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', editingCourse.id);

        if (error) throw error;
        toast({ title: "Course updated successfully" });
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([courseData]);

        if (error) throw error;
        toast({ title: "Course added successfully" });
      }

      setDialogOpen(false);
      setEditingCourse(null);
      resetForm();
      fetchCourses();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Course deleted successfully" });
      fetchCourses();
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
      course_code: '',
      course_name: '',
      description: '',
      credits: 3,
      semester: 1,
      instructor_id: '',
    });
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      course_code: course.course_code,
      course_name: course.course_name,
      description: course.description || '',
      credits: course.credits,
      semester: course.semester,
      instructor_id: course.instructor_id || '',
    });
    setDialogOpen(true);
  };

  if (loading) {
    return <div>Loading courses...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Course Management</CardTitle>
            <CardDescription>Manage courses and their assignments</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingCourse(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCourse ? 'Edit' : 'Add'} Course</DialogTitle>
                <DialogDescription>
                  {editingCourse ? 'Update' : 'Add new'} course information.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="course_code">Course Code</Label>
                  <Input
                    id="course_code"
                    value={formData.course_code}
                    onChange={(e) => setFormData({...formData, course_code: e.target.value})}
                    placeholder="e.g., CS101"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="course_name">Course Name</Label>
                  <Input
                    id="course_name"
                    value={formData.course_name}
                    onChange={(e) => setFormData({...formData, course_name: e.target.value})}
                    placeholder="e.g., Introduction to Computer Science"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Course description..."
                  />
                </div>
                <div>
                  <Label htmlFor="credits">Credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    min="1"
                    max="6"
                    value={formData.credits}
                    onChange={(e) => setFormData({...formData, credits: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <Select 
                    value={formData.semester.toString()} 
                    onValueChange={(value) => setFormData({...formData, semester: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8].map(sem => (
                        <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="instructor_id">Instructor (Optional)</Label>
                  <Select 
                    value={formData.instructor_id} 
                    onValueChange={(value) => setFormData({...formData, instructor_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No instructor assigned</SelectItem>
                      {staff.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.profiles.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {editingCourse ? 'Update' : 'Add'} Course
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
              <TableHead>Course Code</TableHead>
              <TableHead>Course Name</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.course_code}</TableCell>
                <TableCell>{course.course_name}</TableCell>
                <TableCell>{course.credits}</TableCell>
                <TableCell>{course.semester}</TableCell>
                <TableCell>
                  {course.staff?.profiles?.full_name || 'Not assigned'}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(course)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(course.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {courses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No courses found. Add some courses to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CourseManagement;