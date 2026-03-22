package utils

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
	"regexp"
	"strings"
)

// SendResetEmail sends a password reset email to the user
// Supports both Gmail SMTP and SendGrid
func SendResetEmail(to string, link string, lang string) error {
	// Try SendGrid first if API key is configured
	sendgridKey := os.Getenv("SENDGRID_API_KEY")
	if sendgridKey != "" {
		return sendViaSendGrid(to, link, lang)
	}

	// Otherwise use SMTP (Gmail or other SMTP server)
	return sendViaSMTP(to, link, lang)
}

// sendViaSMTP sends email using SMTP (Gmail, etc.)
func sendViaSMTP(to, link, lang string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")

	if host == "" || port == "" || user == "" || pass == "" {
		log.Println("⚠️  SMTP configuration missing. Email not sent.")
		log.Printf("📧 [SIMULATED] Reset link to %s: %s\n", to, link)
		return fmt.Errorf("SMTP configuration incomplete")
	}

	// Get localized email subject from locale system
	subject := T(lang, "EmailResetPasswordTitle")

	// Render email template with translations from locale system
	body, err := RenderEmailTemplate(lang, "reset_password", link)
	if err != nil {
		log.Printf("❌ Error rendering email template: %v", err)
		return err
	}

	// Build email message
	msg := "MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
		fmt.Sprintf("From: %s\r\n", user) +
		fmt.Sprintf("To: %s\r\n", to) +
		fmt.Sprintf("Subject: %s\r\n\r\n", subject) +
		body

	// Send email via SMTP
	addr := host + ":" + port
	auth := smtp.PlainAuth("", user, pass, host)

	if err := smtp.SendMail(addr, auth, user, []string{to}, []byte(msg)); err != nil {
		log.Printf("❌ SMTP error sending to %s: %v", to, err)
		return err
	}

	log.Printf("✅ Email sent successfully to %s (lang: %s)", to, lang)
	return nil
}

// sendViaSendGrid sends email using SendGrid API
func sendViaSendGrid(to, link, lang string) error {
	key := os.Getenv("SENDGRID_API_KEY")
	if key == "" {
		return fmt.Errorf("SendGrid API key not set")
	}

	// Get localized email subject from locale system
	subject := T(lang, "EmailResetPasswordTitle")

	// Render email template with translations from locale system
	body, err := RenderEmailTemplate(lang, "reset_password", link)
	if err != nil {
		log.Printf("❌ Error rendering email template: %v", err)
		return err
	}

	// For now, log the email (you can integrate sendgrid-go library later)
	log.Printf("📧 [SendGrid] To: %s | Lang: %s | Subject: %s", to, lang, subject)
	log.Printf("📧 [SendGrid] Reset link: %s", link)

	// TODO: Replace with actual SendGrid API call
	// Example with sendgrid-go:
	// message := mail.NewSingleEmail(...)
	// client := sendgrid.NewSendClient(key)
	// response, err := client.Send(message)

	log.Println("⚠️  SendGrid integration pending - install sendgrid-go package for full functionality")
	fmt.Printf("📧 [SendGrid Simulation] Email would be sent to %s with body length: %d\n", to, len(body))

	return nil
}

// SendVerificationEmail sends an email verification email to the user
// Supports both Gmail SMTP and SendGrid
func SendVerificationEmail(to string, link string, lang string, userName string) error {
	sendgridKey := os.Getenv("SENDGRID_API_KEY")

	subject := T(lang, "EmailVerificationTitle")
	htmlBody, err := RenderVerificationEmail(lang, userName, link)
	if err != nil {
		log.Printf("❌ Error rendering verification email template: %v", err)
		return err
	}

	if sendgridKey != "" {
		return sendViaSendGridVerification(to, subject, htmlBody, lang)
	}
	return sendViaSMTPVerification(to, subject, htmlBody)
}

