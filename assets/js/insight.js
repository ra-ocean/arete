/* Areté — insight harian.
   Aturan biasa, bukan AI: semuanya dihitung dari data Rausyan sendiri supaya
   selalu bisa ditelusuri. Kalau angkanya belum ada, aturannya diam — lebih baik
   tidak bilang apa-apa daripada mengarang.
   Analisis AI mingguan menyusul kalau datanya sudah cukup tebal. */
window.Insight = (function () {

  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const lastN = (logs, n, field) => logs.slice(-n).map(l => l.value[field]).filter(v => v != null);

  function build(ctx) {
    const { logs, goals, plan, dateKey, wellness } = ctx;
    const out = [];
    const today = logs.find(l => l.key === dateKey);
    const t = today ? today.value : {};
    const days = Math.round((new Date(goals.race_date + 'T00:00:00') - new Date(dateKey + 'T00:00:00')) / 86400000);
    const hour = new Date().getHours();

    /* --- tidur rendah + hari lari kualitas --- */
    const sleep = t.sleep != null ? t.sleep : (lastN(logs, 1, 'sleep')[0] ?? null);
    if (sleep != null && sleep < 6 && plan.day.kind === 'run' && (plan.day.title || '').includes('kualitas')) {
      out.push({ level: 'warn', text:
        `Tidur ${sleep} jam semalam dan hari ini jadwal lari kualitas. Pertimbangkan turunkan intensitas atau geser sesinya — sesi keras dengan tidur kurang menambah beban tanpa menambah adaptasi.` });
    } else if (sleep != null && sleep < 6) {
      out.push({ level: 'warn', text:
        `Tidur ${sleep} jam semalam. Di bawah 6 jam, pemulihan otot dan tendon melambat — kalau hari ini berat, turunkan satu tingkat.` });
    } else if (sleep != null && sleep < (goals.sleep_target_h || 7) - 0.5) {
      out.push({ level: 'info', text:
        `Tidur ${sleep} jam, target ${goals.sleep_target_h || 7} jam. Belum mengkhawatirkan, tapi kalau berlanjut beberapa hari efeknya menumpuk di pemulihan.` });
    }

    /* --- form dari intervals.icu --- */
    if (wellness && wellness.length) {
      const w = wellness[wellness.length - 1];
      if (w.form != null && w.form < -20) {
        out.push({ level: 'warn', text:
          `Form kamu ${w.form} (CTL ${Math.round(w.ctl)}, ATL ${Math.round(w.atl)}). Di bawah −20 artinya beban akut jauh di atas kapasitas — ini zona rawan cedera, bukan zona adaptasi.` });
      } else if (w.form != null && w.form > 5 && days != null && days <= 7 && days >= 0) {
        out.push({ level: 'good', text:
          `Form ${w.form} menjelang lomba. Taper-nya jalan — kamu masuk race dalam kondisi segar.` });
      }
    }

    /* --- protein --- */
    const prot = lastN(logs, 5, 'protein');
    if (prot.length >= 3) {
      const m = avg(prot), target = goals.protein_target_g;
      if (m < target * 0.85) {
        out.push({ level: 'warn', text:
          `Protein ${prot.length} hari terakhir rata-rata ${Math.round(m)} g dari target ${target} g — kurang ${Math.round(target - m)} g per hari. Ini pengungkit terbesar buat mempertahankan otot sambil defisit.` });
      } else if (m >= target) {
        out.push({ level: 'good', text:
          `Protein rata-rata ${Math.round(m)} g, di atas target ${target} g. Pertahankan.` });
      } else {
        out.push({ level: 'info', text:
          `Protein rata-rata ${Math.round(m)} g, kurang ${Math.round(target - m)} g dari target ${target} g. Sudah dekat — satu porsi telur atau whey menutup sisanya.` });
      }
    }

    /* --- berat vs defisit --- */
    const w14 = logs.slice(-14).filter(l => l.value.weight != null);
    const cal = lastN(logs, 7, 'cal');
    if (w14.length >= 6 && cal.length >= 4) {
      const first = avg(w14.slice(0, 3).map(l => l.value.weight));
      const last = avg(w14.slice(-3).map(l => l.value.weight));
      const dw = last - first;
      const mCal = avg(cal);
      if (Math.abs(dw) < 0.3 && mCal < goals.tdee_low) {
        out.push({ level: 'info', text:
          `Berat praktis datar (${dw >= 0 ? '+' : ''}${dw.toFixed(1)} kg dalam 2 minggu) padahal asupan tercatat ${Math.round(mCal)} kkal, di bawah estimasi TDEE ${goals.tdee_low}. Penyebab paling umum bukan metabolisme melambat, tapi ada kalori yang tidak tercatat. Coba timbang porsi 3 hari untuk mengecek.` });
      } else if (dw <= -0.4) {
        out.push({ level: 'good', text:
          `Berat turun ${Math.abs(dw).toFixed(1)} kg dalam 2 minggu — laju yang pas untuk menjaga otot.` });
      }
    }

    /* --- daily track belum dikerjakan --- */
    const dd = t.daily || {};
    const undone = ['abs', 'calf', 'hip'].filter(k => !dd[k]);
    if (hour >= 15 && undone.length === 3) {
      out.push({ level: 'info', text:
        `Daily-track hari ini belum dicentang. Abs, calf, dan hip totalnya 15–20 menit — bagian ini yang menggerakkan Shock Absorption dan Landing Control di Stryd.` });
    } else if (undone.length === 0 && (t.daily_at || hour >= 6)) {
      out.push({ level: 'good', text: 'Daily-track hari ini selesai semua.' });
    }

    /* --- hitung mundur lomba --- */
    if (days != null && days >= 0 && days <= 21) {
      out.push({ level: 'info', text: days === 0
        ? 'Hari lomba. Tidak ada lagi yang bisa ditambah hari ini — yang ada tinggal dijalankan.'
        : `${days} hari ke 10K pertama. ${days <= 7 ? 'Minggu taper: volume turun, intensitas dijaga, beban ST berat dihentikan.' : 'Beban ST berat masih boleh sampai H-7.'}` });
    }

    /* --- tidak mencatat --- */
    if (logs.length) {
      const gap = Math.round((new Date(dateKey + 'T00:00:00') - new Date(logs[logs.length - 1].key + 'T00:00:00')) / 86400000);
      if (gap >= 3) out.push({ level: 'info', text:
        `Sudah ${gap} hari tidak ada catatan. Tidak apa-apa — isi hari ini saja, tidak perlu mengejar yang bolong.` });
    }

    /* --- foto mingguan --- */
    if (ctx.lastPhotoDays != null && ctx.lastPhotoDays >= 7) {
      out.push({ level: 'info', text:
        `Foto progress terakhir ${ctx.lastPhotoDays} hari lalu. Ambil yang baru — perubahan komposisi tubuh lebih jujur terlihat di foto daripada di timbangan.` });
    }

    /* Kartu insight tidak boleh pernah kosong — kartu kosong mengajarkan mata
       untuk melewatinya. Kalau tidak ada aturan yang menyala, katakan itu. */
    if (!out.length) {
      const punya = logs.length;
      out.push(punya < 5
        ? { level: 'info', text: `Baru ${punya} catatan. Setelah sekitar seminggu, bagian ini mulai bisa membandingkan tren dan memberi arahan yang berarti.` }
        : { level: 'good', text: 'Tidak ada yang menonjol dari data beberapa hari terakhir. Jalankan rencana hari ini seperti biasa.' });
    }

    const order = { warn: 0, info: 1, good: 2 };
    out.sort((a, b) => order[a.level] - order[b.level]);
    return out;
  }

  return { build };
})();
