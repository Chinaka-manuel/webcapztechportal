-- Add DELETE policy for students table (admin only)
CREATE POLICY "Admin can delete students"
ON public.students
FOR DELETE
USING (get_current_user_role() = 'admin');

-- Add INSERT, UPDATE, DELETE policies for staff table (admin only)
CREATE POLICY "Admin can insert staff"
ON public.staff
FOR INSERT
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admin can update staff"
ON public.staff
FOR UPDATE
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admin can delete staff"
ON public.staff
FOR DELETE
USING (get_current_user_role() = 'admin');

-- Create function to generate unique student ID
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id text;
  current_year text;
  sequence_num int;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(student_id FROM 4 FOR 4) AS int)), 0) + 1
  INTO sequence_num
  FROM students
  WHERE student_id LIKE 'STU' || current_year || '%';
  new_id := 'STU' || current_year || LPAD(sequence_num::text, 4, '0');
  RETURN new_id;
END;
$$;

-- Create function to generate unique employee ID
CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id text;
  current_year text;
  sequence_num int;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_id FROM 4 FOR 4) AS int)), 0) + 1
  INTO sequence_num
  FROM staff
  WHERE employee_id LIKE 'EMP' || current_year || '%';
  new_id := 'EMP' || current_year || LPAD(sequence_num::text, 4, '0');
  RETURN new_id;
END;
$$;