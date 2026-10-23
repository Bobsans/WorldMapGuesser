package webui

import (
	"errors"
	"io"
	"io/fs"
	"net/http"
	"strings"
)

func Handler(files fs.FS) (http.Handler, error) {
	if info, err := fs.Stat(files, "index.html"); err != nil || info.IsDir() {
		return nil, errors.New("embedded frontend is missing index.html; use the Go build command")
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "Method not allowed.", http.StatusMethodNotAllowed)
			return
		}
		name := strings.TrimPrefix(r.URL.Path, "/")
		if name == "" {
			name = "index.html"
		}
		if !fs.ValidPath(name) {
			http.NotFound(w, r)
			return
		}
		for _, segment := range strings.Split(name, "/") {
			if strings.HasPrefix(segment, ".") {
				http.NotFound(w, r)
				return
			}
		}
		file, err := files.Open(name)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer file.Close()
		info, err := file.Stat()
		if err != nil || info.IsDir() {
			http.NotFound(w, r)
			return
		}
		reader, ok := file.(io.ReadSeeker)
		if !ok {
			http.Error(w, "Resource is unavailable.", http.StatusInternalServerError)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-cache")
		if strings.HasPrefix(name, "assets/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			w.Header().Set("ETag", `"`+name+`"`)
		}
		http.ServeContent(w, r, info.Name(), info.ModTime(), reader)
	}), nil
}