// sendViaSMTPVerification sends verification email using SMTP
func sendViaSMTPVerification(to, subject, htmlBody string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SMTP_FROM")

	if from == "" {
		from = user
	}

	if host == "" || port == "" || user == "" || pass == "" {
		log.Println("⚠️  SMTP configuration missing. Email not sent.")
		log.Printf("📧 [SIMULATED] Verification link to %s: %s\n", to, subject)
		return fmt.Errorf("SMTP configuration incomplete")
	}

	msg := "MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
		fmt.Sprintf("From: %s\r\n", from) +
		fmt.Sprintf("To: %s\r\n", to) +
		fmt.Sprintf("Subject: %s\r\n\r\n", subject) +
		htmlBody

	addr := host + ":" + port
	auth := smtp.PlainAuth("", user, pass, host)

	if err := smtp.SendMail(addr, auth, user, []string{to}, []byte(msg)); err != nil {
		log.Printf("❌ SMTP error sending verification email to %s: %v", to, err)
		return err
	}

	log.Printf("✅ Verification email sent successfully to %s", to)
	return nil
}

// sendViaSendGridVerification sends verification email using SendGrid API
func sendViaSendGridVerification(to, subject, htmlBody, lang string) error {
	key := os.Getenv("SENDGRID_API_KEY")
	if key == "" {
		return fmt.Errorf("SendGrid API key not set")
	}

	log.Printf("📧 [SendGrid] To: %s | Lang: %s | Subject: %s", to, lang, subject)
	log.Printf("📧 [SendGrid] Verification link: %s", htmlBody[:100])
	log.Println("⚠️  SendGrid integration pending - install sendgrid-go package for full functionality")
	fmt.Printf("📧 [SendGrid Simulation] Verification email would be sent to %s with body length: %d\n", to, len(htmlBody))

	return nil
}

// Send2FACodeEmail sends a 2FA verification code email to the user
// Supports both Gmail SMTP and SendGrid
func Send2FACodeEmail(to string, code string, lang string, userName string) error {
	sendgridKey := os.Getenv("SENDGRID_API_KEY")

	subject := T(lang, "Email2FATitle")
	htmlBody, err := Render2FACodeEmail(lang, userName, code)
	if err != nil {
		log.Printf("❌ Error rendering 2FA code email template: %v", err)
		return err
	}

	if sendgridKey != "" {
		return sendViaSendGrid2FA(to, subject, htmlBody, lang)
	}
	return sendViaSMTP2FA(to, subject, htmlBody, code)
}

// sendViaSMTP2FA sends 2FA code email using SMTP
func sendViaSMTP2FA(to, subject, htmlBody, code string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SMTP_FROM")

	if from == "" {
		from = user
	}

	if host == "" || port == "" || user == "" || pass == "" {
		// Use the code parameter directly (fallback to extraction if not provided)
		logCode := code
		if logCode == "" && len(htmlBody) > 0 {
			// Extract 2FA code from HTML body for logging if not provided
			re := regexp.MustCompile(`(\d{6})`)
			matches := re.FindStringSubmatch(htmlBody)
			if len(matches) > 1 {
				logCode = matches[1]
			}
		}
		if logCode == "" {
			logCode = "UNKNOWN"
		}

		separator := strings.Repeat("=", 60)
		log.Println(separator)
		log.Printf("❌ SMTP CONFIGURATION MISSING - 2FA Email Not Sent")
		log.Println(separator)
		log.Printf("📧 Recipient: %s", to)
		log.Printf("🔐 2FA Code: %s (valid for 5 minutes)", logCode)
		log.Printf("⚠️  Email was NOT sent because SMTP is not configured")
		log.Println("")
		log.Println("To enable email sending, configure these environment variables:")
		log.Println("   - SMTP_HOST (e.g., smtp.gmail.com)")
		log.Println("   - SMTP_PORT (e.g., 587)")
		log.Println("   - SMTP_USER (your email address)")
		log.Println("   - SMTP_PASS (your email password or app password)")
		log.Println("   - SMTP_FROM (optional, defaults to SMTP_USER)")
		log.Println("")
		log.Println("For Gmail:")
		log.Println("   1. Enable 2-Step Verification")
		log.Println("   2. Generate an App Password")
		log.Println("   3. Use the App Password as SMTP_PASS")
		log.Println(separator)
		return fmt.Errorf("SMTP configuration incomplete: missing SMTP_HOST, SMTP_PORT, SMTP_USER, or SMTP_PASS")
	}

	msg := "MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
		fmt.Sprintf("From: %s\r\n", from) +
		fmt.Sprintf("To: %s\r\n", to) +
		fmt.Sprintf("Subject: %s\r\n\r\n", subject) +
		htmlBody

	addr := host + ":" + port
	auth := smtp.PlainAuth("", user, pass, host)

	if err := smtp.SendMail(addr, auth, user, []string{to}, []byte(msg)); err != nil {
		// Use the code parameter directly (fallback to extraction if not provided)
		logCode := code
		if logCode == "" && len(htmlBody) > 0 {
			re := regexp.MustCompile(`(\d{6})`)
			matches := re.FindStringSubmatch(htmlBody)
			if len(matches) > 1 {
				logCode = matches[1]
			}
		}
		if logCode == "" {
			logCode = "UNKNOWN"
		}

		log.Printf("❌ SMTP error sending 2FA code email to %s: %v", to, err)
		log.Printf("🔐 2FA Code for %s: %s (valid for 5 minutes) - Use this code to login", to, logCode)
		log.Printf("⚠️  Check SMTP settings: HOST=%s, PORT=%s, USER=%s", host, port, user)
		return err
	}

	log.Printf("✅ 2FA code email sent successfully to %s", to)
	return nil
}

