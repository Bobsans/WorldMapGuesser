package development

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/Bobsans/WorldMapGuesser/server/internal/tooling"
)

type Vite struct {
	URL    *url.URL
	Done   <-chan struct{}
	cancel context.CancelFunc
	err    error
}

func Start(ctx context.Context, webDirectory string) (*Vite, error) {
	if err := tooling.EnsureDependencies(ctx, webDirectory); err != nil {
		return nil, err
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, err
	}
	port := listener.Addr().(*net.TCPAddr).Port
	listener.Close()
	childContext, cancel := context.WithCancel(ctx)
	cmd, err := tooling.NPM(childContext, webDirectory, "run", "dev", "--", "--host", "127.0.0.1", "--port", fmt.Sprint(port), "--strictPort")
	if err != nil {
		cancel()
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		cancel()
		return nil, fmt.Errorf("start Vite: %w", err)
	}
	done := make(chan struct{})
	address, _ := url.Parse(fmt.Sprintf("http://127.0.0.1:%d", port))
	vite := &Vite{URL: address, Done: done, cancel: cancel}
	go func() {
		vite.err = cmd.Wait()
		close(done)
	}()
	client := &http.Client{Timeout: time.Second, Transport: &http.Transport{Proxy: nil}}
	defer client.CloseIdleConnections()
	startup, stopStartup := context.WithTimeout(ctx, 60*time.Second)
	defer stopStartup()
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-done:
			cancel()
			if vite.err == nil {
				return nil, errors.New("Vite exited before becoming ready")
			}
			return nil, fmt.Errorf("Vite exited during startup: %w", vite.err)
		case <-startup.Done():
			vite.Stop()
			return nil, fmt.Errorf("wait for Vite: %w", startup.Err())
		case <-ticker.C:
			request, _ := http.NewRequestWithContext(startup, http.MethodGet, address.String()+"/@vite/client", nil)
			response, err := client.Do(request)
			if err == nil {
				response.Body.Close()
				if response.StatusCode == http.StatusOK {
					return vite, nil
				}
			}
		}
	}
}

func (v *Vite) Stop() {
	v.cancel()
	<-v.Done
}

func (v *Vite) Err() error {
	<-v.Done
	return v.err
}
