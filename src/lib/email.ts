import nodemailer from 'nodemailer'

interface SMTPSettings {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromEmail: string
  fromName: string
}

// Pobierz ustawienia SMTP ze zmiennych środowiskowych
export async function getSMTPSettings(): Promise<SMTPSettings | null> {
  try {
    const host = process.env.SMTP_HOST
    const port = process.env.SMTP_PORT
    const secure = process.env.SMTP_SECURE
    const user = process.env.SMTP_USER
    const password = process.env.SMTP_PASSWORD
    const fromEmail = process.env.SMTP_FROM_EMAIL
    const fromName = process.env.SMTP_FROM_NAME

    // Sprawdź czy wszystkie wymagane ustawienia są dostępne
    if (!host || !port || !user || !password || !fromEmail) {
      console.warn('SMTP settings not configured in environment variables')
      return null
    }

    return {
      host,
      port: parseInt(port),
      secure: secure === 'true',
      user,
      password,
      fromEmail,
      fromName: fromName || 'Nexus'
    }
  } catch (error) {
    console.error('Error reading SMTP settings from environment:', error)
    return null
  }
}

// Utwórz transporter nodemailer
export async function createTransporter() {
  const smtpSettings = await getSMTPSettings()

  if (!smtpSettings) {
    throw new Error('SMTP settings not configured')
  }

  return nodemailer.createTransport({
    host: smtpSettings.host,
    port: smtpSettings.port,
    secure: smtpSettings.secure,
    auth: {
      user: smtpSettings.user,
      pass: smtpSettings.password,
    },
  })
}

