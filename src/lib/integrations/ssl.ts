import "server-only";
import tls from "node:tls";

export type SslResult = { expiresAt: Date | null; issuer: string | null; error: string | null };

/** Odczytuje datę wygaśnięcia certyfikatu TLS domeny (port 443). */
export function checkSsl(host: string, timeoutMs = 8000): Promise<SslResult> {
  return new Promise((resolve) => {
    if (!/^[a-z0-9.-]+$/i.test(host)) return resolve({ expiresAt: null, issuer: null, error: "Nieprawidłowa nazwa hosta" });
    const socket = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false, timeout: timeoutMs }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert || !cert.valid_to) return resolve({ expiresAt: null, issuer: null, error: "Brak certyfikatu" });
      const issuer = typeof cert.issuer?.O === "string" ? cert.issuer.O : typeof cert.issuer?.CN === "string" ? cert.issuer.CN : null;
      resolve({ expiresAt: new Date(cert.valid_to), issuer, error: socket.authorized ? null : (socket.authorizationError?.toString() ?? null) });
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ expiresAt: null, issuer: null, error: "Przekroczono czas połączenia" });
    });
    socket.on("error", (e) => resolve({ expiresAt: null, issuer: null, error: e.message.slice(0, 200) }));
  });
}
