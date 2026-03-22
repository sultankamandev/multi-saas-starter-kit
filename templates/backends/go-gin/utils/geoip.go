package utils

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// GeoIPResponse represents the response from IP geolocation API
type GeoIPResponse struct {
	CountryCode string `json:"country_code"`
	Country     string `json:"country"`
}

// GetCountryFromIP attempts to detect the country code from an IP address
// Uses ipapi.co free API (no API key required for basic usage)
// Returns country code (e.g., "TR", "US") or empty string if detection fails
func GetCountryFromIP(ip string) string {
	// Skip detection for localhost/private IPs
	if ip == "" || ip == "::1" || ip == "127.0.0.1" || strings.HasPrefix(ip, "192.168.") || strings.HasPrefix(ip, "10.") || strings.HasPrefix(ip, "172.") {
		return ""
	}

	// Use ipapi.co free API (no API key required)
	url := fmt.Sprintf("https://ipapi.co/%s/json/", ip)

	client := &http.Client{
		Timeout: 3 * time.Second, // 3 second timeout to avoid blocking
	}

	resp, err := client.Get(url)
	if err != nil {
		// Silently fail - don't block registration if geolocation fails
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

	var geoData struct {
		CountryCode string `json:"country_code"`
		Error       bool   `json:"error"`
	}

	if err := json.Unmarshal(body, &geoData); err != nil {
		return ""
	}

	// Return empty string if API returned an error
	if geoData.Error {
		return ""
	}

	// Return uppercase country code (max 10 chars)
	countryCode := strings.ToUpper(geoData.CountryCode)
	if len(countryCode) > 10 {
		countryCode = countryCode[:10]
	}

	return countryCode
}


// GetCountryFromLanguage attempts to infer a country code from a language code
// This is a fallback when IP geolocation fails
// Returns country code (e.g., "TR", "US") or empty string if no mapping found
func GetCountryFromLanguage(lang string) string {
	// Normalize language code
	lang = strings.ToLower(lang)
	if len(lang) > 2 {
		lang = lang[:2]
	}

	// Map common languages to their primary countries
	languageToCountry := map[string]string{
		"tr": "TR", // Turkish -> Turkey
		"en": "US", // English -> United States (most common)
		"de": "DE", // German -> Germany
		"fr": "FR", // French -> France
		"it": "IT", // Italian -> Italy
		"es": "ES", // Spanish -> Spain
		"nl": "NL", // Dutch -> Netherlands
		"pl": "PL", // Polish -> Poland
		"pt": "PT", // Portuguese -> Portugal
		"ru": "RU", // Russian -> Russia
		"ja": "JP", // Japanese -> Japan
		"ko": "KR", // Korean -> South Korea
		"zh": "CN", // Chinese -> China
		"ar": "SA", // Arabic -> Saudi Arabia
		"he": "IL", // Hebrew -> Israel
		"hi": "IN", // Hindi -> India
		"sv": "SE", // Swedish -> Sweden
		"no": "NO", // Norwegian -> Norway
		"da": "DK", // Danish -> Denmark
		"fi": "FI", // Finnish -> Finland
		"cs": "CZ", // Czech -> Czech Republic
		"el": "GR", // Greek -> Greece
	}

	if country, ok := languageToCountry[lang]; ok {
		return country
	}

	return ""
}

