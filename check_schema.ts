import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wofipjazcxwxzzxjsflh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZmlwamF6Y3h3eHp6eGpzZmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MDA2NjcsImV4cCI6MjA3NDM3NjY2N30.gKjTEhXbrvRxKcn3cNvgMlbigXypbshDWyVaLqDjcpQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log("Fetching procedure with ID 416...");
    const { data: results, error } = await supabase
        .from('procedimento')
        .select('*')
        .eq('id', 416)
        .single();

    if (error) {
        console.error("Error fetching data:", error);
    } else {
        console.log("Procedure 416 details:", JSON.stringify(results, null, 2));
    }
}

checkSchema();
