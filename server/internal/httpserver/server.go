package httpserver

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net/http"

	"github.com/Bobsans/WorldMapGuesser/server/internal/store"
)

func Handler(database *store.Store, frontend http.Handler, logger *slog.Logger, version string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/scores", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			scores, skipped, err := database.Top(r.Context())
			if err != nil {
				logger.Error("read leaderboard", "error", err)
				writeError(w, http.StatusInternalServerError, "The leaderboard could not be loaded.")
				return
			}
			if skipped > 0 {
				logger.Warn("skipped malformed legacy scores without deleting them", "count", skipped)
			}
			writeJSON(w, http.StatusOK, scores)
		case http.MethodPost:
			mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
			if err != nil || mediaType != "application/json" {
				writeError(w, http.StatusUnsupportedMediaType, "Use application/json.")
				return
			}
			r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
			decoder := json.NewDecoder(r.Body)
			decoder.DisallowUnknownFields()
			var payload struct {
				User   string   `json:"user"`
				Result *int     `json:"result"`
				Time   *int64   `json:"time"`
				Rights []string `json:"rights"`
				Wrongs []string `json:"wrongs"`
			}
			if err := decoder.Decode(&payload); err != nil {
				invalidJSON(w, err)
				return
			}
			if err := decoder.Decode(new(any)); err != io.EOF {
				invalidJSON(w, err)
				return
			}
			if payload.Result == nil || payload.Time == nil {
				writeError(w, http.StatusBadRequest, "Result and time are required.")
				return
			}
			score := store.Score{User: payload.User, Result: *payload.Result, Time: *payload.Time, Rights: payload.Rights, Wrongs: payload.Wrongs}
			if err := score.Validate(); err != nil {
				writeError(w, http.StatusBadRequest, "Invalid result: "+err.Error()+".")
				return
			}
			if err := database.Save(r.Context(), score); err != nil {
				logger.Error("save result", "error", err)
				writeError(w, http.StatusInternalServerError, "The result could not be saved.")
				return
			}
			writeJSON(w, http.StatusOK, map[string]bool{"success": true})
		default:
			w.Header().Set("Allow", "GET, POST")
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
		}
	})
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", "GET")
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed.")
			return
		}
		if err := database.Ping(r.Context()); err != nil {
			logger.Error("database health check", "error", err)
			writeError(w, http.StatusServiceUnavailable, "The database is unavailable.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "version": version})
	})
	apiNotFound := func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, http.StatusNotFound, "API route not found.")
	}
	mux.HandleFunc("/api", apiNotFound)
	mux.HandleFunc("/api/", apiNotFound)
	mux.Handle("/", frontend)
	return mux
}

func invalidJSON(w http.ResponseWriter, err error) {
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		writeError(w, http.StatusRequestEntityTooLarge, "The request is too large.")
		return
	}
	writeError(w, http.StatusBadRequest, "Invalid JSON result.")
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(value)
}
