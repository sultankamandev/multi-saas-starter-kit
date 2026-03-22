package utils

import (
	"bytes"
	"fmt"
	"html/template"
	"path/filepath"
	"strings"
)

// EmailTemplateData holds the data for email templates with translations
type EmailTemplateData struct {
	Link          string
	Title         string
	Hi            string
	Message       string
	ButtonText    string
	IgnoreMessage string
	ExpiryMessage string
	Footer        string
}

// RoleChangeTemplateData holds data for role change email template
type RoleChangeTemplateData struct {
	Title           string
	Greeting        string
	Message         string
	Stars           string
	RoleChangeLabel string
	OldRole         string
	NewRole         string
	InfoText        string
	FooterText      string
	FooterNote      string
}

// AccountDeletedTemplateData holds data for account deletion email template
type AccountDeletedTemplateData struct {
	Title          string
	Greeting       string
	Message        string
	Stars          string
	WarningTitle   string
	WarningMessage string
	AccountLabel   string
	AccountEmail   string
	InfoText       string
	FooterText     string
	FooterNote     string
}

// RenderEmailTemplate renders an email template using locale translations
func RenderEmailTemplate(lang, templateName string, link string) (string, error) {
	lang = normalizeLang(lang)

	// Build template data with translations from locale system
	data := EmailTemplateData{
		Link:          link,
		Title:         T(lang, "EmailResetPasswordTitle"),
		Hi:            T(lang, "EmailResetPasswordHi"),
		Message:       T(lang, "EmailResetPasswordMessage"),
		ButtonText:    T(lang, "EmailResetPasswordButton"),
		IgnoreMessage: T(lang, "EmailResetPasswordIgnore"),
		ExpiryMessage: T(lang, "EmailResetPasswordExpiry"),
		Footer:        T(lang, "EmailResetPasswordFooter"),
	}

	// Use single template file (no language suffix needed)
	path := filepath.Join("templates", "emails", templateName+".html")
	tmpl, err := template.ParseFiles(path)
	if err != nil {
		return "", err
	}

	var body bytes.Buffer
	err = tmpl.Execute(&body, data)
	if err != nil {
		return "", err
	}

	return body.String(), nil
}

// RenderRoleChangeEmail renders the role change notification email template
func RenderRoleChangeEmail(lang, userName, oldRole, newRole string) (string, error) {
	lang = normalizeLang(lang)

	data := RoleChangeTemplateData{
		Title:           T(lang, "EmailRoleChangeTitle"),
		Greeting:        fmt.Sprintf(T(lang, "EmailGreeting"), userName),
		Message:         T(lang, "EmailRoleChangeMessage"),
		Stars:           "✨✨✨",
		RoleChangeLabel: T(lang, "EmailRoleChangeLabel"),
		OldRole:         oldRole,
		NewRole:         newRole,
		InfoText:        T(lang, "EmailRoleChangeInfo"),
		FooterText:      T(lang, "EmailFooterText"),
		FooterNote:      T(lang, "EmailFooterNote"),
	}

	path := filepath.Join("templates", "emails", "role_change.html")
	tmpl, err := template.ParseFiles(path)
	if err != nil {
		return "", err
	}

	var body bytes.Buffer
	err = tmpl.Execute(&body, data)
	if err != nil {
		return "", err
	}

	return body.String(), nil
}

