import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, QrCode } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AttendanceRecord {
  id: string;
  check_in_time: string;
  check_out_time?: string;
  status: string;
  notes?: string;
  students: {
    student_id: string;
    profiles: {
      full_name: string;
    };
  };
  qr_codes: {
    code: string;
    session_name: string;
    session_date: string;
    courses: {
      course_code: string;
      course_name: string;
    };
  };
}

interface Course {
  id: string;
  course_code: string;
  course_name: string;
}

const AttendanceManagement = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse || selectedDate) {
      fetchAttendanceRecords();
    }
  }, [selectedCourse, selectedDate]);

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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch courses",
      });
    }
  };

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          students (
            student_id,
            profiles (
              full_name
            )
          ),
          qr_codes (
            code,
            session_name,
            session_date,
            courses (
              course_code,
              course_name
            )
          )
        `)
        .order('check_in_time', { ascending: false });

      // Filter by course if selected
      if (selectedCourse) {
        query = query.eq('qr_codes.course_id', selectedCourse);
      }

      // Filter by date if selected
      if (selectedDate) {
        const startDate = new Date(selectedDate);
        const endDate = new Date(selectedDate);
        endDate.setDate(endDate.getDate() + 1);
        
        query = query
          .gte('check_in_time', startDate.toISOString())
          .lt('check_in_time', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch attendance records",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'default';
      case 'late': return 'secondary';
      case 'absent': return 'destructive';
      default: return 'outline';
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Management</CardTitle>
        <CardDescription>Monitor student attendance across sessions</CardDescription>
        
        <div className="flex gap-4 pt-4">
          <div className="flex-1">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All courses</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.course_code} - {course.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading attendance records...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.students.profiles.full_name}
                    </TableCell>
                    <TableCell>{record.students.student_id}</TableCell>
                    <TableCell>{record.qr_codes.courses.course_code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.qr_codes.session_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(record.qr_codes.session_date)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatTime(record.check_in_time)}</TableCell>
                    <TableCell>
                      {record.check_out_time 
                        ? formatTime(record.check_out_time) 
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {attendanceRecords.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <QrCode className="mx-auto h-12 w-12 mb-4" />
                <div>No attendance records found for the selected filters.</div>
                <div className="text-sm mt-2">
                  Students need to scan QR codes to mark attendance.
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceManagement;