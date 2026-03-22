package email

import (
	"bytes"
	"fmt"
	"html/template"
	"path/filepath"
	"strings"

	"saas-starter/backend/go-api/pkg/i18n"
)

type TemplateRenderer struct {
	templatesDir string
}

func NewTemplateRenderer(templatesDir string) *TemplateRenderer {
	return &TemplateRenderer{templatesDir: templatesDir}
}

func (r *TemplateRenderer) render(templateName string, data interface{}) (string, error) {
	path := filepath.Join(r.templatesDir, "emails", templateName+".html")
	tmpl, err := template.ParseFiles(path)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func normalizeLang(lang string) string {
	lang = strings.ToLower(lang)
	switch lang {
	case "tr", "en", "de", "fr":
		return lang
	default:
		return "en"
	}
}

func (r *TemplateRenderer) RenderPasswordReset(lang, link string) (subject string, body string, err error) {
	lang = normalizeLang(lang)
	subject = i18n.T(lang, "EmailResetPasswordTitle")

	data := struct {
		Link, Title, Hi, Message, ButtonText, IgnoreMessage, ExpiryMessage, Footer string
	}{
		Link:          link,
		Title:         i18n.T(lang, "EmailResetPasswordTitle"),
		Hi:            i18n.T(lang, "EmailResetPasswordHi"),
		Message:       i18n.T(lang, "EmailResetPasswordMessage"),
		ButtonText:    i18n.T(lang, "EmailResetPasswordButton"),
		IgnoreMessage: i18n.T(lang, "EmailResetPasswordIgnore"),
		ExpiryMessage: i18n.T(lang, "EmailResetPasswordExpiry"),
		Footer:        i18n.T(lang, "EmailResetPasswordFooter"),
	}

	body, err = r.render("reset_password", data)
	return
}

func (r *TemplateRenderer) RenderVerification(lang, userName, link string) (subject string, body string, err error) {
	lang = normalizeLang(lang)
	subject = i18n.T(lang, "EmailVerificationTitle")

	data := struct {
		Title, Greeting, WelcomeMessage, Message, Link, ButtonText string
		ExpiryMessage, ThankYouMessage, Stars, FooterText, FooterNote string
	}{
		Title:           i18n.T(lang, "EmailVerificationTitle"),
		Greeting:        fmt.Sprintf(i18n.T(lang, "EmailGreeting"), userName),
		WelcomeMessage:  i18n.T(lang, "EmailVerificationWelcome"),
		Message:         i18n.T(lang, "EmailVerificationMessage"),
		Link:            link,
		ButtonText:      i18n.T(lang, "EmailVerificationButton"),
		ExpiryMessage:   i18n.T(lang, "EmailVerificationExpiry"),
		ThankYouMessage: i18n.T(lang, "EmailVerificationThankYou"),
		Stars:           "✨✨✨",
		FooterText:      i18n.T(lang, "EmailFooterText"),
		FooterNote:      i18n.T(lang, "EmailFooterNote"),
	}

	body, err = r.render("verify_email", data)
	return
}

func (r *TemplateRenderer) Render2FACode(lang, userName, code string) (subject string, body string, err error) {
	lang = normalizeLang(lang)
	subject = i18n.T(lang, "Email2FATitle")

	data := struct {
		Title, Greeting, Message, Code, ExpiryMessage string
		SecurityMessage, ClosingMessage, Stars, FooterText, FooterNote string
	}{
		Title:           i18n.T(lang, "Email2FATitle"),
		Greeting:        fmt.Sprintf(i18n.T(lang, "EmailGreeting"), userName),
		Message:         i18n.T(lang, "Email2FAMessage"),
		Code:            code,
		ExpiryMessage:   i18n.T(lang, "Email2FAExpiry"),
		SecurityMessage: i18n.T(lang, "Email2FASecurity"),
		ClosingMessage:  i18n.T(lang, "Email2FAClosing"),
		Stars:           "✨✨✨",
		FooterText:      i18n.T(lang, "EmailFooterText"),
		FooterNote:      i18n.T(lang, "EmailFooterNote"),
	}

	body, err = r.render("twofa_code", data)
	return
}

func (r *TemplateRenderer) RenderRoleChange(lang, userName, oldRole, newRole string) (subject string, body string, err error) {
	lang = normalizeLang(lang)
	subject = i18n.T(lang, "EmailRoleChangeTitle")

	data := struct {
		Title, Greeting, Message, Stars, RoleChangeLabel string
		OldRole, NewRole, InfoText, FooterText, FooterNote string
	}{
		Title:           i18n.T(lang, "EmailRoleChangeTitle"),
		Greeting:        fmt.Sprintf(i18n.T(lang, "EmailGreeting"), userName),
		Message:         i18n.T(lang, "EmailRoleChangeMessage"),
		Stars:           "✨✨✨",
		RoleChangeLabel: i18n.T(lang, "EmailRoleChangeLabel"),
		OldRole:         oldRole,
		NewRole:         newRole,
		InfoText:        i18n.T(lang, "EmailRoleChangeInfo"),
		FooterText:      i18n.T(lang, "EmailFooterText"),
		FooterNote:      i18n.T(lang, "EmailFooterNote"),
	}

	body, err = r.render("role_change", data)
	return
}

func (r *TemplateRenderer) RenderAccountDeleted(lang, userName, userEmail string) (subject string, body string, err error) {
	lang = normalizeLang(lang)
	subject = i18n.T(lang, "EmailAccountDeletedTitle")

	data := struct {
		Title, Greeting, Message, Stars, WarningTitle, WarningMessage string
		AccountLabel, AccountEmail, InfoText, FooterText, FooterNote string
	}{
		Title:          i18n.T(lang, "EmailAccountDeletedTitle"),
		Greeting:       fmt.Sprintf(i18n.T(lang, "EmailGreeting"), userName),
		Message:        i18n.T(lang, "EmailAccountDeletedMessage"),
		Stars:          "✨✨✨",
		WarningTitle:   i18n.T(lang, "EmailAccountDeletedWarningTitle"),
		WarningMessage: i18n.T(lang, "EmailAccountDeletedWarningMessage"),
		AccountLabel:   i18n.T(lang, "EmailAccountLabel"),
		AccountEmail:   userEmail,
		InfoText:       i18n.T(lang, "EmailAccountDeletedInfo"),
		FooterText:     i18n.T(lang, "EmailFooterText"),
		FooterNote:     i18n.T(lang, "EmailFooterNote"),
	}

	body, err = r.render("account_deleted", data)
	return
}