// RenderAccountDeletedEmail renders the account deletion notification email template
func RenderAccountDeletedEmail(lang, userName, userEmail string) (string, error) {
	lang = normalizeLang(lang)

	data := AccountDeletedTemplateData{
		Title:          T(lang, "EmailAccountDeletedTitle"),
		Greeting:       fmt.Sprintf(T(lang, "EmailGreeting"), userName),
		Message:        T(lang, "EmailAccountDeletedMessage"),
		Stars:          "✨✨✨",
		WarningTitle:   T(lang, "EmailAccountDeletedWarningTitle"),
		WarningMessage: T(lang, "EmailAccountDeletedWarningMessage"),
		AccountLabel:   T(lang, "EmailAccountLabel"),
		AccountEmail:   userEmail,
		InfoText:       T(lang, "EmailAccountDeletedInfo"),
		FooterText:     T(lang, "EmailFooterText"),
		FooterNote:     T(lang, "EmailFooterNote"),
	}

	path := filepath.Join("templates", "emails", "account_deleted.html")
	tmpl, err := template.ParseFiles(path)
	if err != nil {
		return "", err
	}

	var body bytes.Buffer
	err = tmpl.Execute(&body, data)
	if err != nil {
		return "", err
	}

	return body.String(), nil
}

// VerificationEmailTemplateData holds data for email verification template
type VerificationEmailTemplateData struct {
	Title           string
	Greeting        string
	WelcomeMessage  string
	Message         string
	Link            string
	ButtonText      string
	ExpiryMessage   string
	ThankYouMessage string
	Stars           string
	FooterText      string
	FooterNote      string
}

// RenderVerificationEmail renders the email verification template
func RenderVerificationEmail(lang, userName, link string) (string, error) {
	lang = normalizeLang(lang)

	data := VerificationEmailTemplateData{
		Title:           T(lang, "EmailVerificationTitle"),
		Greeting:        fmt.Sprintf(T(lang, "EmailGreeting"), userName),
		WelcomeMessage:  T(lang, "EmailVerificationWelcome"),
		Message:         T(lang, "EmailVerificationMessage"),
		Link:            link,
		ButtonText:      T(lang, "EmailVerificationButton"),
		ExpiryMessage:   T(lang, "EmailVerificationExpiry"),
		ThankYouMessage: T(lang, "EmailVerificationThankYou"),
		Stars:           "✨✨✨",
		FooterText:      T(lang, "EmailFooterText"),
		FooterNote:      T(lang, "EmailFooterNote"),
	}

	path := filepath.Join("templates", "emails", "verify_email.html")
	tmpl, err := template.ParseFiles(path)
	if err != nil {
		return "", err
	}

	var body bytes.Buffer
	err = tmpl.Execute(&body, data)
	if err != nil {
		return "", err
	}

	return body.String(), nil
}

// TwoFactorCodeTemplateData holds data for 2FA code email template
type TwoFactorCodeTemplateData struct {
	Title           string
	Greeting        string
	Message         string
	Code            string
	ExpiryMessage   string
	SecurityMessage string
	ClosingMessage  string
	Stars           string
	FooterText      string
	FooterNote      string
}

// Render2FACodeEmail renders the 2FA code email template
func Render2FACodeEmail(lang, userName, code string) (string, error) {
	lang = normalizeLang(lang)

	data := TwoFactorCodeTemplateData{
		Title:           T(lang, "Email2FATitle"),
		Greeting:        fmt.Sprintf(T(lang, "EmailGreeting"), userName),
		Message:         T(lang, "Email2FAMessage"),
		Code:            code,
		ExpiryMessage:   T(lang, "Email2FAExpiry"),
		SecurityMessage: T(lang, "Email2FASecurity"),
		ClosingMessage:  T(lang, "Email2FAClosing"),
		Stars:           "✨✨✨",
		FooterText:      T(lang, "EmailFooterText"),
		FooterNote:      T(lang, "EmailFooterNote"),
	}

	path := filepath.Join("templates", "emails", "twofa_code.html")
	tmpl, err := template.ParseFiles(path)
	if err != nil {
		return "", err
	}

	var body bytes.Buffer
	err = tmpl.Execute(&body, data)
	if err != nil {
		return "", err
	}

	return body.String(), nil
}

// normalizeLang normalizes language code to supported values
func normalizeLang(lang string) string {
	lang = strings.ToLower(lang)
	switch lang {
	case "tr", "en", "de", "fr":
		return lang
	default:
		return "en"
	}
}
