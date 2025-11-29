import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Award, Download, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Certificate {
  id: string;
  certificate_number: string;
  issue_date: string;
  grade: string;
  courses: {
    course_name: string;
    course_code: string;
  };
  barcode_data: string;
}

const StudentCertificates = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get student ID
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!studentData) return;

      // Fetch certificates
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          courses(course_name, course_code)
        `)
        .eq('student_id', studentData.id)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
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

  const downloadCertificate = (cert: Certificate) => {
    // Open verification page in new tab
    window.open(`/verify-certificate?cert=${cert.certificate_number}`, '_blank');
  };

  if (loading) {
    return <div className="text-center py-8">Loading certificates...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Award className="h-5 w-5" />
          <CardTitle>My Certificates</CardTitle>
        </div>
        <CardDescription>View and download your certificates</CardDescription>
      </CardHeader>
      <CardContent>
        {certificates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No certificates available yet.
          </div>
        ) : (
          <div className="space-y-4">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="p-4 border rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-lg">{cert.courses.course_name}</h4>
                      <Badge>{cert.courses.course_code}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Certificate Number: <span className="font-mono">{cert.certificate_number}</span>
                    </p>
                    <p className="text-sm text-muted-foreground mb-1">
                      Issue Date: {new Date(cert.issue_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Grade: {cert.grade || 'N/A'}
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    {cert.barcode_data && (
                      <img 
                        src={cert.barcode_data} 
                        alt="Certificate QR Code" 
                        className="h-20 w-20"
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadCertificate(cert)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentCertificates;