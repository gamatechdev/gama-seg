
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wofipjazcxwxzzxjsflh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZmlwamF6Y3h3eHp6eGpzZmxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MDA2NjcsImV4cCI6MjA3NDM3NjY2N30.gKjTEhXbrvRxKcn3cNvgMlbigXypbshDWyVaLqDjcpQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log("Checking schema for 'clientes' table...");
    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching data:", error);
    } else {
        console.log("Sample record from 'clientes':");
        console.log(JSON.stringify(data[0], null, 2));
        console.log("\nKeys in 'clientes':", Object.keys(data[0] || {}).join(", "));
    }
}

checkSchema();
