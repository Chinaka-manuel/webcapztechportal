import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const StudentCourses = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Courses</CardTitle>
        <CardDescription>View your enrolled courses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          No courses found.
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentCourses;