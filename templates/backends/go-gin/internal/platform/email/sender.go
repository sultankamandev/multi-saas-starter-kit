package email

import (
	"fmt"
	"log"
	"net/smtp"

	"saas-starter/backend/go-api/internal/config"
)

type Sender interface {
	SendVerification(to, link, lang, userName string) error
	SendPasswordReset(to, link, lang string) error
	Send2FACode(to, code, lang, userName string) error
	SendHTML(to, subject, body string) error
	SendRoleChange(to, lang, userName, oldRole, newRole string) error
	SendAccountDeleted(to, lang, userName, userEmail string) error
}

type smtpSender struct {
	cfg       config.SMTPConfig
	templates *TemplateRenderer
}

func NewSMTPSender(cfg config.SMTPConfig, templates *TemplateRenderer) Sender {
	return &smtpSender{cfg: cfg, templates: templates}
}

func (s *smtpSender) send(to, subject, htmlBody string) error {
	if !s.cfg.IsConfigured() {
		log.Printf("[EMAIL-SIM] To: %s | Subject: %s", to, subject)
		return fmt.Errorf("SMTP configuration incomplete")
	}

	msg := "MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=\"UTF-8\"\r\n" +
		fmt.Sprintf("From: %s\r\n", s.cfg.From) +
		fmt.Sprintf("To: %s\r\n", to) +
		fmt.Sprintf("Subject: %s\r\n\r\n", subject) +
		htmlBody

	addr := s.cfg.Host + ":" + s.cfg.Port
	auth := smtp.PlainAuth("", s.cfg.User, s.cfg.Pass, s.cfg.Host)

	if err := smtp.SendMail(addr, auth, s.cfg.User, []string{to}, []byte(msg)); err != nil {
		log.Printf("SMTP error sending to %s: %v", to, err)
		return err
	}

	return nil
}

func (s *smtpSender) SendVerification(to, link, lang, userName string) error {
	subject, body, err := s.templates.RenderVerification(lang, userName, link)
	if err != nil {
		return err
	}
	return s.send(to, subject, body)
}

func (s *smtpSender) SendPasswordReset(to, link, lang string) error {
	subject, body, err := s.templates.RenderPasswordReset(lang, link)
	if err != nil {
		return err
	}
	return s.send(to, subject, body)
}

func (s *smtpSender) Send2FACode(to, code, lang, userName string) error {
	subject, body, err := s.templates.Render2FACode(lang, userName, code)
	if err != nil {
		return err
	}
	if err := s.send(to, subject, body); err != nil {
		log.Printf("2FA Code for %s: %s (valid for 5 minutes) - email delivery failed", to, code)
		return err
	}
	return nil
}

func (s *smtpSender) SendHTML(to, subject, body string) error {
	return s.send(to, subject, body)
}

func (s *smtpSender) SendRoleChange(to, lang, userName, oldRole, newRole string) error {
	subject, body, err := s.templates.RenderRoleChange(lang, userName, oldRole, newRole)
	if err != nil {
		return err
	}
	return s.send(to, subject, body)
}

func (s *smtpSender) SendAccountDeleted(to, lang, userName, userEmail string) error {
	subject, body, err := s.templates.RenderAccountDeleted(lang, userName, userEmail)
	if err != nil {
		return err
	}
	return s.send(to, subject, body)
}
