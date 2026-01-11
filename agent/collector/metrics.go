package collector

import (
	"context"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	gnet "github.com/shirou/gopsutil/v3/net"
)

type Snapshot struct {
	CPUPercent     float64 `json:"cpuPercent"`
	MemUsedPercent float64 `json:"memUsedPercent"`
	DiskUsedPercent float64 `json:"diskUsedPercent"`
	NetRxBytes     uint64  `json:"netRxBytes"`
	NetTxBytes     uint64  `json:"netTxBytes"`
	UptimeSeconds  uint64  `json:"uptimeSeconds"`
	BootTime       uint64  `json:"bootTime"`
}

func Collect(ctx context.Context, diskPath string) (*Snapshot, error) {
	if diskPath == "" {
		diskPath = "/"
	}

	cpuPercents, err := cpu.PercentWithContext(ctx, 200*time.Millisecond, false)
	if err != nil {
		return nil, err
	}
	var cpuPct float64
	if len(cpuPercents) > 0 {
		cpuPct = cpuPercents[0]
	}

	vm, err := mem.VirtualMemoryWithContext(ctx)
	if err != nil {
		return nil, err
	}

	du, err := disk.UsageWithContext(ctx, diskPath)
	if err != nil {
		return nil, err
	}

	netCounters, err := gnet.IOCountersWithContext(ctx, false)
	if err != nil {
		return nil, err
	}
	var rx, tx uint64
	if len(netCounters) > 0 {
		rx = netCounters[0].BytesRecv
		tx = netCounters[0].BytesSent
	}

	uptime, _ := host.UptimeWithContext(ctx)
	bootTime, _ := host.BootTimeWithContext(ctx)

	return &Snapshot{
		CPUPercent:      cpuPct,
		MemUsedPercent:  vm.UsedPercent,
		DiskUsedPercent: du.UsedPercent,
		NetRxBytes:      rx,
		NetTxBytes:      tx,
		UptimeSeconds:   uptime,
		BootTime:        bootTime,
	}, nil
}
