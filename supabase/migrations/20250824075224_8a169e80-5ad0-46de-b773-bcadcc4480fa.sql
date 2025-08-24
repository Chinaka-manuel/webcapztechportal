-- Add support for permanent QR codes
-- Make expires_at nullable for permanent codes
ALTER TABLE public.qr_codes ALTER COLUMN expires_at DROP NOT NULL;

-- Make course_id nullable for general attendance codes
ALTER TABLE public.qr_codes ALTER COLUMN course_id DROP NOT NULL;

-- Add a type field to distinguish between course-specific and general QR codes
ALTER TABLE public.qr_codes ADD COLUMN qr_type text NOT NULL DEFAULT 'course';

-- Add check constraint for qr_type
ALTER TABLE public.qr_codes ADD CONSTRAINT check_qr_type CHECK (qr_type IN ('course', 'general'));

-- Update RLS policy for students to access permanent QR codes
DROP POLICY IF EXISTS "Students can view active QR codes" ON public.qr_codes;

CREATE POLICY "Students can view active QR codes" 
ON public.qr_codes 
FOR SELECT 
TO authenticated
USING (
  qr_type = 'general' OR 
  (qr_type = 'course' AND expires_at > now())
);