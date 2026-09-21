import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppData, Transaksi, TransaksiItem } from '../../types';
import { formatRupiah, formatTanggalWaktu, toDateInputValue, formatBulanTahun } from '../../utils/formatters';
import { IconEye, IconAlertCircle, IconX } from '../common/Icons';

interface LaporanPageProps {
  data: AppData;
}

type LaporanPeriodType = 'hariIni' | 'bulanIni' | 'pilihBulan' | 'rentangTanggal';

export const LaporanPage: React.FC<LaporanPageProps> = ({ data }) => {
  const [periodType, setPeriodType] = useState<LaporanPeriodType>('bulanIni');

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());

  const todayStr = toDateInputValue(now);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [selectedTransaksiDetail, setSelectedTransaksiDetail] = useState<{
    transaksi: Transaksi;
    items: TransaksiItem[];
  } | null>(null);

  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<any>(null);

  // Filtered transactions based on period
  const filteredTransactions = useMemo(() => {
    return data.transaksi.filter((t) => {
      const tDate = new Date(t.tanggal);

      if (periodType === 'hariIni') {
        const today = new Date();
        return (
          tDate.getFullYear() === today.getFullYear() &&
          tDate.getMonth() === today.getMonth() &&
          tDate.getDate() === today.getDate()
        );
      }

      if (periodType === 'bulanIni') {
        const today = new Date();
        return (
          tDate.getFullYear() === today.getFullYear() &&
          tDate.getMonth() === today.getMonth()
        );
      }

      if (periodType === 'pilihBulan') {
        return (
          tDate.getFullYear() === selectedYear &&
          tDate.getMonth() === selectedMonth
        );
      }

      if (periodType === 'rentangTanggal') {
        const itemDateStr = toDateInputValue(tDate);
        if (startDate && itemDateStr < startDate) return false;
        if (endDate && itemDateStr > endDate) return false;
        return true;
      }

      return true;
    });
  }, [data.transaksi, periodType, selectedYear, selectedMonth, startDate, endDate]);

  // Summary Metrics
  const totalPenjualan = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + (t.total || 0), 0);
  }, [filteredTransactions]);

  const totalModal = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + (t.totalModal || 0), 0);
  }, [filteredTransactions]);

  const totalLabaKotor = useMemo(() => {
    return totalPenjualan - totalModal;
  }, [totalPenjualan, totalModal]);

  const jumlahTransaksi = filteredTransactions.length;

  const isMonthlyPeriod = periodType === 'bulanIni' || periodType === 'pilihBulan';

  // Render Daily Sales Chart when monthly period is active
  useEffect(() => {
    if (!isMonthlyPeriod || !chartCanvasRef.current) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    if (typeof window.Chart === 'undefined') return;

    const targetYear = periodType === 'bulanIni' ? new Date().getFullYear() : selectedYear;
    const targetMonth = periodType === 'bulanIni' ? new Date().getMonth() : selectedMonth;
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

    const labels: string[] = [];
    const salesData: number[] = new Array(daysInMonth).fill(0);
    const profitData: number[] = new Array(daysInMonth).fill(0);

    for (let day = 1; day <= daysInMonth; day++) {
      labels.push(`${day}`);
    }

    filteredTransactions.forEach((t) => {
      const tDate = new Date(t.tanggal);
      const dayIdx = tDate.getDate() - 1;
      if (dayIdx >= 0 && dayIdx < daysInMonth) {
        salesData[dayIdx] += t.total || 0;
        profitData[dayIdx] += t.labaKotor || 0;
      }
    });

    try {
      chartInstanceRef.current = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Penjualan (Rp)',
              data: salesData,
              // Multi-seri opacity rule: 1 & 0.56
              borderColor: 'hsla(21, 90%, 40%, 1)',
              backgroundColor: 'hsla(21, 90%, 40%, 0.18)',
              borderWidth: 2,
              tension: 0.2,
              fill: true,
              pointRadius: 3,
            },
            {
              label: 'Laba Kotor (Rp)',
              data: profitData,
              borderColor: 'hsla(21, 90%, 40%, 0.56)',
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [4, 4],
              tension: 0.2,
              pointRadius: 2,
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
      console.warn('Error rendering Laporan Chart', err);
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isMonthlyPeriod, periodType, selectedYear, selectedMonth, filteredTransactions]);

  const openDetailModal = (trx: Transaksi) => {
    const items = data.transaksiItem.filter((it) => it.transaksiId === trx.id);
    setSelectedTransaksiDetail({
      transaksi: trx,
      items,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">Laporan Penjualan & Laba</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Analisis omzet, harga modal barang terjual, dan keuntungan kotor toko
        </p>
      </div>

      {/* Period Filter Bar */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main Filter Buttons */}
          <div className="inline-flex rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-0.5">
            <button
              id="btn-lap-hari-ini"
              type="button"
              onClick={() => setPeriodType('hariIni')}
              className={`h-9 px-3 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition ${
                periodType === 'hariIni'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Hari Ini
            </button>
            <button
              id="btn-lap-bulan-ini"
              type="button"
              onClick={() => setPeriodType('bulanIni')}
              className={`h-9 px-3 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition ${
                periodType === 'bulanIni'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Bulan Ini
            </button>
            <button
              id="btn-lap-pilih-bulan"
              type="button"
              onClick={() => setPeriodType('pilihBulan')}
              className={`h-9 px-3 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition ${
                periodType === 'pilihBulan'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Pilih Bulan
            </button>
            <button
              id="btn-lap-rentang"
              type="button"
              onClick={() => setPeriodType('rentangTanggal')}
              className={`h-9 px-3 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition ${
                periodType === 'rentangTanggal'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Rentang Tanggal
            </button>
          </div>

          {/* Sub Filters */}
          {periodType === 'pilihBulan' && (
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="h-9 px-2.5 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              >
                {[
                  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ].map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="h-9 px-2.5 rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodType === 'rentangTanggal' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 px-2 text-xs rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <span className="text-xs text-[hsl(var(--muted-foreground))]">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 px-2 text-xs rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4 Kartu KPI Laporan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Penjualan */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Total Penjualan (Omzet)</span>
          <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
            {formatRupiah(totalPenjualan)}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Seluruh nilai struk</span>
        </div>

        {/* Total Modal Terjual */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Modal Barang Terjual</span>
          <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
            {formatRupiah(totalModal)}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Harga beli awal item</span>
        </div>

        {/* Laba Kotor */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Laba Kotor</span>
          <span className="text-2xl font-semibold text-[hsl(var(--success))] tabular-nums">
            {formatRupiah(totalLabaKotor)}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Margin: {totalPenjualan > 0 ? `${((totalLabaKotor / totalPenjualan) * 100).toFixed(1)}%` : '0%'}
          </span>
        </div>

        {/* Jumlah Transaksi */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 flex flex-col gap-1 shadow-sm">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Jumlah Transaksi</span>
          <span className="text-2xl font-semibold text-[hsl(var(--foreground))] tabular-nums">
            {jumlahTransaksi}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Struk terverifikasi</span>
        </div>
      </div>

      {/* Grafik Harian ketika periode berupa bulan */}
      {isMonthlyPeriod && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Tren Penjualan & Laba Harian</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Periode: {periodType === 'bulanIni' ? 'Bulan Ini' : formatBulanTahun(selectedYear, selectedMonth)}
              </p>
            </div>
          </div>
          <div className="w-full h-64 relative">
            <canvas ref={chartCanvasRef} id="laporan-monthly-chart" />
          </div>
        </div>
      )}

      {/* Tabel Riwayat Transaksi */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Riwayat Transaksi Penjualan</h3>

        {filteredTransactions.length === 0 ? (
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center mx-auto mb-3">
              <IconAlertCircle size={24} />
            </div>
            <h4 className="text-base font-semibold text-[hsl(var(--foreground))]">Tidak Ada Transaksi</h4>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-sm mx-auto">
              Tidak ada data penjualan pada periode yang Anda pilih.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block border border-[hsl(var(--border))] rounded-[var(--radius)] overflow-hidden shadow-sm bg-[hsl(var(--card))]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[hsl(var(--muted))] text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))] h-11">
                    <th className="px-4">Nomor Struk</th>
                    <th className="px-4">Tanggal & Waktu</th>
                    <th className="px-4 text-center">Metode</th>
                    <th className="px-4 text-right">Total Penjualan</th>
                    <th className="px-4 text-right">Modal Terjual</th>
                    <th className="px-4 text-right">Laba Kotor</th>
                    <th className="px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {filteredTransactions.map((trx) => (
                    <tr key={trx.id} className="h-14 hover:bg-[hsl(var(--muted))] transition text-sm">
                      <td className="px-4 font-mono font-medium text-xs text-[hsl(var(--foreground))]">
                        {trx.nomor}
                      </td>
                      <td className="px-4 text-xs text-[hsl(var(--muted-foreground))]">
                        {formatTanggalWaktu(trx.tanggal)}
                      </td>
                      <td className="px-4 text-center">
                        <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                          {trx.metodePembayaran}
                        </span>
                      </td>
                      <td className="px-4 text-right tabular-nums font-semibold text-[hsl(var(--foreground))]">
                        {formatRupiah(trx.total)}
                      </td>
                      <td className="px-4 text-right tabular-nums text-xs text-[hsl(var(--muted-foreground))]">
                        {formatRupiah(trx.totalModal)}
                      </td>
                      <td className="px-4 text-right tabular-nums font-semibold text-[hsl(var(--success))]">
                        {formatRupiah(trx.labaKotor)}
                      </td>
                      <td className="px-4 text-center">
                        <button
                          type="button"
                          onClick={() => openDetailModal(trx)}
                          className="h-8 px-3 rounded-[var(--radius)] border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--secondary))] transition inline-flex items-center gap-1"
                        >
                          <IconEye size={14} />
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (<1024px) */}
            <div className="lg:hidden space-y-3">
              {filteredTransactions.map((trx) => (
                <div
                  key={trx.id}
                  className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius)] p-4 shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-semibold text-[hsl(var(--foreground))]">
                        {trx.nomor}
                      </span>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {formatTanggalWaktu(trx.tanggal)}
                      </p>
                    </div>
                    <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                      {trx.metodePembayaran}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[hsl(var(--secondary))] p-2.5 rounded-[var(--radius)]">
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Total Penjualan:</span>
                      <p className="font-semibold tabular-nums text-sm text-[hsl(var(--foreground))]">
                        {formatRupiah(trx.total)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--muted-foreground))]">Laba Kotor:</span>
                      <p className="font-semibold tabular-nums text-sm text-[hsl(var(--success))]">
                        {formatRupiah(trx.labaKotor)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => openDetailModal(trx)}
                      className="h-8 px-3 rounded-[var(--radius)] border border-[hsl(var(--border))] text-xs font-medium hover:bg-[hsl(var(--secondary))] transition flex items-center gap-1 w-full justify-center"
                    >
                      <IconEye size={14} />
                      Lihat Rincian Item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Detail Transaksi */}
      {selectedTransaksiDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] rounded-[var(--radius)] p-6 w-full max-w-lg shadow-lg relative max-h-[90vh] overflow-y-auto space-y-4">
            <button
              type="button"
              onClick={() => setSelectedTransaksiDetail(null)}
              className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <IconX size={20} />
            </button>

            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--card-foreground))]">
                Rincian Transaksi
              </h3>
              <p className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                {selectedTransaksiDetail.transaksi.nomor}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-[hsl(var(--secondary))] p-3 rounded-[var(--radius)]">
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Waktu:</span>
                <p className="font-medium text-[hsl(var(--foreground))]">
                  {formatTanggalWaktu(selectedTransaksiDetail.transaksi.tanggal)}
                </p>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))]">Metode Pembayaran:</span>
                <p className="font-medium text-[hsl(var(--foreground))]">
                  {selectedTransaksiDetail.transaksi.metodePembayaran}
                </p>
              </div>
              {selectedTransaksiDetail.transaksi.metodePembayaran === 'Cash' && (
                <>
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Uang Diterima:</span>
                    <p className="font-medium tabular-nums text-[hsl(var(--foreground))]">
                      {formatRupiah(selectedTransaksiDetail.transaksi.bayar)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">Kembalian:</span>
                    <p className="font-medium tabular-nums text-[hsl(var(--success))]">
                      {formatRupiah(selectedTransaksiDetail.transaksi.kembalian)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Item Details Table */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))] mb-2">
                Daftar Barang Dibeli
              </h4>
              <div className="border border-[hsl(var(--border))] rounded-[var(--radius)] overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] h-8">
                      <th className="px-3">Barang</th>
                      <th className="px-2 text-center">Qty</th>
                      <th className="px-2 text-right">Harga Jual</th>
                      <th className="px-2 text-right">Harga Beli</th>
                      <th className="px-2 text-right">Subtotal</th>
                      <th className="px-3 text-right">Laba Item</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {selectedTransaksiDetail.items.map((it) => {
                      const labaItem = (it.hargaJual - it.hargaBeli) * it.qty;
                      return (
                        <tr key={it.id} className="h-10 hover:bg-[hsl(var(--muted))]">
                          <td className="px-3 font-medium text-[hsl(var(--foreground))]">
                            {it.namaProduk}
                          </td>
                          <td className="px-2 text-center tabular-nums">
                            {it.qty}
                          </td>
                          <td className="px-2 text-right tabular-nums text-[hsl(var(--muted-foreground))]">
                            {formatRupiah(it.hargaJual)}
                          </td>
                          <td className="px-2 text-right tabular-nums text-[hsl(var(--muted-foreground))]">
                            {formatRupiah(it.hargaBeli)}
                          </td>
                          <td className="px-2 text-right tabular-nums font-medium text-[hsl(var(--foreground))]">
                            {formatRupiah(it.subtotal)}
                          </td>
                          <td className="px-3 text-right tabular-nums font-semibold text-[hsl(var(--success))]">
                            {formatRupiah(labaItem)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Ringkasan */}
            <div className="border-t border-[hsl(var(--border))] pt-3 space-y-1 text-sm">
              <div className="flex justify-between font-semibold text-[hsl(var(--foreground))]">
                <span>Total Penjualan:</span>
                <span className="tabular-nums">{formatRupiah(selectedTransaksiDetail.transaksi.total)}</span>
              </div>
              <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))]">
                <span>Total Modal Barang:</span>
                <span className="tabular-nums">{formatRupiah(selectedTransaksiDetail.transaksi.totalModal)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-[hsl(var(--success))] pt-1">
                <span>Total Laba Kotor Transaksi:</span>
                <span className="tabular-nums">{formatRupiah(selectedTransaksiDetail.transaksi.labaKotor)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedTransaksiDetail(null)}
                className="h-9 px-4 rounded-[var(--radius)] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] text-xs font-medium hover:bg-[hsl(var(--muted))] transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
