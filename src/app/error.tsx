"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="card empty">
      <strong>Something went wrong</strong>
      <p className="muted">{error.message}</p>
      <button className="btn primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
