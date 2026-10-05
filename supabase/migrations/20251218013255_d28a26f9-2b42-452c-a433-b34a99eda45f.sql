-- Create table for storing schedule data
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_name TEXT NOT NULL DEFAULT 'Escala',
  date TEXT NOT NULL,
  morning_shift TEXT,
  afternoon_shift TEXT,
  day_of_week TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and write
CREATE POLICY "Allow authenticated read access" ON public.schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert access" ON public.schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update access" ON public.schedules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete access" ON public.schedules FOR DELETE TO authenticated USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_schedules_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data from the spreadsheet
-- Production migration intentionally creates an empty table; source contact rows stay out of the database.