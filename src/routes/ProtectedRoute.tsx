// Backwards-compatible path.
// Some builds or older imports may reference `src/routes/ProtectedRoute`.
// The app's canonical ProtectedRoute lives under `src/state/auth/ProtectedRoute`.

export { default } from "@/state/auth/ProtectedRoute";
