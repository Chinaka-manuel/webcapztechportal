import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const StudentAttendance = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Attendance</CardTitle>
        <CardDescription>View your attendance records</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          No attendance records found.
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentAttendance;