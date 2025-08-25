-- Add RLS policy to allow students to insert their own attendance records
CREATE POLICY "Students can create their own attendance" 
ON public.attendance_records 
FOR INSERT 
WITH CHECK (student_id IN ( 
  SELECT students.id
  FROM students
  WHERE (students.user_id = auth.uid())
));