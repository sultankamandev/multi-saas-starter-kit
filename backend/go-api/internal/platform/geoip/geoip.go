package geoip

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Resolver interface {
	CountryFromIP(ip string) string
	CountryFromLanguage(lang string) string
}

type resolver struct{}

func NewResolver() Resolver {
	return &resolver{}
}

func (r *resolver) CountryFromIP(ip string) string {
	if ip == "" || ip == "::1" || ip == "127.0.0.1" ||
		strings.HasPrefix(ip, "192.168.") ||
		strings.HasPrefix(ip, "10.") ||
		strings.HasPrefix(ip, "172.") {
		return ""
	}

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(fmt.Sprintf("https://ipapi.co/%s/json/", ip))
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ""
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return ""
	}

	var data struct {
		CountryCode string `json:"country_code"`
		Error       bool   `json:"error"`
	}
	if err := json.Unmarshal(body, &data); err != nil || data.Error {
		return ""
	}

	code := strings.ToUpper(data.CountryCode)
	if len(code) > 10 {
		code = code[:10]
	}
	return code
}

var languageToCountry = map[string]string{
	"tr": "TR", "en": "US", "de": "DE", "fr": "FR",
	"it": "IT", "es": "ES", "nl": "NL", "pl": "PL",
	"pt": "PT", "ru": "RU", "ja": "JP", "ko": "KR",
	"zh": "CN", "ar": "SA", "he": "IL", "hi": "IN",
	"sv": "SE", "no": "NO", "da": "DK", "fi": "FI",
	"cs": "CZ", "el": "GR",
}

func (r *resolver) CountryFromLanguage(lang string) string {
	lang = strings.ToLower(lang)
	if len(lang) > 2 {
		lang = lang[:2]
	}
	if country, ok := languageToCountry[lang]; ok {
		return country
	}
	return ""
}
