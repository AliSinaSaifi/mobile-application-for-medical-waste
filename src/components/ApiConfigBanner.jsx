import { isApiConfigured } from "../config/api";

/** Shown when the production bundle was built without VITE_API_URL (common cause of “working on Vercel, blank in APK”). */
export default function ApiConfigBanner() {
  if (isApiConfigured) return null;
  return (
    <div
      style={{
        padding: "12px 16px",
        background: "#fef3c7",
        color: "#92400e",
        fontSize: 14,
        lineHeight: 1.4,
        borderBottom: "1px solid #fcd34d",
      }}
    >
      <strong>API URL missing.</strong> This app was built without{" "}
      <code style={{ background: "#fde68a", padding: "0 4px" }}>VITE_API_URL</code>. Rebuild the web
      app with your Railway HTTPS API, then run{" "}
      <code style={{ background: "#fde68a", padding: "0 4px" }}>npx cap sync android</code>.
    </div>
  );
}
