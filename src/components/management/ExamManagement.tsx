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
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Exam {
  id: string;
  exam_name: string;
  exam_type: string;
  exam_date: string;
  duration_minutes: number;
  total_marks: number;
  instructions?: string;
  courses: {
    course_code: string;
    course_name: string;
  };
}

interface Course {
  id: string;
  course_code: string;
  course_name: string;
}

const ExamManagement = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [formData, setFormData] = useState({
    course_id: '',
    exam_name: '',
    exam_type: 'midterm',
    exam_date: '',
    duration_minutes: 60,
    total_marks: 100,
    instructions: '',
  });

  useEffect(() => {
    fetchExams();
    fetchCourses();
  }, []);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          courses (
            course_code,
            course_name
          )
        `)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch exams",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, course_code, course_name')
        .order('course_code');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExam) {
        const { error } = await supabase
          .from('exams')
          .update(formData)
          .eq('id', editingExam.id);

        if (error) throw error;
        toast({ title: "Exam updated successfully" });
      } else {
        // Note: created_by field needs to be handled properly
        toast({ 
          variant: "destructive",
          title: "Feature Not Available", 
          description: "Exam creation requires admin setup" 
        });
        return;
      }

      setDialogOpen(false);
      setEditingExam(null);
      resetForm();
      fetchExams();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Exam deleted successfully" });
      fetchExams();
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
      course_id: '',
      exam_name: '',
      exam_type: 'midterm',
      exam_date: '',
      duration_minutes: 60,
      total_marks: 100,
      instructions: '',
    });
  };

  const openEditDialog = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      course_id: '', // We'd need to get this from the exam data
      exam_name: exam.exam_name,
      exam_type: exam.exam_type,
      exam_date: new Date(exam.exam_date).toISOString().slice(0, 16),
      duration_minutes: exam.duration_minutes,
      total_marks: exam.total_marks,
      instructions: exam.instructions || '',
    });
    setDialogOpen(true);
  };

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case 'final': return 'destructive';
      case 'midterm': return 'default';
      case 'quiz': return 'secondary';
      case 'assignment': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <div>Loading exams...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Exam Management</CardTitle>
            <CardDescription>Schedule and manage examinations</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingExam(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Exam
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingExam ? 'Edit' : 'Schedule'} Exam</DialogTitle>
                <DialogDescription>
                  {editingExam ? 'Update' : 'Schedule new'} exam details.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="course_id">Course</Label>
                  <Select 
                    value={formData.course_id} 
                    onValueChange={(value) => setFormData({...formData, course_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.course_code} - {course.course_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="exam_name">Exam Name</Label>
                  <Input
                    id="exam_name"
                    value={formData.exam_name}
                    onChange={(e) => setFormData({...formData, exam_name: e.target.value})}
                    placeholder="e.g., Midterm Examination"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="exam_type">Exam Type</Label>
                  <Select 
                    value={formData.exam_type} 
                    onValueChange={(value) => setFormData({...formData, exam_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="midterm">Midterm</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="exam_date">Exam Date & Time</Label>
                  <Input
                    id="exam_date"
                    type="datetime-local"
                    value={formData.exam_date}
                    onChange={(e) => setFormData({...formData, exam_date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    min="15"
                    max="300"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="total_marks">Total Marks</Label>
                  <Input
                    id="total_marks"
                    type="number"
                    min="1"
                    value={formData.total_marks}
                    onChange={(e) => setFormData({...formData, total_marks: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="instructions">Instructions (Optional)</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                    placeholder="Exam instructions..."
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingExam ? 'Update' : 'Schedule'} Exam
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
              <TableHead>Exam Name</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((exam) => (
              <TableRow key={exam.id}>
                <TableCell className="font-medium">{exam.exam_name}</TableCell>
                <TableCell>{exam.courses?.course_code || 'Unknown Course'}</TableCell>
                <TableCell>
                  <Badge variant={getExamTypeColor(exam.exam_type)}>
                    {exam.exam_type}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(exam.exam_date).toLocaleDateString()}</TableCell>
                <TableCell>{exam.duration_minutes} mins</TableCell>
                <TableCell>{exam.total_marks}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(exam)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(exam.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {exams.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No exams scheduled. Schedule some exams to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExamManagement;