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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="course" className="text-sm font-medium">Course</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{course.course_code}</span>
                      <span className="text-sm text-muted-foreground">{course.course_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="session_name" className="text-sm font-medium">Session Name</Label>
            <Input
              id="session_name"
              placeholder="e.g., Lecture 1, Tutorial 3, Lab Session"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="bg-background"
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
          <div className="border rounded-lg p-6 text-center space-y-6 bg-gradient-to-br from-background to-muted/50">
            <div className="bg-white p-4 rounded-lg shadow-sm inline-block">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="mx-auto"
              />
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {sessionName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Course: {courses.find(c => c.id === selectedCourse)?.course_code}
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  ⏰ This QR code expires in 2 hours from generation
                </p>
              </div>
            </div>
            <Button onClick={downloadQRCode} variant="outline" className="w-full sm:w-auto">
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