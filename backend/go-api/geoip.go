package main

import "strings"

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
