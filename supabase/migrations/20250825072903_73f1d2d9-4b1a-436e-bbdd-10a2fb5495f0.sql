-- Add registered_by field to students table
ALTER TABLE public.students 
ADD COLUMN registered_by uuid REFERENCES public.profiles(id);

-- Add profile_picture_url to profiles table (address already exists)
ALTER TABLE public.profiles 
ADD COLUMN profile_picture_url text;

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-pictures', 'profile-pictures', true);

-- Create policies for profile picture uploads
CREATE POLICY "Profile pictures are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile picture" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile picture" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile picture" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add RLS policies for student management
CREATE POLICY "Admin and staff can insert students" 
ON public.students 
FOR INSERT 
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin'::text, 'staff'::text]));

CREATE POLICY "Admin and staff can update students" 
ON public.students 
FOR UPDATE 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'staff'::text]));

-- Allow admin and staff to create profiles for student registration
CREATE POLICY "Admin and staff can create student profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin'::text, 'staff'::text]));

CREATE POLICY "Admin and staff can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'staff'::text]));