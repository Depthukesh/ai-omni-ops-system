export type WebRuntimeMode = "standard" | "local-single-user";

export function getRuntimeMode(): WebRuntimeMode {
  const value = String(process.env.NEXT_PUBLIC_APP_RUNTIME_MODE || "").trim().toLowerCase();
  return value === "local-single-user" ? "local-single-user" : "standard";
}
