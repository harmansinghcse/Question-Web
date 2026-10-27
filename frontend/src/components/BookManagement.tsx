import { useMemo, useState } from "react";
import { useApiList, type BookOption } from "../hooks/useApiList";
import { fetchApi } from "../services/api";

export default function BookManagement() {
    const { data: books, loading, error, retry } = useApiList<BookOption>("/api/books");

    const [modalOpen, setModalOpen] = useState(false);
    const [bookName, setBookName] = useState("");
    const [authorName, setAuthorName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [notice, setNotice] = useState<{
        kind: "success" | "error";
        message: string;
    } | null>(null);

    const handleCreateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = bookName.trim();
        const trimmedAuthor = authorName.trim();

        if (!trimmedName || !trimmedAuthor) {
            setNotice({
                kind: "error",
                message: "Please enter both the book title and author name.",
            });
            return;
        }

        setSubmitting(true);
        setNotice(null);

        try {
            const created = await fetchApi<BookOption>("/api/books", {
                method: "POST",
                body: JSON.stringify({
                    bookName: trimmedName,
                    authorName: trimmedAuthor,
                }),
            });

            setNotice({
                kind: "success",
                message: `Book "${created.bookName}" registered successfully! Assigned Source ID: #${created.sourceId}.`,
            });
            setBookName("");
            setAuthorName("");
            setModalOpen(false);
            retry();
        } catch (err) {
            setNotice({
                kind: "error",
                message: err instanceof Error ? err.message : "Failed to register book.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredBooks = useMemo(() => {
        if (!searchQuery.trim()) return books;
        const q = searchQuery.toLowerCase();
        return books.filter(
            (b) =>
                String(b.sourceId).includes(q) ||
                b.bookName.toLowerCase().includes(q) ||
                b.authorName.toLowerCase().includes(q),
        );
    }, [books, searchQuery]);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-semibold text-neutral-100">
                        Book Management
                    </h3>
                    <p className="text-neutral-400 mt-1">
                        Register reference books and textbooks (`Book` linked to `Source`) for question attribution.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setNotice(null);
                        setModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 12h8" />
                        <path d="M12 8v8" />
                    </svg>
                    Register New Book
                </button>
            </div>

            {/* Notification Banner */}
            {notice && (
                <div
                    role="alert"
                    className={`flex items-center justify-between gap-3 px-5 py-4 rounded-xl border ${
                        notice.kind === "success"
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                            : "bg-red-950/20 border-red-500/30 text-red-400"
                    }`}
                >
                    <span>{notice.message}</span>
                    <button
                        onClick={() => setNotice(null)}
                        className="text-xs hover:text-white transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Stats & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/80" />
                    <p className="text-sm font-medium text-neutral-400 mb-1">Registered Books</p>
                    <p className="text-3xl font-semibold text-neutral-100">{books.length}</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 sm:col-span-2 flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search by book title, author, or source ID…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm rounded-lg px-3.5 py-2.5 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300 text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <button
                            onClick={retry}
                            title="Refresh books"
                            className="p-2.5 text-neutral-400 hover:text-neutral-100 bg-neutral-800 border border-neutral-700 rounded-lg transition-colors"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                <path d="M16 21h5v-5" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Books Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                {loading && (
                    <div className="p-12 text-center text-neutral-400 space-y-3">
                        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm">Loading registered books…</p>
                    </div>
                )}

                {error && (
                    <div className="p-8 text-center space-y-3">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button
                            onClick={retry}
                            className="px-3 py-1.5 bg-neutral-800 text-xs font-medium text-neutral-200 rounded-md border border-neutral-700 hover:bg-neutral-700 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && filteredBooks.length === 0 && (
                    <div className="p-12 text-center space-y-2">
                        <p className="text-neutral-300 font-medium">No books found</p>
                        <p className="text-neutral-500 text-xs max-w-sm mx-auto">
                            {searchQuery
                                ? "No books matched your search query."
                                : "No books have been registered yet. Click 'Register New Book' above to add textbooks for question reference."}
                        </p>
                    </div>
                )}

                {!loading && !error && filteredBooks.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-950/60 text-neutral-400 border-b border-neutral-800 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5 font-medium">Source ID</th>
                                    <th className="px-6 py-3.5 font-medium">Book Title</th>
                                    <th className="px-6 py-3.5 font-medium">Author(s)</th>
                                    <th className="px-6 py-3.5 font-medium text-right">Questions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800 text-neutral-200">
                                {filteredBooks.map((b) => (
                                    <tr
                                        key={b.sourceId}
                                        className="hover:bg-neutral-800/40 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-mono font-medium text-neutral-300">
                                            #{b.sourceId}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-neutral-100">
                                            {b.bookName}
                                        </td>
                                        <td className="px-6 py-4 text-neutral-300">
                                            {b.authorName}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-neutral-400">
                                            {b.questionCount ?? 0}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Register Book */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-book-title"
                >
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                            <h4 id="modal-book-title" className="text-lg font-semibold text-neutral-100">
                                Register New Book
                            </h4>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-neutral-400 hover:text-neutral-200 p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateBook} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                    Book Title (`BookName`) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Introduction to Algorithms"
                                    value={bookName}
                                    onChange={(e) => setBookName(e.target.value)}
                                    maxLength={200}
                                    required
                                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                                    Author Name (`AuthorName`) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Cormen, Leiserson, Rivest, Stein"
                                    value={authorName}
                                    onChange={(e) => setAuthorName(e.target.value)}
                                    maxLength={200}
                                    required
                                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-100 text-sm rounded-lg px-3.5 py-2.5 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                />
                            </div>

                            <p className="text-xs text-neutral-500 pt-1">
                                An associated `Source` record of type `BOOK` and the `Book` record will be created safely in a single transaction. No ISBN is required.
                            </p>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 text-sm text-neutral-300 hover:text-white bg-neutral-800 border border-neutral-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !bookName.trim() || !authorName.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {submitting && (
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    )}
                                    Register Book
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
