-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'staff', 'student');

-- Create profiles table for all users
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create students table for student-specific data
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL UNIQUE,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  course TEXT NOT NULL,
  semester INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  emergency_contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff table for staff-specific data
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  salary DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_code TEXT NOT NULL UNIQUE,
  course_name TEXT NOT NULL,
  description TEXT,
  credits INTEGER NOT NULL DEFAULT 3,
  instructor_id UUID REFERENCES public.staff(id),
  semester INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL,
  exam_type TEXT NOT NULL, -- 'midterm', 'final', 'quiz', 'assignment'
  exam_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_marks INTEGER NOT NULL DEFAULT 100,
  instructions TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exam results table
CREATE TABLE public.exam_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks_obtained DECIMAL(5,2) NOT NULL,
  grade TEXT,
  remarks TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- Create QR codes table for attendance
CREATE TABLE public.qr_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'present', -- 'present', 'late', 'absent'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(qr_code_id, student_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = user_uuid;
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Students policies
CREATE POLICY "Everyone can view students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Admins and staff can manage students" ON public.students FOR ALL USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff')
);

-- Staff policies  
CREATE POLICY "Everyone can view staff" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL USING (
  public.get_user_role(auth.uid()) = 'admin'
);

-- Courses policies
CREATE POLICY "Everyone can view courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Staff and admins can manage courses" ON public.courses FOR ALL USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff')
);

-- Exams policies
CREATE POLICY "Everyone can view exams" ON public.exams FOR SELECT USING (true);
CREATE POLICY "Staff and admins can manage exams" ON public.exams FOR ALL USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff')
);

-- Exam results policies
CREATE POLICY "Students can view their own results" ON public.exam_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND user_id = auth.uid())
);
CREATE POLICY "Staff and admins can view all results" ON public.exam_results FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff')
);
CREATE POLICY "Staff and admins can manage results" ON public.exam_results FOR ALL USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff')
);

-- QR codes policies
CREATE POLICY "Everyone can view QR codes" ON public.qr_codes FOR SELECT USING (true);
CREATE POLICY "Staff and admins can manage QR codes" ON public.qr_codes FOR ALL USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff')
);

-- Attendance records policies
CREATE POLICY "Students can view their own attendance" ON public.attendance_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND user_id = auth.uid())
);
CREATE POLICY "Staff and admins can view all attendance" ON public.attendance_records FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff')
);
CREATE POLICY "Students can insert their own attendance" ON public.attendance_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.students WHERE id = student_id AND user_id = auth.uid())
);
CREATE POLICY "Staff and admins can manage attendance" ON public.attendance_records FOR ALL USING (
  public.get_user_role(auth.uid()) IN ('admin', 'staff')
);

-- Create function and trigger for profiles auto-creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exam_results_updated_at BEFORE UPDATE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();