import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Calendar, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ExamResult {
  id: string;
  marks_obtained: number;
  grade: string;
  remarks: string;
  submitted_at: string;
  exams: {
    exam_name: string;
    total_marks: number;
    exam_date: string;
  };
}

const StudentResults = () => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile) {
      fetchResults();
    }
  }, [profile]);

  const fetchResults = async () => {
    try {
      // First get the student record
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (!student) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams (
            exam_name,
            total_marks,
            exam_date
          )
        `)
        .eq('student_id', student.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade?.toUpperCase()) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-3 w-1/4 mb-4" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Exam Results</h2>
        <Badge variant="secondary">{results.length} results</Badge>
      </div>
      
      {results.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No exam results available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{result.exams?.exam_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(result.exams?.exam_date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge className={getGradeColor(result.grade)}>
                    {result.grade || 'N/A'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Marks Obtained</p>
                    <p className="text-2xl font-bold text-primary">
                      {result.marks_obtained}/{result.exams?.total_marks}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Percentage</p>
                    <p className="text-2xl font-bold">
                      {Math.round((result.marks_obtained / result.exams?.total_marks) * 100)}%
                    </p>
                  </div>
                </div>
                {result.remarks && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Remarks</p>
                    <p className="text-sm">{result.remarks}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentResults;