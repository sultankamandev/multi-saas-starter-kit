package utils

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"
)

// RecaptchaResponse represents the response from Google reCAPTCHA API
type RecaptchaResponse struct {
	Success     bool     `json:"success"`
	Score       float64  `json:"score"`        // 0.0 to 1.0 (1.0 = very likely human)
	Action      string   `json:"action"`       // Action name (e.g., "register", "login")
	ChallengeTS string   `json:"challenge_ts"` // Timestamp of the challenge
	Hostname    string   `json:"hostname"`     // Hostname where reCAPTCHA was solved
	ErrorCodes  []string `json:"error-codes"`  // Optional error codes
}

// VerifyRecaptcha verifies a reCAPTCHA token with Google's API
// Returns true if verification passes, score, and any error
func VerifyRecaptcha(token, action string) (bool, float64, error) {
	secretKey := os.Getenv("RECAPTCHA_SECRET_KEY")
	if secretKey == "" {
		// If no secret key is configured, skip verification (for development)
		return true, 1.0, nil
	}

	if token == "" {
		return false, 0.0, fmt.Errorf("recaptcha token is required")
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Prepare form data
	data := url.Values{}
	data.Set("secret", secretKey)
	data.Set("response", token)

	// Make POST request to Google reCAPTCHA API
	resp, err := client.PostForm("https://www.google.com/recaptcha/api/siteverify", data)
	if err != nil {
		return false, 0.0, fmt.Errorf("failed to verify recaptcha: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, 0.0, fmt.Errorf("failed to read recaptcha response: %w", err)
	}

	// Parse JSON response
	var recaptchaResp RecaptchaResponse
	if err := json.Unmarshal(body, &recaptchaResp); err != nil {
		return false, 0.0, fmt.Errorf("failed to parse recaptcha response: %w", err)
	}

	// Check if verification was successful
	if !recaptchaResp.Success {
		return false, 0.0, fmt.Errorf("recaptcha verification failed: %v", recaptchaResp.ErrorCodes)
	}

	// Verify action matches (optional but recommended)
	if action != "" && recaptchaResp.Action != action {
		return false, recaptchaResp.Score, fmt.Errorf("recaptcha action mismatch: expected %s, got %s", action, recaptchaResp.Action)
	}

	// Check score (v3 returns 0.0 to 1.0, where 1.0 is very likely human)
	// Common threshold is 0.5, but you can adjust based on your needs
	threshold := 0.5
	if recaptchaResp.Score < threshold {
		return false, recaptchaResp.Score, fmt.Errorf("recaptcha score too low: %.2f (threshold: %.2f)", recaptchaResp.Score, threshold)
	}

	return true, recaptchaResp.Score, nil
}
