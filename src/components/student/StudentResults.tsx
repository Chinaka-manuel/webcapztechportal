import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const StudentResults = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Results</CardTitle>
        <CardDescription>View your exam results and grades</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          No results available yet.
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentResults;