package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"os"
	"os/signal"
	"path/filepath"
	"runtime/debug"
	"syscall"
	"time"

	"github.com/Bobsans/WorldMapGuesser/server/internal/development"
	"github.com/Bobsans/WorldMapGuesser/server/internal/httpserver"
	"github.com/Bobsans/WorldMapGuesser/server/internal/store"
	"github.com/Bobsans/WorldMapGuesser/server/internal/tooling"
	"github.com/Bobsans/WorldMapGuesser/server/internal/webui"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	address := flag.String("addr", envOr("WMG_ADDR", "127.0.0.1:8280"), "HTTP listen address")
	filename := flag.String("db", os.Getenv("WMG_DB"), "SQLite file; defaults to db.sqlite beside the executable")
	flag.Parse()
	if flag.NArg() != 0 {
		return errors.New("unexpected positional arguments")
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	var frontend http.Handler
	var vite *development.Vite
	if webui.Development {
		root, err := tooling.RepositoryRoot()
		if err != nil {
			return err
		}
		if *filename == "" {
			*filename = filepath.Join(root, "server", "db.sqlite")
		}
		vite, err = development.Start(ctx, filepath.Join(root, "web"))
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			return err
		}
		defer vite.Stop()
		proxy := httputil.NewSingleHostReverseProxy(vite.URL)
		proxy.ErrorHandler = func(w http.ResponseWriter, _ *http.Request, err error) {
			logger.Error("Vite proxy", "error", err)
			http.Error(w, "Frontend development server is unavailable.", http.StatusBadGateway)
		}
		frontend = proxy
		logger.Info("frontend development server ready", "address", vite.URL.String())
	} else {
		files, err := webui.Files()
		if err != nil {
			return err
		}
		frontend, err = webui.Handler(files)
		if err != nil {
			return err
		}
	}
	if *filename == "" {
		executable, err := os.Executable()
		if err != nil {
			return err
		}
		*filename = filepath.Join(filepath.Dir(executable), "db.sqlite")
	}
	startup, stopStartup := context.WithTimeout(ctx, 10*time.Second)
	database, err := store.Open(startup, *filename)
	stopStartup()
	if err != nil {
		return err
	}
	defer database.Close()
	listener, err := net.Listen("tcp", *address)
	if err != nil {
		return err
	}
	server := &http.Server{
		Handler:           httpserver.Handler(database, frontend, logger, buildVersion()),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       time.Minute,
		MaxHeaderBytes:    16 << 10,
		ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}
	serveErrors := make(chan error, 1)
	go func() { serveErrors <- server.Serve(listener) }()
	logger.Info("server ready", "address", listener.Addr().String(), "development", webui.Development, "version", buildVersion())
	var childDone <-chan struct{}
	if vite != nil {
		childDone = vite.Done
	}
	var serveError error
	select {
	case <-ctx.Done():
	case <-childDone:
		if ctx.Err() == nil {
			serveError = errors.Join(errors.New("Vite stopped unexpectedly"), vite.Err())
		}
	case serveError = <-serveErrors:
	}
	shutdown, stopShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer stopShutdown()
	if err := server.Shutdown(shutdown); err != nil {
		server.Close()
		return fmt.Errorf("shut down HTTP server: %w", err)
	}
	logger.Info("server stopped")
	if serveError != nil && serveError != http.ErrServerClosed {
		return serveError
	}
	return nil
}

func envOr(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func buildVersion() string {
	revision := "development"
	modified := false
	if info, ok := debug.ReadBuildInfo(); ok {
		for _, setting := range info.Settings {
			if setting.Key == "vcs.revision" {
				revision = setting.Value
			}
			if setting.Key == "vcs.modified" && setting.Value == "true" {
				modified = true
			}
		}
	}
	if modified {
		revision += "-dirty"
	}
	return revision
}
