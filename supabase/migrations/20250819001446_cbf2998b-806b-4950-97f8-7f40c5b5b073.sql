-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create RLS policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Create RLS policies for students table
CREATE POLICY "Users can view their own student record" 
ON public.students 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all student records" 
ON public.students 
FOR SELECT 
USING (public.get_current_user_role() IN ('admin', 'staff'));

-- Create RLS policies for staff table
CREATE POLICY "Users can view their own staff record" 
ON public.staff 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all staff records" 
ON public.staff 
FOR SELECT 
USING (public.get_current_user_role() IN ('admin'));

-- Create RLS policies for courses table
CREATE POLICY "Everyone can view courses" 
ON public.courses 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can manage courses" 
ON public.courses 
FOR ALL 
USING (public.get_current_user_role() IN ('admin', 'staff'));

-- Create RLS policies for exams table
CREATE POLICY "Everyone can view exams" 
ON public.exams 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can manage exams" 
ON public.exams 
FOR ALL 
USING (public.get_current_user_role() IN ('admin', 'staff'));

-- Create RLS policies for exam_results table
CREATE POLICY "Students can view their own results" 
ON public.exam_results 
FOR SELECT 
USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Staff can manage results" 
ON public.exam_results 
FOR ALL 
USING (public.get_current_user_role() IN ('admin', 'staff'));

-- Create RLS policies for attendance_records table
CREATE POLICY "Students can view their own attendance" 
ON public.attendance_records 
FOR SELECT 
USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Staff can manage attendance" 
ON public.attendance_records 
FOR ALL 
USING (public.get_current_user_role() IN ('admin', 'staff'));

-- Create RLS policies for qr_codes table
CREATE POLICY "Staff can manage QR codes" 
ON public.qr_codes 
FOR ALL 
USING (public.get_current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Students can view active QR codes" 
ON public.qr_codes 
FOR SELECT 
USING (expires_at > now());