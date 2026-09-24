/* Areté — alamat Supabase.
   Anon key aman berada di sini: yang mengunci data adalah Row Level Security
   di Postgres, bukan kerahasiaan kunci ini. Service role key tidak pernah
   boleh masuk berkas ini atau berkas lain di sisi klien.

   Nilai di bawah tidak menimpa window.ARETE_SUPABASE yang sudah ada, supaya
   alamat lain bisa dipasang lebih dulu saat pengujian. */
window.ARETE_SUPABASE = window.ARETE_SUPABASE || {
  url: 'https://zptfldqkookqimdeabww.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdGZsZHFrb29rcWltZGVhYnd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1OTQ1MDcsImV4cCI6MjEwNDE3MDUwN30.UkCFvegEz-V1URvbnsBP0mc7Qcu8qcEBS-9_LnSWXfg'
};
