// Gives React Native a `localStorage` global (backed by SQLite) for Supabase to
// persist the session in. Web already has one; see install-local-storage.web.ts.
import 'expo-sqlite/localStorage/install';
