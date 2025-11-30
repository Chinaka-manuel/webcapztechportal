import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Award, Download, Eye, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

interface Certificate {
  id: string;
  certificate_number: string;
  issue_date: string;
  grade: string;
  student: any;
  courses: any;
  barcode_data: string;
}

const CertificateManagement = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    course_id: '',
    grade: '',
    remarks: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch certificates
      const { data: certsData, error: certsError } = await supabase
        .from('certificates')
        .select(`
          *,
          student:students(student_id, user_profile:profiles(full_name, email)),
          courses(course_name, course_code)
        `)
        .order('created_at', { ascending: false });

      if (certsError) throw certsError;
      setCertificates(certsData as any || []);

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, student_id, profiles(full_name)');
      
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, course_code, course_name');
      
      if (coursesError) throw coursesError;
      setCourses(coursesData || []);
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

  const generateCertificateNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CERT-${year}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const certificateNumber = generateCertificateNumber();
      const barcodeData = `${window.location.origin}/verify-certificate?cert=${certificateNumber}`;
      
      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(barcodeData);

      const { error } = await supabase.from('certificates').insert({
        student_id: formData.student_id,
        course_id: formData.course_id,
        certificate_number: certificateNumber,
        grade: formData.grade,
        remarks: formData.remarks,
        issued_by: user.id,
        barcode_data: qrCodeDataURL
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Certificate generated successfully',
      });

      setIsDialogOpen(false);
      setFormData({ student_id: '', course_id: '', grade: '', remarks: '' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const downloadCertificate = async (cert: any) => {
    // Create a simple certificate HTML
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .certificate { border: 10px solid #0066cc; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #0066cc; font-size: 48px; margin: 20px 0; }
            .student-name { font-size: 36px; font-weight: bold; margin: 30px 0; }
            .details { font-size: 18px; margin: 20px 0; }
            .qr-code { margin: 30px 0; }
          </style>
        </head>
        <body>
          <div class="certificate">
            <h1>Certificate of Completion</h1>
            <p class="details">This is to certify that</p>
            <p class="student-name">${cert.student?.user_profile?.full_name || 'N/A'}</p>
            <p class="details">has successfully completed</p>
            <p class="details"><strong>${cert.courses?.course_name || 'N/A'} (${cert.courses?.course_code || 'N/A'})</strong></p>
            <p class="details">Grade: ${cert.grade || 'N/A'}</p>
            <p class="details">Certificate Number: ${cert.certificate_number}</p>
            <p class="details">Issue Date: ${new Date(cert.issue_date).toLocaleDateString()}</p>
            <div class="qr-code">
              <img src="${cert.barcode_data}" alt="Verification QR Code" />
              <p>Scan to verify authenticity</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${cert.certificate_number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="text-center py-8">Loading certificates...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Certificate Management</CardTitle>
            <CardDescription>Generate and manage student certificates</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Generate Certificate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Generate New Certificate</DialogTitle>
                <DialogDescription>Create a certificate for a student</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="student_id">Student</Label>
                  <Select value={formData.student_id} onValueChange={(value) => setFormData({ ...formData, student_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.student_id} - {student.profiles?.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="e.g., A, B+, 85%"
                  />
                </div>
                <div>
                  <Label htmlFor="remarks">Remarks (Optional)</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Additional comments"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Generate Certificate</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {certificates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No certificates found. Generate your first certificate above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate Number</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.map((cert: any) => (
                <TableRow key={cert.id}>
                  <TableCell className="font-mono">{cert.certificate_number}</TableCell>
                  <TableCell>{cert.student?.user_profile?.full_name || 'N/A'}</TableCell>
                  <TableCell>{cert.courses?.course_name || 'N/A'}</TableCell>
                  <TableCell>{cert.grade || 'N/A'}</TableCell>
                  <TableCell>{new Date(cert.issue_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => downloadCertificate(cert)}>
                        <Download className="h-4 w-4" />
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

export default CertificateManagement;