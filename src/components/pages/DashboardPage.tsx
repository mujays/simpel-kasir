import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppData, ActivePage } from '../../types';
import { formatRupiah, toDateInputValue } from '../../utils/formatters';
import { IconAlertCircle, IconArrowIn, IconCheck, IconKasir } from '../common/Icons';

declare global {
  interface Window {
    Chart?: any;
  }
}

interface DashboardPageProps {
  data: AppData;
  onNavigate: (page: ActivePage) => void;
}

type PeriodFilter = 'hariIni' | 'bulanIni' | 'kustom';

export const DashboardPage: React.FC<DashboardPageProps> = ({ data, onNavigate }) => {
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('hariIni');
  const todayStr = toDateInputValue(new Date());
  const [customStart, setCustomStart] = useState<string>(todayStr);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<any>(null);

  // Filter transactions based on selected period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return data.transaksi.filter((t) => {
      const tDate = new Date(t.tanggal);
      if (filterPeriod === 'hariIni') {
        return (
          tDate.getFullYear() === now.getFullYear() &&
          tDate.getMonth() === now.getMonth() &&
          tDate.getDate() === now.getDate()
        );
      } else if (filterPeriod === 'bulanIni') {
        return (
          tDate.getFullYear() === now.getFullYear() &&
          tDate.getMonth() === now.getMonth()
        );
      } else {
        // Kustom
        if (!customStart && !customEnd) return true;
        const itemDateStr = toDateInputValue(tDate);
        if (customStart && itemDateStr < customStart) return false;
        if (customEnd && itemDateStr > customEnd) return false;
        return true;
      }
    });
  }, [data.transaksi, filterPeriod, customStart, customEnd]);

  // KPI calculations
  const totalPenjualan = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [filteredTransactions]);

  const totalLabaKotor = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => acc + (curr.labaKotor || 0), 0);
  }, [filteredTransactions]);

  const jumlahTransaksi = filteredTransactions.length;

  // Produk stok menipis (aktif && stok <= stokMinimum)
  const lowStockProducts = useMemo(() => {
    return data.produk.filter((p) => p.aktif && p.stok <= p.stokMinimum);
  }, [data.produk]);

  // Chart data for current month daily sales
  useEffect(() => {
    if (!chartCanvasRef.current) return;

    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    if (typeof window.Chart === 'undefined') {
      return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const labels: string[] = [];
    const salesData: number[] = new Array(daysInMonth).fill(0);
    const profitData: number[] = new Array(daysInMonth).fill(0);

    for (let day = 1; day <= daysInMonth; day++) {
      labels.push(`${day}`);
    }

    data.transaksi.forEach((t) => {
      const tDate = new Date(t.tanggal);
      if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
        const dayIdx = tDate.getDate() - 1;
        if (dayIdx >= 0 && dayIdx < daysInMonth) {
          salesData[dayIdx] += t.total || 0;
          profitData[dayIdx] += t.labaKotor || 0;
        }
      }
    });

    try {
      chartInstanceRef.current = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Penjualan',
              data: salesData,
              // Rule: multi-seri gunakan --primary dengan opacity 1 / 0.56
              backgroundColor: 'hsla(21, 90%, 40%, 1)',
              borderRadius: 4,
            },
            {
              label: 'Laba Kotor',
              data: profitData,
              backgroundColor: 'hsla(21, 90%, 40%, 0.56)',
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { family: 'Inter', size: 12 },
              },
            },
            tooltip: {
              callbacks: {
                label: function (context: any) {
                  const val = context.raw || 0;
                  return `${context.dataset.label}: ${formatRupiah(val)}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Inter', size: 11 } },
            },
            y: {
              beginAtZero: true,
              ticks: {
                font: { family: 'Inter', size: 11 },
                callback: function (val: any) {
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1)} jt`;
                  if (val >= 1000) return `${(val / 1000).toFixed(0)} rb`;
                  return val;
                },
              },
            },
          },
        },
      });
    } catch (err) {
      console.warn('Error rendering Chart.js', err);
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data.transaksi]);

  return (
    <div className="space-y-6">
      {/* Header filter section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Ringkasan Operasional</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Pantau performa kasir dan ketersediaan stok secara realtime
          </p>
        </div>

        {/* Filter Periode */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-0.5">
            <button
              id="btn-filter-hari-ini"
              type="button"
              onClick={() => setFilterPeriod('hariIni')}
              className={`h-8 px-3 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition ${
                filterPeriod === 'hariIni'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Hari Ini
            </button>
            <button
              id="btn-filter-bulan-ini"
              type="button"
              onClick={() => setFilterPeriod('bulanIni')}
              className={`h-8 px-3 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition ${
                filterPeriod === 'bulanIni'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Bulan Ini
            </button>
            <button
              id="btn-filter-kustom"
              type="button"
              onClick={() => setFilterPeriod('kustom')}
              className={`h-8 px-3 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition ${
                filterPeriod === 'kustom'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Kustom
            </button>
          </div>

          {filterPeriod === 'kustom' && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <input
                id="input-filter-tgl-mulai"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 px-2 text-xs rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))]"
              />
              <span className="text-xs text-[hsl(var(--muted-foreground))]">-</span>
              <input
                id="input-filter-tgl-selesai"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 px-2 text-xs rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))]"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4 Kartu KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Penjualan */}
        <div id="kpi-card-penjualan" className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Total Penjualan</span>
          <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
            {formatRupiah(totalPenjualan)}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Periode: {filterPeriod === 'hariIni' ? 'Hari Ini' : filterPeriod === 'bulanIni' ? 'Bulan Ini' : 'Rentang Kustom'}
          </span>
        </div>

        {/* KPI 2: Laba Kotor */}
        <div id="kpi-card-laba" className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Laba Kotor</span>
          <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
            {formatRupiah(totalLabaKotor)}
          </span>
          <span className="text-xs text-[hsl(var(--success))]">
            Margin: {totalPenjualan > 0 ? `${((totalLabaKotor / totalPenjualan) * 100).toFixed(1)}%` : '0%'}
          </span>
        </div>

        {/* KPI 3: Jumlah Transaksi */}
        <div id="kpi-card-transaksi" className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Jumlah Transaksi</span>
          <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
            {jumlahTransaksi}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Struk selesai</span>
        </div>

        {/* KPI 4: Stok Menipis */}
        <div id="kpi-card-stok-menipis" className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Stok Menipis & Habis</span>
          <span className={`text-2xl font-semibold tabular-nums ${lowStockProducts.length > 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--foreground))]'}`}>
            {lowStockProducts.length}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Perlu restok segera</span>
        </div>
      </div>

      {/* Grid: Grafik Penjualan Harian & Quick Actions / Stok Menipis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Penjualan Harian Bulan Ini */}
        <div className="lg:col-span-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Grafik Penjualan Harian</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Performa transaksi per tanggal pada bulan berjalan</p>
            </div>
            <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]">
              Bulan Ini
            </span>
          </div>

          <div className="w-full h-64 relative">
            <canvas ref={chartCanvasRef} id="dashboard-sales-chart" />
          </div>
        </div>

        {/* Daftar Singkat Stok Menipis & Aksi Cepat */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
              <IconAlertCircle size={16} className="text-[hsl(var(--warning))]" />
              Peringatan Stok
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('cekStok')}
              className="text-xs text-[hsl(var(--primary))] hover:underline font-medium"
            >
              Lihat Semua
            </button>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] flex items-center justify-center mb-2">
                <IconCheck size={20} />
              </div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">Semua Stok Aman</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Tidak ada barang yang berada di bawah stok minimum.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-64 pr-1">
              {lowStockProducts.map((p) => {
                const isZero = p.stok === 0;
                return (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{p.nama}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Kode: {p.kode} • Min: {p.stokMinimum}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium ${
                          isZero
                            ? 'bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]'
                            : 'bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]'
                        }`}
                      >
                        {isZero ? 'Habis' : `Sisa ${p.stok}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-[hsl(var(--border))] flex gap-2">
            <button
              id="btn-quick-kasir"
              type="button"
              onClick={() => onNavigate('kasir')}
              className="flex-1 h-10 px-4 rounded-[var(--radius)] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:brightness-[0.92] transition flex items-center justify-center gap-2"
            >
              <IconKasir size={16} />
              Buka Kasir
            </button>
            <button
              id="btn-quick-stok-masuk"
              type="button"
              onClick={() => onNavigate('stok')}
              className="h-10 px-4 rounded-[var(--radius)] border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] text-sm font-medium hover:bg-[hsl(var(--secondary))] transition flex items-center gap-1.5"
              title="Catat Stok Masuk"
            >
              <IconArrowIn size={16} />
              <span className="hidden sm:inline">Tambah Stok</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
