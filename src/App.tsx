import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import AuthPage from "./components/AuthPage";
import LibraryPage from "./components/LibraryPage";
import ReaderPage from "./components/ReaderPage";
import Spinner from "./components/Spinner";

export default function App() {
  const { session, loading, signIn, signUp, signOut } = useAuth();
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  if (loading) return <Spinner />;
  if (!session) return <AuthPage onSignIn={signIn} onSignUp={signUp} />;

  if (openBookId) {
    return <ReaderPage userId={session.user.id} bookId={openBookId} onBack={() => setOpenBookId(null)} />;
  }
  return <LibraryPage userId={session.user.id} onOpen={setOpenBookId} onSignOut={signOut} />;
}
