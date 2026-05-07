interface LoadingSpinnerProps {
  label?: string;
}

export default function LoadingSpinner({ label }: LoadingSpinnerProps) {
  return (
    <div
      className={
        label
          ? "flex items-center justify-center bg-transparent p-8"
          : "app-screen-center"
      }
    >
      <div className="app-spinner" aria-label={label || "Loading"} />
    </div>
  );
}
