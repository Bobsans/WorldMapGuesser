//go:build dev

package webui

import (
	"errors"
	"io/fs"
)

const Development = true

func Files() (fs.FS, error) { return nil, errors.New("development build uses Vite") }
