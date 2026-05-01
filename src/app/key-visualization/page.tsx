import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { KeyVisualizationClient } from "./KeyVisualizationClient";

function LoadingFallback() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Loader2
        size={32}
        className="animate-spin"
        style={{ color: "var(--app-text-muted)" }}
      />
    </main>
  );
}

export default function KeyVisualizationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <KeyVisualizationClient />
    </Suspense>
  );
}