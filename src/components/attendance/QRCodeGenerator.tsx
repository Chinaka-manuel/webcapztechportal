import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import { QrCode, Download, RefreshCw } from 'lucide-react';

interface Course {
  id: string;
  course_code: string;
  course_name: string;
}

const QRCodeGenerator = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

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

  const generateQRCode = async () => {
    if (!selectedCourse || !sessionName.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a course and enter a session name",
      });
      return;
    }

    setLoading(true);
    try {
      // Create QR code record in database
      const expires_at = new Date();
      expires_at.setHours(expires_at.getHours() + 2); // Expires in 2 hours

      const { data, error } = await supabase
        .from('qr_codes')
        .insert({
          course_id: selectedCourse,
          session_name: sessionName,
          code: crypto.randomUUID(),
          expires_at: expires_at.toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate QR code image
      const qrData = JSON.stringify({
        qr_code_id: data.id,
        course_id: selectedCourse,
        session_name: sessionName,
        expires_at: expires_at.toISOString(),
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      setQrCodeData(qrData);
      setQrCodeUrl(qrCodeDataUrl);

      toast({
        title: "QR Code Generated",
        description: "QR code has been generated successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.download = `${sessionName || 'qr-code'}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const resetForm = () => {
    setSelectedCourse('');
    setSessionName('');
    setQrCodeUrl('');
    setQrCodeData('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          QR Code Generator
        </CardTitle>
        <CardDescription>Generate QR codes for attendance tracking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="course">Course</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
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
            <Label htmlFor="session_name">Session Name</Label>
            <Input
              id="session_name"
              placeholder="e.g., Lecture 1, Tutorial 3"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={generateQRCode} disabled={loading} className="flex-1">
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <QrCode className="w-4 h-4 mr-2" />
            )}
            Generate QR Code
          </Button>
          <Button variant="outline" onClick={resetForm}>
            Reset
          </Button>
        </div>

        {qrCodeUrl && (
          <div className="border rounded-lg p-6 text-center space-y-4">
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="mx-auto border rounded"
            />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                QR Code for: <strong>{sessionName}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Expires in 2 hours from generation
              </p>
            </div>
            <Button onClick={downloadQRCode} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;