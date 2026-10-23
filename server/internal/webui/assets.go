//go:build !dev

package webui

import (
	"embed"
	"io/fs"
)

const Development = false

//go:embed all:dist
var embedded embed.FS

func Files() (fs.FS, error) { return fs.Sub(embedded, "dist") }
