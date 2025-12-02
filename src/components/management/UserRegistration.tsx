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

interface UserRegistrationData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  role: 'student' | 'staff';
  studentId?: string;
  course?: string;
  semester?: number;
  emergencyContact?: string;
  employeeId?: string;
  department?: string;
  position?: string;
  profilePicture: File | null;
}

const UserRegistration = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>('');
  
  const [formData, setFormData] = useState<UserRegistrationData>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    role: 'student',
    studentId: '',
    course: '',
    semester: 1,
    emergencyContact: '',
    employeeId: '',
    department: '',
    position: '',
    profilePicture: null,
  });

  const handleFileUpload = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

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
    
    const previewUrl = URL.createObjectURL(file);
    setProfilePictureUrl(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);

    try {
      // Create user account with a temporary password
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Upload profile picture if provided
      let uploadedPictureUrl = null;
      if (formData.profilePicture) {
        uploadedPictureUrl = await handleFileUpload(formData.profilePicture, authData.user.id);
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          profile_picture_url: uploadedPictureUrl,
        });

      if (profileError) throw profileError;

      // Assign role in user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: formData.role,
          created_by: profile.id,
        });

      if (roleError) throw roleError;

      // Create role-specific record
      if (formData.role === 'student') {
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            user_id: authData.user.id,
            student_id: formData.studentId!,
            course: formData.course!,
            semester: formData.semester!,
            emergency_contact: formData.emergencyContact,
            registered_by: profile.id,
          });

        if (studentError) throw studentError;
      } else if (formData.role === 'staff') {
        const { error: staffError } = await supabase
          .from('staff')
          .insert({
            user_id: authData.user.id,
            employee_id: formData.employeeId!,
            department: formData.department!,
            position: formData.position!,
          });

        if (staffError) throw staffError;
      }

      toast({
        title: "User registered successfully",
        description: `${formData.fullName} has been registered as ${formData.role}. Temporary password: ${tempPassword}`,
      });

      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        role: 'student',
        studentId: '',
        course: '',
        semester: 1,
        emergencyContact: '',
        employeeId: '',
        department: '',
        position: '',
        profilePicture: null,
      });
      setProfilePictureUrl('');

    } catch (error: any) {
      console.error('Error registering user:', error);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Failed to register user",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Register New User</CardTitle>
        <CardDescription>
          Create a new student or contract staff account
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
              <Label htmlFor="role">User Type *</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: 'student' | 'staff') => setFormData({...formData, role: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="staff">Contract Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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
          </div>

          {/* Student-specific fields */}
          {formData.role === 'student' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="studentId">Student ID *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="studentId"
                      value={formData.studentId}
                      onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                      required
                      placeholder="e.g., STU20250001"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        const { data, error } = await supabase.rpc('generate_student_id');
                        if (!error && data) {
                          setFormData({...formData, studentId: data});
                          toast({ title: "Student ID generated", description: data });
                        }
                      }}
                    >
                      Auto
                    </Button>
                  </div>
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
                  <Label htmlFor="semester">Semester *</Label>
                  <Select 
                    value={formData.semester?.toString()} 
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
                <div>
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                  />
                </div>
              </div>
            </>
          )}

          {/* Staff-specific fields */}
          {formData.role === 'staff' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employeeId">Employee ID *</Label>
                <div className="flex gap-2">
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    required
                    placeholder="e.g., EMP20250001"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const { data, error } = await supabase.rpc('generate_employee_id');
                      if (!error && data) {
                        setFormData({...formData, employeeId: data});
                        toast({ title: "Employee ID generated", description: data });
                      }
                    }}
                  >
                    Auto
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Enter full address"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Registering...' : `Register ${formData.role === 'student' ? 'Student' : 'Contract Staff'}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default UserRegistration;
