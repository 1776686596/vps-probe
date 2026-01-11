package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strconv"
	"syscall"
	"time"

	"github.com/daisheng/vps-probe/agent/collector"
	"github.com/daisheng/vps-probe/agent/state"
)

const version = "0.1.0"

type Config struct {
	ServerURL string
	Secret    []byte
	NodeID    string
	Hostname  string
	Interval  time.Duration
	DiskPath  string
	StatePath string
}

type Payload struct {
	NodeID    string             `json:"nodeId"`
	Hostname  string             `json:"hostname,omitempty"`
	Snapshot  *collector.Snapshot `json:"snapshot"`
	Bandwidth struct {
		DeltaRxBytes uint64 `json:"deltaRxBytes"`
		DeltaTxBytes uint64 `json:"deltaTxBytes"`
		TotalRxBytes uint64 `json:"totalRxBytes"`
		TotalTxBytes uint64 `json:"totalTxBytes"`
		RxSpeed      uint64 `json:"rxSpeed"`
		TxSpeed      uint64 `json:"txSpeed"`
	} `json:"bandwidth"`
	Meta struct {
		Version  string `json:"version"`
		OS       string `json:"os"`
		Arch     string `json:"arch"`
		Interval int    `json:"interval"`
	} `json:"meta"`
}

func main() {
	cfg := loadConfig()
	st, err := state.Load(cfg.StatePath)
	if err != nil {
		log.Printf("warning: failed to load state: %v", err)
	}
	client := &http.Client{Timeout: 10 * time.Second}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	ticker := time.NewTicker(cfg.Interval)
	defer ticker.Stop()

	log.Printf("vps-probe agent started, reporting to %s every %s", cfg.ServerURL, cfg.Interval)

	for {
		if err := report(ctx, client, cfg, st); err != nil {
			log.Printf("error: %v", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func report(ctx context.Context, client *http.Client, cfg Config, st *state.State) error {
	snap, err := collector.Collect(ctx, cfg.DiskPath)
	if err != nil {
		return err
	}

	prev := st.Snap()
	deltaRx, deltaTx, totalRx, totalTx, _ := st.Update(snap.BootTime, snap.NetRxBytes, snap.NetTxBytes)

	intervalSec := int(cfg.Interval.Seconds())
	var rxSpeed, txSpeed uint64
	if intervalSec > 0 {
		rxSpeed = deltaRx / uint64(intervalSec)
		txSpeed = deltaTx / uint64(intervalSec)
	}

	payload := Payload{NodeID: cfg.NodeID, Hostname: cfg.Hostname, Snapshot: snap}
	payload.Bandwidth.DeltaRxBytes = deltaRx
	payload.Bandwidth.DeltaTxBytes = deltaTx
	payload.Bandwidth.TotalRxBytes = totalRx
	payload.Bandwidth.TotalTxBytes = totalTx
	payload.Bandwidth.RxSpeed = rxSpeed
	payload.Bandwidth.TxSpeed = txSpeed
	payload.Meta.Version = version
	payload.Meta.OS = runtime.GOOS
	payload.Meta.Arch = runtime.GOARCH
	payload.Meta.Interval = intervalSec

	body, _ := json.Marshal(payload)
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, cfg.ServerURL, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "vps-probe-agent/"+version)
	req.Header.Set("X-Probe-Timestamp", ts)
	req.Header.Set("X-Probe-Signature", sign(cfg.Secret, ts, body))

	resp, err := client.Do(req)
	if err != nil {
		st.Restore(prev)
		return err
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 300 {
		st.Restore(prev)
		return fmt.Errorf("server returned %d", resp.StatusCode)
	}

	if err := state.Save(cfg.StatePath, st); err != nil {
		log.Printf("warning: failed to save state: %v", err)
	}
	return nil
}

func sign(secret []byte, timestamp string, body []byte) string {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(timestamp))
	mac.Write([]byte{'\n'})
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

func loadConfig() Config {
	serverURL := os.Getenv("PROBE_SERVER_URL")
	if serverURL == "" {
		log.Fatal("PROBE_SERVER_URL is required")
	}
	secret := os.Getenv("PROBE_HMAC_SECRET")
	if secret == "" {
		log.Fatal("PROBE_HMAC_SECRET is required")
	}

	nodeID := os.Getenv("PROBE_NODE_ID")
	if nodeID == "" {
		nodeID, _ = os.Hostname()
	}
	hostname, _ := os.Hostname()

	interval := 10 * time.Second
	if v := os.Getenv("PROBE_INTERVAL_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			interval = time.Duration(n) * time.Second
		}
	}

	diskPath := os.Getenv("PROBE_DISK_PATH")
	if diskPath == "" {
		diskPath = "/"
	}

	statePath := os.Getenv("PROBE_STATE_PATH")
	if statePath == "" {
		statePath = "/var/lib/vps-probe/state.json"
	}

	return Config{
		ServerURL: serverURL,
		Secret:    []byte(secret),
		NodeID:    nodeID,
		Hostname:  hostname,
		Interval:  interval,
		DiskPath:  diskPath,
		StatePath: statePath,
	}
}
