package utils

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Translations map[string]string

// Languages stores all loaded translations by language code (e.g., "en", "tr", "de", "fr")
var Languages = map[string]Translations{}

func LoadLocales() error {
	localesDir := "locales"

	files, err := os.ReadDir(localesDir)
	if err != nil {
		return fmt.Errorf("failed to read locales dir: %w", err)
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}
		lang := file.Name()[0:2] // en, tr, de, fr
		path := filepath.Join(localesDir, file.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		var translations Translations
		if err := json.Unmarshal(data, &translations); err != nil {
			return err
		}
		Languages[lang] = translations
	}

	fmt.Println("✅ Loaded languages:", len(Languages))
	return nil
}

func T(lang, key string) string {
	if messages, ok := Languages[lang]; ok {
		if val, ok := messages[key]; ok {
			return val
		}
	}
	// fallback to English
	if val, ok := Languages["en"][key]; ok {
		return val
	}
	return key
}

// IsLanguageSupported checks if a language code is supported
func IsLanguageSupported(lang string) bool {
	_, exists := Languages[lang]
	return exists
}
