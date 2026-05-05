interface LoadingSpinnerProps {
  label?: string;
}

export default function LoadingSpinner({ label }: LoadingSpinnerProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: label ? "auto" : "100vh",
        padding: label ? "2rem" : 0,
        backgroundColor: label ? "transparent" : "var(--color-bg)",
      }}
    >
      <div
        className="spinner"
        aria-label={label || "Loading"}
        style={{
          width: "30px",
          height: "30px",
          border: "2px solid var(--color-border)",
          borderTopColor: "var(--color-primary)",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