// sendViaSendGrid2FA sends 2FA code email using SendGrid API
func sendViaSendGrid2FA(to, subject, htmlBody, lang string) error {
	key := os.Getenv("SENDGRID_API_KEY")
	if key == "" {
		return fmt.Errorf("SendGrid API key not set")
	}

	log.Printf("📧 [SendGrid] To: %s | Lang: %s | Subject: %s", to, lang, subject)
	log.Printf("📧 [SendGrid] 2FA code email body length: %d", len(htmlBody))
	log.Println("⚠️  SendGrid integration pending - install sendgrid-go package for full functionality")
	fmt.Printf("📧 [SendGrid Simulation] 2FA code email would be sent to %s with body length: %d\n", to, len(htmlBody))

	return nil
}

// SendEmail sends a plain text email using SMTP (for notifications, etc.)
// This is a generic email function for non-template emails
func SendEmail(to, subject, body string) error {
	return SendHTMLEmail(to, subject, body, false)
}

// SendHTMLEmail sends an HTML email using SMTP
// Set isHTML to true for HTML content, false for plain text
func SendHTMLEmail(to, subject, body string, isHTML bool) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SMTP_FROM")

	// If SMTP_FROM is not set, use SMTP_USER
	if from == "" {
		from = user
	}

	// Check if SMTP is configured
	if host == "" || port == "" || user == "" || pass == "" {
		log.Printf("⚠️  SMTP configuration missing. Email not sent to %s", to)
		log.Printf("📧 [SIMULATED] Subject: %s\n", subject)
		return fmt.Errorf("SMTP configuration incomplete")
	}

	// Determine content type
	contentType := "text/plain; charset=\"UTF-8\""
	if isHTML {
		contentType = "text/html; charset=\"UTF-8\""
	}

	// Build email message
	msg := "MIME-Version: 1.0\r\n" +
		"Content-Type: " + contentType + "\r\n" +
		fmt.Sprintf("From: %s\r\n", from) +
		fmt.Sprintf("To: %s\r\n", to) +
		fmt.Sprintf("Subject: %s\r\n\r\n", subject) +
		body + "\r\n"

	// Send email via SMTP
	addr := host + ":" + port
	auth := smtp.PlainAuth("", user, pass, host)

	if err := smtp.SendMail(addr, auth, user, []string{to}, []byte(msg)); err != nil {
		log.Printf("❌ SMTP error sending notification to %s: %v", to, err)
		return err
	}

	log.Printf("✅ Notification email sent successfully to %s", to)
	return nil
}
