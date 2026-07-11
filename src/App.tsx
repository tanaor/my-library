import { useState } from "react";
import LibraryPage from "./components/LibraryPage";
import ReaderPage from "./components/ReaderPage";

export default function App() {
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  if (openBookId) {
    return <ReaderPage bookId={openBookId} onBack={() => setOpenBookId(null)} />;
  }
  return <LibraryPage onOpen={setOpenBookId} />;
}
