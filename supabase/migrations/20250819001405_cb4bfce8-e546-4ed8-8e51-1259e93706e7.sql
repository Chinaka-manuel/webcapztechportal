-- Create RLS policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid()::text = id);

-- Create RLS policies for students table
CREATE POLICY "Users can view their own student record" 
ON public.students 
FOR SELECT 
USING (auth.uid()::text = (SELECT id FROM profiles WHERE email = students.email));

CREATE POLICY "Students can view all student records" 
ON public.students 
FOR SELECT 
USING ((SELECT role FROM profiles WHERE id = auth.uid()::text) IN ('admin', 'staff', 'student'));

-- Create RLS policies for staff table
CREATE POLICY "Staff can view their own record" 
ON public.staff 
FOR SELECT 
USING (auth.uid()::text = (SELECT id FROM profiles WHERE email = staff.email));

CREATE POLICY "Admins can view all staff records" 
ON public.staff 
FOR SELECT 
USING ((SELECT role FROM profiles WHERE id = auth.uid()::text) IN ('admin', 'staff'));

-- Create RLS policies for courses table
CREATE POLICY "Everyone can view courses" 
ON public.courses 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can manage courses" 
ON public.courses 
FOR ALL 
USING ((SELECT role FROM profiles WHERE id = auth.uid()::text) IN ('admin', 'staff'));

-- Create RLS policies for exams table
CREATE POLICY "Everyone can view exams" 
ON public.exams 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can manage exams" 
ON public.exams 
FOR ALL 
USING ((SELECT role FROM profiles WHERE id = auth.uid()::text) IN ('admin', 'staff'));

-- Create RLS policies for attendance table
CREATE POLICY "Students can view their own attendance" 
ON public.attendance 
FOR SELECT 
USING (auth.uid()::text = (SELECT id FROM profiles WHERE email = (SELECT email FROM students WHERE id = attendance.student_id)));

CREATE POLICY "Staff can manage attendance" 
ON public.attendance 
FOR ALL 
USING ((SELECT role FROM profiles WHERE id = auth.uid()::text) IN ('admin', 'staff'));

-- Create RLS policies for enrollments table
CREATE POLICY "Students can view their own enrollments" 
ON public.enrollments 
FOR SELECT 
USING (auth.uid()::text = (SELECT id FROM profiles WHERE email = (SELECT email FROM students WHERE id = enrollments.student_id)));

CREATE POLICY "Staff can manage enrollments" 
ON public.enrollments 
FOR ALL 
USING ((SELECT role FROM profiles WHERE id = auth.uid()::text) IN ('admin', 'staff'));

-- Create RLS policies for results table
CREATE POLICY "Students can view their own results" 
ON public.results 
FOR SELECT 
USING (auth.uid()::text = (SELECT id FROM profiles WHERE email = (SELECT email FROM students WHERE id = results.student_id)));

CREATE POLICY "Staff can manage results" 
ON public.results 
FOR ALL 
USING ((SELECT role FROM profiles WHERE id = auth.uid()::text) IN ('admin', 'staff'));