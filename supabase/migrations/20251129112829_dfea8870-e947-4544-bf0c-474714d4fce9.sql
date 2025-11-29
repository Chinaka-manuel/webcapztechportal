-- Create certificates table
CREATE TABLE public.certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_number text NOT NULL UNIQUE,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  issued_by uuid NOT NULL REFERENCES public.profiles(id),
  grade text,
  remarks text,
  barcode_data text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Certificates policies
CREATE POLICY "Students can view their own certificates" 
ON public.certificates 
FOR SELECT 
USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Staff can manage certificates" 
ON public.certificates 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'staff'::text]));

CREATE POLICY "Anyone can verify certificates" 
ON public.certificates 
FOR SELECT 
USING (true);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin'::text, 'staff'::text]));

-- Create class schedules table
CREATE TABLE public.class_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  class_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  room_number text,
  topic text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on class schedules
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Class schedules policies
CREATE POLICY "Everyone can view class schedules" 
ON public.class_schedules 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can manage class schedules" 
ON public.class_schedules 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'staff'::text]));

-- Add trigger for updated_at on certificates
CREATE TRIGGER update_certificates_updated_at
BEFORE UPDATE ON public.certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on class_schedules
CREATE TRIGGER update_class_schedules_updated_at
BEFORE UPDATE ON public.class_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();