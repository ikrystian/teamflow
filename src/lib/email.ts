import nodemailer from 'nodemailer'
import { prisma } from './prisma'

interface SMTPSettings {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromEmail: string
  fromName: string
}

// Pobierz ustawienia SMTP z bazy danych
export async function getSMTPSettings(): Promise<SMTPSettings | null> {
  try {
    const settings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_password', 'smtp_from_email', 'smtp_from_name']
        }
      }
    })

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string | null>)

    // Sprawdź czy wszystkie wymagane ustawienia są dostępne
    if (!settingsMap.smtp_host || !settingsMap.smtp_port || !settingsMap.smtp_user ||
        !settingsMap.smtp_password || !settingsMap.smtp_from_email) {
      return null
    }

    return {
      host: settingsMap.smtp_host,
      port: parseInt(settingsMap.smtp_port),
      secure: settingsMap.smtp_secure === 'true',
      user: settingsMap.smtp_user,
      password: settingsMap.smtp_password,
      fromEmail: settingsMap.smtp_from_email,
      fromName: settingsMap.smtp_from_name || 'TeamFlow'
    }
  } catch (error) {
    console.error('Error fetching SMTP settings:', error)
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
      subject: 'Witamy w TeamFlow! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3B82F6; margin: 0;">TeamFlow</h1>
            <p style="color: #6B7280; margin: 5px 0;">Zarządzanie projektami zespołowymi</p>
          </div>

          <div style="background: #F9FAFB; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #1F2937; margin-top: 0;">Witaj ${userName}! 👋</h2>
            <p style="color: #4B5563; line-height: 1.6;">
              Dziękujemy za rejestrację w TeamFlow! Twoje konto zostało pomyślnie utworzone
              i możesz już zacząć korzystać z naszej platformy do zarządzania projektami.
            </p>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #1F2937;">Co możesz teraz zrobić:</h3>
            <ul style="color: #4B5563; line-height: 1.8;">
              <li>📋 Tworzyć i zarządzać zadaniami</li>
              <li>👥 Współpracować z zespołem</li>
              <li>📊 Śledzić postępy projektów</li>
              <li>💬 Komunikować się przez wbudowany chat</li>
              <li>📈 Analizować raporty i statystyki</li>
            </ul>
          </div>

          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${process.env.NEXTAUTH_URL}/auth/signin"
               style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Zaloguj się do TeamFlow
            </a>
          </div>

          <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; text-align: center;">
            <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
              Jeśli masz pytania, skontaktuj się z nami odpowiadając na tego maila.
            </p>
            <p style="color: #9CA3AF; font-size: 14px; margin: 10px 0 0 0;">
              © ${new Date().getFullYear()} TeamFlow. Wszystkie prawa zastrzeżone.
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
