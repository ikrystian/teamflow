/**
 * Szablony e-maili transakcyjnych (React Email). Treść e-maili nigdy nie zawiera sekretów
 * (rozdział 4.8) — tylko informacje o zdarzeniu i link do aplikacji.
 */
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

const styles = {
  body: { backgroundColor: "#f4f4f5", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: "24px 0" },
  container: { backgroundColor: "#ffffff", borderRadius: 8, margin: "0 auto", maxWidth: 520, padding: "32px" },
  brand: { color: "#18181b", fontSize: 14, fontWeight: 700, letterSpacing: 0.5, margin: "0 0 24px" },
  heading: { color: "#18181b", fontSize: 22, margin: "0 0 16px" },
  text: { color: "#3f3f46", fontSize: 15, lineHeight: "24px", margin: "0 0 12px" },
  button: { backgroundColor: "#18181b", borderRadius: 6, color: "#ffffff", display: "inline-block", fontSize: 15, padding: "12px 20px", textDecoration: "none" },
  footer: { color: "#71717a", fontSize: 12, lineHeight: "18px", margin: 0 },
  detail: { backgroundColor: "#f4f4f5", borderRadius: 6, color: "#3f3f46", fontSize: 13, lineHeight: "20px", margin: "12px 0", padding: "12px 16px" },
};

type LayoutProps = { preview: string; title: string; children: ReactNode; action?: { href: string; label: string } };

export function EmailLayout({ preview, title, children, action }: LayoutProps) {
  return (
    <Html lang="pl">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>NEXUS</Text>
          <Heading style={styles.heading}>{title}</Heading>
          {children}
          {action ? (
            <Section style={{ margin: "24px 0" }}>
              <Button href={action.href} style={styles.button}>
                {action.label}
              </Button>
            </Section>
          ) : null}
          <Hr style={{ borderColor: "#e4e4e7", margin: "24px 0 16px" }} />
          <Text style={styles.footer}>
            Ta wiadomość nie zawiera haseł ani innych sekretów. Nexus nigdy nie prosi o hasło główne sejfu — nie podawaj go nikomu.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function SimpleEmail(props: { preview: string; title: string; paragraphs: string[]; details?: string[]; action?: { href: string; label: string } }) {
  return (
    <EmailLayout preview={props.preview} title={props.title} action={props.action}>
      {props.paragraphs.map((p, i) => (
        <Text key={i} style={styles.text}>
          {p}
        </Text>
      ))}
      {props.details?.length ? (
        <Section style={styles.detail}>
          {props.details.map((d, i) => (
            <Text key={i} style={{ ...styles.text, fontSize: 13, margin: 0 }}>
              {d}
            </Text>
          ))}
        </Section>
      ) : null}
    </EmailLayout>
  );
}
