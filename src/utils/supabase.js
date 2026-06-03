import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zobfevrnfvqucfwiszgz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvYmZldnJuZnZxdWNmd2lzemd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNzgzMzgsImV4cCI6MjA5NTc1NDMzOH0.nQJ1jeO85wYB6NeeG2yWLkuGiytDg6s4Qhh0IISxDuY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);