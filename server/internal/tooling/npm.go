package tooling

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

func NPM(ctx context.Context, directory string, arguments ...string) (*exec.Cmd, error) {
	npm, err := exec.LookPath("npm")
	if err != nil {
		return nil, fmt.Errorf("Node.js and npm are required for development and builds: %w", err)
	}
	if runtime.GOOS == "windows" && (filepath.Ext(npm) == ".cmd" || filepath.Ext(npm) == ".bat") {
		// Run npm's JavaScript entrypoint directly instead of constructing a shell command.
		cli := filepath.Join(filepath.Dir(npm), "node_modules", "npm", "bin", "npm-cli.js")
		if _, err := os.Stat(cli); err != nil {
			return nil, fmt.Errorf("find npm entrypoint: %w", err)
		}
		node, err := exec.LookPath("node")
		if err != nil {
			return nil, err
		}
		return Command(ctx, directory, node, append([]string{cli}, arguments...)...), nil
	}
	return Command(ctx, directory, npm, arguments...), nil
}

func EnsureDependencies(ctx context.Context, webDirectory string) error {
	if _, err := os.Stat(filepath.Join(webDirectory, "node_modules", "vite", "package.json")); err == nil {
		return nil
	}
	cmd, err := NPM(ctx, webDirectory, "ci")
	if err != nil {
		return err
	}
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("install frontend dependencies: %w", err)
	}
	return nil
}
