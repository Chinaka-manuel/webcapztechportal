import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Scan, CheckCircle, Clock } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  notes: string | null;
}

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
        setLoading(false);
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
          setLoading(false);
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
        setLoading(false);
        return;
      }

      // Get profile
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
          setLoading(false);
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
          setLoading(false);
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
        setLoading(false);
        return;
      }

      // Check for existing attendance record for today
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;
      
      // Get existing attendance record with simplified approach
      let existingRecord: AttendanceRecord | null = null;
      
      // For now, only students can use this feature since staff_id column doesn't exist yet
      if (attendeeType !== 'student') {
        toast({
          variant: "destructive",
          title: "Feature Not Available",
          description: "Check-in/check-out is currently only available for students",
        });
        setLoading(false);
        return;
      }

      try {
        const { data: records } = await supabase
          .from('attendance_records')
          .select('id, check_in_time, check_out_time, notes')
          .eq('qr_code_id', qrData.qr_code_id)
          .eq('student_id', attendeeData.id)
          .gte('check_in_time', startOfDay)
          .lt('check_in_time', endOfDay);

        if (records && records.length > 0) {
          existingRecord = {
            id: records[0].id,
            check_in_time: records[0].check_in_time,
            check_out_time: records[0].check_out_time,
            notes: records[0].notes
          };
        }
      } catch (error) {
        console.log('Error checking existing records:', error);
      }

      if (existingRecord) {
        // Check if it's been at least 3 hours since check-in
        const checkInTime = new Date(existingRecord.check_in_time);
        const now = new Date();
        const hoursDiff = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

        if (existingRecord.check_out_time) {
          toast({
            variant: "destructive",
            title: "Already Checked Out",
            description: "You have already completed your attendance for today",
          });
          setLoading(false);
          return;
        }

        if (hoursDiff < 3) {
          toast({
            variant: "destructive",
            title: "Too Early to Check Out",
            description: `You must wait at least 3 hours before checking out. ${(3 - hoursDiff).toFixed(1)} hours remaining.`,
          });
          setLoading(false);
          return;
        }

        // Update existing record with check-out time
        const { error: updateError } = await supabase
          .from('attendance_records')
          .update({ 
            check_out_time: new Date().toISOString(),
            notes: notes.trim() || existingRecord.notes 
          })
          .eq('id', existingRecord.id);

        if (updateError) throw updateError;

        setLastScanned({
          session_name: qrData.session_name,
          timestamp: new Date().toLocaleString(),
          action: 'check_out',
          duration: `${hoursDiff.toFixed(1)} hours`,
        });

        toast({
          title: "Checked Out Successfully",
          description: `You have been checked out after ${hoursDiff.toFixed(1)} hours`,
        });
      } else {
        // Create new attendance record for check-in
        const attendanceRecord: any = {
          qr_code_id: qrData.qr_code_id,
          status: 'present',
          notes: notes.trim() || null,
          check_in_time: new Date().toISOString(),
        };
        
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
          action: 'check_in',
        });

        toast({
          title: "Checked In Successfully",
          description: "Your attendance has been recorded. Scan again after 3 hours to check out.",
        });
      }

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
        <CardDescription>Scan QR codes to check in and check out</CardDescription>
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
          Check In/Out
        </Button>

        {lastScanned && (
          <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-3">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">
                {lastScanned.action === 'check_in' ? 'Checked In Successfully!' : 'Checked Out Successfully!'}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-green-600 dark:text-green-400">
                <strong>Session:</strong> {lastScanned.session_name}
              </p>
              <p className="text-xs text-green-500 dark:text-green-500">
                <strong>{lastScanned.action === 'check_in' ? 'Checked in at:' : 'Checked out at:'}</strong> {lastScanned.timestamp}
              </p>
              {lastScanned.duration && (
                <p className="text-xs text-green-500 dark:text-green-500">
                  <strong>Duration:</strong> {lastScanned.duration}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeScanner;