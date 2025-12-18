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

-- Allow public read/write for now (can be restricted later with auth)
CREATE POLICY "Allow public read access" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.schedules FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.schedules FOR DELETE USING (true);

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
INSERT INTO public.schedules (date, morning_shift, afternoon_shift, day_of_week) VALUES
('01/dez', 'ANA', 'ANA', 'SEG'),
('02/dez', 'THABATA', 'THABATA', 'TER'),
('03/dez', 'CAROL', 'ANA', 'QUA'),
('04/dez', 'LARISSA', 'CASSIO', 'QUI'),
('05/dez', 'AMANDA', 'AMANDA', 'SEX'),
('06/dez', 'KAROLLYNE', '', 'SAB'),
('08/dez', '', '', 'SEG'),
('09/dez', 'THABATA', 'THABATA', 'TER'),
('10/dez', 'CAROL', 'ANA', 'QUA'),
('11/dez', 'LARISSA', 'ANA', 'QUI'),
('12/dez', 'AMANDA', 'AMANDA', 'SEX'),
('13/dez', '', '', 'SAB'),
('15/dez', 'ANA', 'ANA', 'SEG'),
('16/dez', 'THABATA', 'THABATA', 'TER'),
('17/dez', 'CAROL', 'ANA', 'QUA'),
('18/dez', 'LARISSA', 'CASSIO', 'QUI'),
('19/dez', 'AMANDA', '', 'SEX'),
('20/dez', 'KAROLLYNE', '', 'SAB'),
('22/dez', 'ANA', 'ANA', 'SEG'),
('23/dez', '', 'KAROLLYNE', 'TER');