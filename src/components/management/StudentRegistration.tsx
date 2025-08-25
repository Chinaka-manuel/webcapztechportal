import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface StudentRegistrationData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  studentId: string;
  course: string;
  semester: number;
  emergencyContact: string;
  profilePicture: File | null;
}

const StudentRegistration = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>('');
  
  const [formData, setFormData] = useState<StudentRegistrationData>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    studentId: '',
    course: '',
    semester: 1,
    emergencyContact: '',
    profilePicture: null,
  });

  const handleFileUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `temp/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handlePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select a file smaller than 5MB",
      });
      return;
    }

    setFormData({ ...formData, profilePicture: file });
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setProfilePictureUrl(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);

    try {
      // Upload profile picture if provided
      let uploadedPictureUrl = null;
      if (formData.profilePicture) {
        uploadedPictureUrl = await handleFileUpload(formData.profilePicture);
      }

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: 'TempPassword123!', // Temporary password - student should change this
        email_confirm: true,
        user_metadata: {
          full_name: formData.fullName,
          role: 'student'
        }
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          role: 'student',
          profile_picture_url: uploadedPictureUrl,
        });

      if (profileError) throw profileError;

      // Create student record
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          user_id: authData.user.id,
          student_id: formData.studentId,
          course: formData.course,
          semester: formData.semester,
          emergency_contact: formData.emergencyContact,
          registered_by: profile.id,
        });

      if (studentError) throw studentError;

      toast({
        title: "Student registered successfully",
        description: `${formData.fullName} has been registered as a student.`,
      });

      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        studentId: '',
        course: '',
        semester: 1,
        emergencyContact: '',
        profilePicture: null,
      });
      setProfilePictureUrl('');

    } catch (error: any) {
      console.error('Error registering student:', error);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Failed to register student",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Register New Student</CardTitle>
        <CardDescription>
          Create a new student account with profile information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Upload */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-32 h-32">
              <AvatarImage src={profilePictureUrl} />
              <AvatarFallback>
                <User className="w-16 h-16" />
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                type="file"
                id="profile-picture"
                accept="image/*"
                onChange={handlePictureChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('profile-picture')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Picture
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="studentId">Student ID *</Label>
              <Input
                id="studentId"
                value={formData.studentId}
                onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="course">Course *</Label>
              <Input
                id="course"
                value={formData.course}
                onChange={(e) => setFormData({...formData, course: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="semester">Semester</Label>
              <Select 
                value={formData.semester.toString()} 
                onValueChange={(value) => setFormData({...formData, semester: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8].map(sem => (
                    <SelectItem key={sem} value={sem.toString()}>{sem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Enter full address"
            />
          </div>

          <div>
            <Label htmlFor="emergencyContact">Emergency Contact</Label>
            <Input
              id="emergencyContact"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
              placeholder="Emergency contact information"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Registering...' : 'Register Student'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default StudentRegistration;