// Wyślij mail powitalny po rejestracji
export async function sendWelcomeEmail(userEmail: string, userName: string) {
  try {
    const transporter = await createTransporter()
    const smtpSettings = await getSMTPSettings()

    if (!smtpSettings) {
      throw new Error('SMTP settings not configured')
    }

    const mailOptions = {
      from: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>`,
      to: userEmail,
      subject: 'Witamy w Nexus! 🚀 Twoja podróż z zarządzaniem projektami zaczyna się teraz',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 40px; padding: 30px; background: rgba(255, 255, 255, 0.95); border-radius: 12px; backdrop-filter: blur(10px);">
            <div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3B82F6, #6366F1); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 20px; font-weight: bold;">⚡</span>
              </div>
              <h1 style="color: #1F2937; margin: 0; font-size: 28px; font-weight: 700;">Nexus</h1>
            </div>
            <p style="color: #6B7280; margin: 0; font-size: 16px;">Nowoczesne zarządzanie projektami dla nowoczesnych zespołów</p>
          </div>

          <!-- Welcome Message -->
          <div style="background: rgba(255, 255, 255, 0.95); padding: 30px; border-radius: 12px; margin-bottom: 30px; backdrop-filter: blur(10px);">
            <h2 style="color: #1F2937; margin-top: 0; font-size: 24px; font-weight: 600;">Witaj ${userName}! 🎉</h2>
            <p style="color: #4B5563; line-height: 1.7; font-size: 16px; margin-bottom: 20px;">
              Dziękujemy za dołączenie do <strong>Nexus</strong> - platformy, która już pomogła <strong>10,000+</strong> użytkownikom
              ukończyć ponad <strong>50,000 projektów</strong> z <strong>98% zadowoleniem</strong>!
            </p>
            <p style="color: #4B5563; line-height: 1.7; font-size: 16px;">
              Twoje konto zostało pomyślnie utworzone i możesz już zacząć korzystać z wszystkich potężnych funkcji naszej platformy.
            </p>
          </div>

          <!-- Key Features -->
          <div style="background: rgba(255, 255, 255, 0.95); padding: 30px; border-radius: 12px; margin-bottom: 30px; backdrop-filter: blur(10px);">
            <h3 style="color: #1F2937; margin-top: 0; font-size: 20px; font-weight: 600; margin-bottom: 20px;">🚀 Główne funkcje Nexus:</h3>

            <div style="display: grid; gap: 16px;">
              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #3B82F6, #6366F1); border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="color: white; font-size: 16px;">✅</span>
                </div>
                <div>
                  <h4 style="color: #1F2937; margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">Zarządzanie zadaniami</h4>
                  <p style="color: #6B7280; margin: 0; font-size: 14px; line-height: 1.5;">Potężne tablice kanban, niestandardowe przepływy pracy i automatyzacja procesów</p>
                </div>
              </div>

              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #8B5CF6, #A855F7); border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="color: white; font-size: 16px;">👥</span>
                </div>
                <div>
                  <h4 style="color: #1F2937; margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">Współpraca zespołowa</h4>
                  <p style="color: #6B7280; margin: 0; font-size: 14px; line-height: 1.5;">Współpraca w czasie rzeczywistym z komentarzami, dyskusjami i wbudowanym chatem</p>
                </div>
              </div>

              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #10B981, #059669); border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="color: white; font-size: 16px;">⏱️</span>
                </div>
                <div>
                  <h4 style="color: #1F2937; margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">Śledzenie czasu</h4>
                  <p style="color: #6B7280; margin: 0; font-size: 14px; line-height: 1.5;">Dokładne raporty czasowe i analiza produktywności zespołu</p>
                </div>
              </div>

              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #F59E0B, #D97706); border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="color: white; font-size: 16px;">📅</span>
                </div>
                <div>
                  <h4 style="color: #1F2937; margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">Widok kalendarza</h4>
                  <p style="color: #6B7280; margin: 0; font-size: 14px; line-height: 1.5;">Wizualizacja terminów i planowanie projektów</p>
                </div>
              </div>

              <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #6366F1, #4F46E5); border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="color: white; font-size: 16px;">�</span>
                </div>
                <div>
                  <h4 style="color: #1F2937; margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">Analityka i raporty</h4>
                  <p style="color: #6B7280; margin: 0; font-size: 14px; line-height: 1.5;">Szczegółowe raporty wydajności i postępów projektów</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Why Choose Nexus -->
          <div style="background: rgba(255, 255, 255, 0.95); padding: 30px; border-radius: 12px; margin-bottom: 30px; backdrop-filter: blur(10px);">
            <h3 style="color: #1F2937; margin-top: 0; font-size: 20px; font-weight: 600; margin-bottom: 20px;">💡 Dlaczego Nexus?</h3>

            <div style="display: grid; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: #10B981; font-size: 18px;">✨</span>
                <span style="color: #4B5563; font-size: 15px;"><strong>Intuicyjny w użyciu</strong> - Nowoczesny interfejs, który nie wymaga szkolenia</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: #3B82F6; font-size: 18px;">�</span>
                <span style="color: #4B5563; font-size: 15px;"><strong>Skalowalny</strong> - Rozwija się razem z Twoim zespołem od 2 do 2000+ członków</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: #8B5CF6; font-size: 18px;">🔒</span>
                <span style="color: #4B5563; font-size: 15px;"><strong>Bezpieczny</strong> - Zabezpieczenia na poziomie enterprise z szyfrowaniem danych</span>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: #F59E0B; font-size: 18px;">💰</span>
                <span style="color: #4B5563; font-size: 15px;"><strong>Przystępny cenowo</strong> - Konkurencyjne ceny bez ukrytych kosztów</span>
              </div>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${process.env.NEXTAUTH_URL}/auth/signin"
               style="background: linear-gradient(135deg, #3B82F6, #6366F1); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: all 0.3s ease;">
              🚀 Zaloguj się do Nexus
            </a>
          </div>

          <!-- Stats -->
          <div style="background: rgba(255, 255, 255, 0.95); padding: 25px; border-radius: 12px; margin-bottom: 30px; backdrop-filter: blur(10px);">
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center;">
              <div>
                <div style="color: #3B82F6; font-size: 24px; font-weight: 700; margin-bottom: 4px;">10,000+</div>
                <div style="color: #6B7280; font-size: 12px;">Aktywni użytkownicy</div>
              </div>
              <div>
                <div style="color: #10B981; font-size: 24px; font-weight: 700; margin-bottom: 4px;">50,000+</div>
                <div style="color: #6B7280; font-size: 12px;">Ukończone projekty</div>
              </div>
              <div>
                <div style="color: #8B5CF6; font-size: 24px; font-weight: 700; margin-bottom: 4px;">98%</div>
                <div style="color: #6B7280; font-size: 12px;">Zadowolenie</div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: rgba(255, 255, 255, 0.95); padding: 20px; border-radius: 12px; text-align: center; backdrop-filter: blur(10px);">
            <p style="color: #6B7280; font-size: 14px; margin: 0 0 10px 0;">
              Masz pytania? Odpowiedz na tego maila - chętnie pomożemy! 💬
            </p>
            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Nexus. Wszystkie prawa zastrzeżone.
            </p>
          </div>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)
    console.log(`Welcome email sent to ${userEmail}`)
  } catch (error) {
    console.error('Error sending welcome email:', error)
    throw error
  }
}

// Wyślij mail z linkiem do resetowania hasła
export async function sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string) {
  try {
    const transporter = await createTransporter()
    const smtpSettings = await getSMTPSettings()

    if (!smtpSettings) {
      throw new Error('SMTP settings not configured')
    }

    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

    const mailOptions = {
      from: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>`,
      to: userEmail,
      subject: 'Resetowanie hasła - TeamFlow 🔐',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3B82F6; margin: 0;">TeamFlow</h1>
            <p style="color: #6B7280; margin: 5px 0;">Zarządzanie projektami zespołowymi</p>
          </div>

          <div style="background: #FEF3C7; border: 1px solid #F59E0B; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #92400E; margin-top: 0;">Resetowanie hasła 🔐</h2>
            <p style="color: #92400E; line-height: 1.6; margin: 0;">
              Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w TeamFlow.
            </p>
          </div>

          <div style="margin-bottom: 30px;">
            <p style="color: #4B5563; line-height: 1.6;">
              Cześć ${userName},<br><br>
              Aby zresetować hasło, kliknij w poniższy przycisk. Link będzie aktywny przez 1 godzinę.
            </p>
          </div>

          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${resetUrl}"
               style="background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Zresetuj hasło
            </a>
          </div>

          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.6;">
              <strong>Uwaga:</strong> Jeśli nie prosiłeś o reset hasła, zignoruj tego maila.
              Twoje hasło pozostanie bez zmian. Link resetujący wygaśnie automatycznie po godzinie.
            </p>
          </div>

          <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; text-align: center;">
            <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
              Jeśli przycisk nie działa, skopiuj i wklej ten link do przeglądarki:
            </p>
            <p style="color: #3B82F6; font-size: 12px; word-break: break-all; margin: 10px 0;">
              ${resetUrl}
            </p>
            <p style="color: #9CA3AF; font-size: 14px; margin: 10px 0 0 0;">
              © ${new Date().getFullYear()} TeamFlow. Wszystkie prawa zastrzeżone.
            </p>
          </div>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)
    console.log(`Password reset email sent to ${userEmail}`)
  } catch (error) {
    console.error('Error sending password reset email:', error)
    throw error
  }
}

// Testuj połączenie SMTP
export async function testSMTPConnection(): Promise<boolean> {
  try {
    const transporter = await createTransporter()
    await transporter.verify()
    return true
  } catch (error) {
    console.error('SMTP connection test failed:', error)
    return false
  }
}
