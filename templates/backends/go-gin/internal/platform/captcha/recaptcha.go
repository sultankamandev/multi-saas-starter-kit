package captcha

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

type Verifier interface {
	Verify(token string, action string) error
}

type recaptchaResponse struct {
	Success    bool     `json:"success"`
	Score      float64  `json:"score"`
	Action     string   `json:"action"`
	ErrorCodes []string `json:"error-codes"`
}

type recaptchaVerifier struct {
	secretKey string
	threshold float64
}

func NewRecaptchaVerifier(secretKey string) Verifier {
	return &recaptchaVerifier{
		secretKey: secretKey,
		threshold: 0.5,
	}
}

func (v *recaptchaVerifier) Verify(token string, action string) error {
	if v.secretKey == "" {
		return nil // skip in development
	}
	if token == "" {
		return fmt.Errorf("recaptcha token is required")
	}

	client := &http.Client{Timeout: 10 * time.Second}

	data := url.Values{}
	data.Set("secret", v.secretKey)
	data.Set("response", token)

	resp, err := client.PostForm("https://www.google.com/recaptcha/api/siteverify", data)
	if err != nil {
		return fmt.Errorf("failed to verify recaptcha: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read recaptcha response: %w", err)
	}

	var result recaptchaResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return fmt.Errorf("failed to parse recaptcha response: %w", err)
	}

	if !result.Success {
		return fmt.Errorf("recaptcha verification failed: %v", result.ErrorCodes)
	}

	if action != "" && result.Action != action {
		return fmt.Errorf("recaptcha action mismatch: expected %s, got %s", action, result.Action)
	}

	if result.Score < v.threshold {
		return fmt.Errorf("recaptcha score too low: %.2f", result.Score)
	}

	return nil
}
