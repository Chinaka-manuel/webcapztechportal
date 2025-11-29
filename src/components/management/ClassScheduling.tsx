import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarIcon, Plus, Edit, Trash2, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface ClassSchedule {
  id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  room_number: string;
  topic: string;
  status: string;
  courses: {
    course_name: string;
    course_code: string;
  };
  staff: {
    employee_id: string;
    profiles: {
      full_name: string;
    };
  };
}

const ClassScheduling = () => {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    course_id: '',
    instructor_id: '',
    class_date: '',
    start_time: '',
    end_time: '',
    room_number: '',
    topic: '',
    notes: '',
    status: 'scheduled'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch schedules
      const { data: schedData, error: schedError } = await supabase
        .from('class_schedules')
        .select(`
          *,
          courses(course_name, course_code),
          staff(employee_id, profiles(full_name))
        `)
        .order('class_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (schedError) throw schedError;
      setSchedules(schedData || []);

      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, course_code, course_name');
      
      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Fetch instructors
      const { data: instructorsData, error: instructorsError } = await supabase
        .from('staff')
        .select('id, employee_id, profiles(full_name)');
      
      if (instructorsError) throw instructorsError;
      setInstructors(instructorsData || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSchedule) {
        const { error } = await supabase
          .from('class_schedules')
          .update(formData)
          .eq('id', editingSchedule.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Class schedule updated successfully',
        });
      } else {
        const { error } = await supabase.from('class_schedules').insert(formData);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Class schedule created successfully',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class schedule?')) return;

    try {
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Class schedule deleted successfully',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      course_id: '',
      instructor_id: '',
      class_date: '',
      start_time: '',
      end_time: '',
      room_number: '',
      topic: '',
      notes: '',
      status: 'scheduled'
    });
    setEditingSchedule(null);
    setSelectedDate(undefined);
  };

  const openEditDialog = (schedule: ClassSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      course_id: schedule.courses ? courses.find(c => c.course_name === schedule.courses.course_name)?.id || '' : '',
      instructor_id: schedule.staff ? instructors.find(i => i.employee_id === schedule.staff.employee_id)?.id || '' : '',
      class_date: schedule.class_date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      room_number: schedule.room_number,
      topic: schedule.topic,
      notes: '',
      status: schedule.status
    });
    setSelectedDate(new Date(schedule.class_date));
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      scheduled: 'default',
      completed: 'success',
      cancelled: 'destructive',
      postponed: 'secondary'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading schedules...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Class Scheduling</CardTitle>
            <CardDescription>Manage class schedules and timetables</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSchedule ? 'Edit' : 'Schedule New'} Class</DialogTitle>
                <DialogDescription>
                  {editingSchedule ? 'Update the class schedule' : 'Create a new class schedule'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="course_id">Course</Label>
                    <Select value={formData.course_id} onValueChange={(value) => setFormData({ ...formData, course_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.course_code} - {course.course_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="instructor_id">Instructor</Label>
                    <Select value={formData.instructor_id} onValueChange={(value) => setFormData({ ...formData, instructor_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        {instructors.map((instructor: any) => (
                          <SelectItem key={instructor.id} value={instructor.id}>
                            {instructor.employee_id} - {instructor.profiles?.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Class Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setFormData({ ...formData, class_date: date ? format(date, 'yyyy-MM-dd') : '' });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="room_number">Room Number</Label>
                  <Input
                    id="room_number"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    placeholder="e.g., Room 101"
                  />
                </div>
                <div>
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="Class topic"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="postponed">Postponed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingSchedule ? 'Update' : 'Schedule'} Class</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No classes scheduled yet. Schedule your first class above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>{new Date(schedule.class_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {schedule.start_time} - {schedule.end_time}
                    </div>
                  </TableCell>
                  <TableCell>{schedule.courses.course_code}</TableCell>
                  <TableCell>{schedule.staff.profiles.full_name}</TableCell>
                  <TableCell>{schedule.room_number || 'N/A'}</TableCell>
                  <TableCell>{schedule.topic || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(schedule)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(schedule.id)}>
                        <Trash2 className="h-4 w-4" />
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
  );
};

export default ClassScheduling;