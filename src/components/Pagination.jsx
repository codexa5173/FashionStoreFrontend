export default function Pagination({ page, pages, total, onChange }) {
  if (!pages || pages <= 1) {
    return total ? (
      <div className="mt-5 text-center text-sm text-slate-400">
        {total} {total === 1 ? "item" : "items"}
      </div>
    ) : null;
  }

  const start = Math.max(1, page - 2);
  const end = Math.min(pages, start + 4);
  const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="btn-soft disabled:opacity-40"
      >
        Previous
      </button>
      {numbers.map(n => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          className={`grid h-10 min-w-10 place-items-center rounded-xl px-3 text-sm font-bold ${
            n === page ? "bg-slate-950 text-white" : "bg-slate-100"
          }`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="btn-soft disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
