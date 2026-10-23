package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"

	"github.com/Bobsans/WorldMapGuesser/server/internal/tooling"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "Build failed:", err)
		os.Exit(1)
	}
}

func run() error {
	target := flag.String("target", runtime.GOOS+"/"+runtime.GOARCH, "Go target OS/architecture")
	output := flag.String("output", "", "output executable; defaults to bin/world-map-guesser")
	flag.Parse()
	goos, goarch, valid := strings.Cut(*target, "/")
	if !valid || goos == "" || goarch == "" || flag.NArg() != 0 {
		return errors.New("target must be OS/architecture, for example linux/amd64")
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	root, err := tooling.RepositoryRoot()
	if err != nil {
		return err
	}
	webDirectory := filepath.Join(root, "web")
	if err := tooling.EnsureDependencies(ctx, webDirectory); err != nil {
		return err
	}
	frontend, err := tooling.NPM(ctx, webDirectory, "run", "build")
	if err != nil {
		return err
	}
	if err := frontend.Run(); err != nil {
		return fmt.Errorf("build frontend: %w", err)
	}
	if err := stageAssets(root); err != nil {
		return err
	}
	if *output == "" {
		*output = filepath.Join(root, "bin", "world-map-guesser")
		if goos == "windows" {
			*output += ".exe"
		}
	}
	absoluteOutput, err := filepath.Abs(*output)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(absoluteOutput), 0o755); err != nil {
		return err
	}
	goBinary, err := exec.LookPath("go")
	if err != nil {
		return err
	}
	backend := tooling.Command(ctx, filepath.Join(root, "server"), goBinary,
		"build", "-trimpath", "-ldflags=-s -w", "-o", absoluteOutput, ".")
	backend.Env = append(os.Environ(), "CGO_ENABLED=0", "GOOS="+goos, "GOARCH="+goarch)
	if err := backend.Run(); err != nil {
		return fmt.Errorf("build Go server: %w", err)
	}
	fmt.Println("Built", absoluteOutput)
	return nil
}

func stageAssets(root string) error {
	source := filepath.Join(root, "web", "dist")
	index, err := os.Stat(filepath.Join(source, "index.html"))
	if err != nil || index.IsDir() {
		return errors.New("frontend build is missing web/dist/index.html")
	}
	parent := filepath.Join(root, "server", "internal", "webui")
	resolvedParent, err := filepath.EvalSymlinks(parent)
	if err != nil {
		return err
	}
	relative, err := filepath.Rel(root, resolvedParent)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return errors.New("embedded asset directory must stay inside the repository")
	}
	temporary, err := os.MkdirTemp(resolvedParent, ".dist-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(temporary)
	if err := filepath.WalkDir(source, func(name string, entry fs.DirEntry, walkError error) error {
		if walkError != nil {
			return walkError
		}
		if strings.HasPrefix(entry.Name(), ".") {
			if entry.IsDir() {
				return fs.SkipDir
			}
			return nil
		}
		relative, err := filepath.Rel(source, name)
		if err != nil {
			return err
		}
		destination := filepath.Join(temporary, relative)
		if entry.IsDir() {
			return os.MkdirAll(destination, 0o755)
		}
		if !entry.Type().IsRegular() {
			return fmt.Errorf("frontend bundle contains a non-regular file: %s", relative)
		}
		return copyFile(name, destination)
	}); err != nil {
		return err
	}
	target := filepath.Join(resolvedParent, "dist")
	if err := os.RemoveAll(target); err != nil {
		return err
	}
	return os.Rename(temporary, target)
}

func copyFile(source, target string) error {
	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()
	output, err := os.Create(target)
	if err != nil {
		return err
	}
	_, copyError := io.Copy(output, input)
	closeError := output.Close()
	return errors.Join(copyError, closeError)
}
