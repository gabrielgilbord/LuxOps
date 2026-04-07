import * as React from "react";

type EmailLayoutProps = {
  /** URL absoluta del logo (ej. https://luxops.es/icon.svg) */
  logoUrl: string;
  title?: string;
  children?: React.ReactNode;
};

export function EmailLayout({ logoUrl, title, children }: EmailLayoutProps) {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#0B0E14" }}>
        <div
          style={{
            fontFamily: "Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif",
            background: "#0B0E14",
            padding: "32px 16px",
          }}
        >
          <div
            style={{
              maxWidth: 560,
              margin: "0 auto",
              background: "#161B22",
              border: "1px solid rgba(251,191,36,0.22)",
              borderRadius: 16,
              padding: "28px 24px",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <img
                src={logoUrl}
                width={72}
                height={72}
                alt="LuxOps"
                style={{
                  display: "block",
                  margin: "0 auto",
                  backgroundColor: "#0B0E14",
                  borderRadius: 18,
                }}
              />
            </div>
            {title ? (
              <h1
                style={{
                  margin: "0 0 14px 0",
                  fontSize: 18,
                  lineHeight: 1.25,
                  color: "#F1F5F9",
                  textAlign: "center",
                  letterSpacing: "-0.01em",
                }}
              >
                {title}
              </h1>
            ) : null}

            <div>{children}</div>

            <hr
              style={{
                border: "none",
                borderTop: "1px solid rgba(255,255,255,0.10)",
                margin: "22px 0 14px 0",
              }}
            />
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#94A3B8",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              LuxOps - Hecho en Canarias. Has recibido este correo porque eres cliente de LuxOps.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

