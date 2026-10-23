package tooling

import (
	"errors"
	"os"
	"path/filepath"
)

func RepositoryRoot() (string, error) {
	directory, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		_, webErr := os.Stat(filepath.Join(directory, "web", "package.json"))
		_, serverErr := os.Stat(filepath.Join(directory, "server", "go.mod"))
		if webErr == nil && serverErr == nil {
			return directory, nil
		}
		parent := filepath.Dir(directory)
		if parent == directory {
			return "", errors.New("run this command inside the WorldMapGuesser repository")
		}
		directory = parent
	}
}
