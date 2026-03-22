package i18n

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Translations map[string]string

var Languages = map[string]Translations{}

func LoadLocales(dir string) error {
	files, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("failed to read locales dir: %w", err)
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}
		name := file.Name()
		if len(name) < 2 {
			continue
		}
		lang := name[:2]
		path := filepath.Join(dir, name)
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

	fmt.Printf("Loaded %d languages\n", len(Languages))
	return nil
}

func T(lang, key string) string {
	if messages, ok := Languages[lang]; ok {
		if val, ok := messages[key]; ok {
			return val
		}
	}
	if val, ok := Languages["en"][key]; ok {
		return val
	}
	return key
}

func IsLanguageSupported(lang string) bool {
	_, exists := Languages[lang]
	return exists
}

func NormalizeLang(lang string) string {
	lang = strings.ToLower(lang)
	if len(lang) > 2 {
		lang = lang[:2]
	}
	if !IsLanguageSupported(lang) {
		return "en"
	}
	return lang
}
