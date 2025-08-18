import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Calendar, QrCode, LogOut, CheckCircle } from 'lucide-react';
import QRCodeScanner from '@/components/attendance/QRCodeScanner';
import StudentResults from '@/components/student/StudentResults';
import StudentAttendance from '@/components/student/StudentAttendance';
import StudentCourses from '@/components/student/StudentCourses';

const StudentDashboard = () => {
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    upcomingExams: 0,
    attendanceRate: 0,
  });
  const [studentData, setStudentData] = useState<any>(null);

  useEffect(() => {
    fetchStudentData();
  }, [profile]);

  const fetchStudentData = async () => {
    if (!profile?.id) return;

    try {
      // Get student record
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (student) {
        setStudentData(student);
        
        // Fetch basic stats
        const [coursesResult, examsResult, attendanceResult] = await Promise.all([
          supabase.from('courses').select('id', { count: 'exact' }),
          supabase.from('exams')
            .select('id', { count: 'exact' })
            .gte('exam_date', new Date().toISOString()),
          supabase.from('attendance_records')
            .select('status', { count: 'exact' })
            .eq('student_id', student.id)
            .eq('status', 'present'),
        ]);

        setStats({
          enrolledCourses: coursesResult.count || 0,
          upcomingExams: examsResult.count || 0,
          attendanceRate: 85, // This would need more complex calculation
        });
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-6 py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.full_name}</p>
            {studentData && (
              <p className="text-sm text-muted-foreground">
                Student ID: {studentData.student_id} | Course: {studentData.course} | Semester: {studentData.semester}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.enrolledCourses}</div>
              <p className="text-xs text-muted-foreground">This semester</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingExams}</div>
              <p className="text-xs text-muted-foreground">Next 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
              <p className="text-xs text-muted-foreground">Overall attendance</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="qr-scanner">QR Scanner</TabsTrigger>
          </TabsList>
          
          <TabsContent value="courses">
            <StudentCourses />
          </TabsContent>
          
          <TabsContent value="results">
            <StudentResults />
          </TabsContent>
          
          <TabsContent value="attendance">
            <StudentAttendance />
          </TabsContent>
          
          <TabsContent value="qr-scanner">
            <QRCodeScanner />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;