import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Scan, CheckCircle, Clock } from 'lucide-react';

const QRCodeScanner = () => {
  const [qrInput, setQrInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState<any>(null);

  const handleAttendance = async () => {
    if (!qrInput.trim()) {
      toast({
        variant: "destructive",
        title: "Missing QR Code",
        description: "Please enter the QR code data",
      });
      return;
    }

    setLoading(true);
    try {
      // Parse QR code data
      let qrData;
      try {
        qrData = JSON.parse(qrInput);
      } catch {
        toast({
          variant: "destructive",
          title: "Invalid QR Code",
          description: "The QR code format is invalid",
        });
        return;
      }

      // Check if QR code is still valid (only for temporary codes)
      if (qrData.qr_type === 'course' && qrData.expires_at) {
        const now = new Date();
        const expiresAt = new Date(qrData.expires_at);
        
        if (now > expiresAt) {
          toast({
            variant: "destructive",
            title: "QR Code Expired",
            description: "This QR code has expired. Please get a new one.",
          });
          return;
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "You must be logged in to mark attendance",
        });
        return;
      }

      // Get student or staff record based on user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      let attendeeData = null;
      let attendeeType = '';

      if (profileData?.role === 'student') {
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (studentError || !studentData) {
          toast({
            variant: "destructive",
            title: "Student Record Not Found",
            description: "No student record found for your account",
          });
          return;
        }
        attendeeData = studentData;
        attendeeType = 'student';
      } else if (profileData?.role === 'staff' || profileData?.role === 'admin') {
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (staffError || !staffData) {
          toast({
            variant: "destructive",
            title: "Staff Record Not Found",
            description: "No staff record found for your account",
          });
          return;
        }
        attendeeData = staffData;
        attendeeType = 'staff';
      } else {
        toast({
          variant: "destructive",
          title: "Invalid User Role",
          description: "Only students and staff can mark attendance",
        });
        return;
      }

      // Check if attendance already exists
      const attendeeIdField = attendeeType === 'student' ? 'student_id' : 'staff_id';
      const { data: existingAttendance } = await supabase
        .from('attendance_records')
        .select('id')
        .eq(attendeeIdField, attendeeData.id)
        .eq('qr_code_id', qrData.qr_code_id)
        .maybeSingle();

      if (existingAttendance) {
        toast({
          variant: "destructive",
          title: "Already Marked",
          description: "You have already marked attendance for this session",
        });
        return;
      }

      // Mark attendance
      const attendanceRecord: any = {
        qr_code_id: qrData.qr_code_id,
        status: 'present',
        notes: notes.trim() || null,
        check_in_time: new Date().toISOString(),
      };
      
      // Set the appropriate ID field based on user type
      if (attendeeType === 'student') {
        attendanceRecord.student_id = attendeeData.id;
      } else {
        attendanceRecord.staff_id = attendeeData.id;
      }

      const { error: attendanceError } = await supabase
        .from('attendance_records')
        .insert(attendanceRecord);

      if (attendanceError) throw attendanceError;

      setLastScanned({
        session_name: qrData.session_name,
        timestamp: new Date().toLocaleString(),
      });

      toast({
        title: "Attendance Marked",
        description: "Your attendance has been successfully recorded",
      });

      // Reset form
      setQrInput('');
      setNotes('');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="w-5 h-5" />
          QR Code Scanner
        </CardTitle>
        <CardDescription>Scan QR codes to mark your attendance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="qr_input" className="text-sm font-medium">QR Code Data</Label>
          <Textarea
            id="qr_input"
            placeholder="Paste or type the QR code data here..."
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            rows={4}
            className="bg-background font-mono text-sm"
          />
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Demo Mode:</strong> In a real app, this would use camera scanning. For now, copy the QR data from the generator.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
          <Input
            id="notes"
            placeholder="Any additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-background"
          />
        </div>

        <Button onClick={handleAttendance} disabled={loading} className="w-full">
          {loading ? (
            <Clock className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Mark Attendance
        </Button>

        {lastScanned && (
          <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-3">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Attendance Successfully Marked!</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-green-600 dark:text-green-400">
                <strong>Session:</strong> {lastScanned.session_name}
              </p>
              <p className="text-xs text-green-500 dark:text-green-500">
                <strong>Marked at:</strong> {lastScanned.timestamp}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeScanner;