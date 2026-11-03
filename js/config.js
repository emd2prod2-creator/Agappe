const SUPABASE_URL = "https://cjbhlgclwxlmqfzlulwq.supabase.co";

const SUPABASE_KEY = "sb_publishable_4u8FisN2-ND1lZBqexwihw_S7YZkboy";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const STORAGE_BUCKET = "equipment-pdfs";