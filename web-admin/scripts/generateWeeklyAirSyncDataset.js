const fs = require('fs');
const path = require('path');

function getWeekCodeFromDate(dateStr) {
  if (!dateStr) return null;
  const d = dateStr.slice(0, 10);
  if (d <= '2026-10-01') return 'W40';
  if (d >= '2026-10-02' && d <= '2026-10-08') return 'W41';
  if (d >= '2026-10-09' && d <= '2026-10-15') return 'W42';
  if (d >= '2026-10-16' && d <= '2026-10-22') return 'W43';
  if (d >= '2026-10-23' && d <= '2026-10-29') return 'W44';
  if (d >= '2026-10-30') return 'W45';
  return null;
}

function diffDays(dateRealStr, datePlanStr) {
  if (!dateRealStr || !datePlanStr) return null;
  const d1 = new Date(dateRealStr.slice(0, 10) + 'T00:00:00Z');
  const d2 = new Date(datePlanStr.slice(0, 10) + 'T00:00:00Z');
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

function generate() {
  const rootDir = path.resolve(__dirname, '../..');
  const raw = JSON.parse(fs.readFileSync(path.join(rootDir, 'real_plan_extracted_data.json'), 'utf8'));
  const actOct = JSON.parse(fs.readFileSync(path.join(rootDir, 'actual_booking_oct_2026.json'), 'utf8'));
  const audit = JSON.parse(fs.readFileSync(path.join(rootDir, 'audit_data_raw.json'), 'utf8'));
  const actPlan = JSON.parse(fs.readFileSync(path.join(rootDir, 'actual_vs_plan_b2c.json'), 'utf8'));

  const ordMap = new Map(Object.entries(audit.order_records || {}).map(([, v]) => [v.store_raw.toLowerCase().trim(), v]));
  const actMap = new Map(actPlan.map(x => [x.store.toLowerCase().trim(), x]));

  // Merge File 3.2 records (plan + air)
  const recordMap = new Map();
  (actOct.records_oct_plan || []).forEach(r => {
    if (r.code) recordMap.set(r.code, { ...r, sourceScope: 'OCT_PLAN' });
  });
  (actOct.records_oct_air || []).forEach(r => {
    if (r.code) {
      const ex = recordMap.get(r.code);
      recordMap.set(r.code, ex ? { ...ex, ...r, sourceScope: 'BOTH' } : { ...r, sourceScope: 'OCT_AIR' });
    }
  });
  const allRecords32 = Array.from(recordMap.values());

  const WEEK_META = [
    { code: 'W40', label: 'W40 [25/09 - 01/10]', shortLabel: 'Tuần 40 (Mở màn)', dateRange: '25/09 – 01/10', waveTheme: 'Mở màn đầu tháng 10' },
    { code: 'W41', label: 'W41 [02/10 - 08/10]', shortLabel: 'Tuần 41 (Đà 10.10)', dateRange: '02/10 – 08/10', waveTheme: 'Chạy đà Pre-Mega Sale 10.10' },
    { code: 'W42', label: 'W42 [09/10 - 15/10]', shortLabel: 'Tuần 42 (Đỉnh 10.10)', dateRange: '09/10 – 15/10', waveTheme: 'Đỉnh sóng Mega Sale 10.10 & Mid-Month' },
    { code: 'W43', label: 'W43 [16/10 - 22/10]', shortLabel: 'Tuần 43 (Duy trì)', dateRange: '16/10 – 22/10', waveTheme: 'Sóng giữ nhịp & Đẩy SKU chủ lực' },
    { code: 'W44', label: 'W44 [23/10 - 29/10]', shortLabel: 'Tuần 44 (Payday 25.10)', dateRange: '23/10 – 29/10', waveTheme: 'Sóng Payday 25.10 & Về đích tháng' },
    { code: 'W45', label: 'W45 [30/10 - 05/11]', shortLabel: 'Tuần 45 (Đón 11.11)', dateRange: '30/10 – 05/11', waveTheme: 'Gối đầu Pre-Mega Sale 11.11' },
  ];

  // Daily pulse across Oct 01 -> Oct 31
  const dailyPulseMap = {};
  for (let d = 1; d <= 31; d++) {
    const dateStr = `2026-10-${String(d).padStart(2, '0')}`;
    const wk = getWeekCodeFromDate(dateStr) || 'W45';
    let campaignTag = '';
    if (d === 1) campaignTag = 'Mở màn T10';
    else if (d >= 6 && d <= 8) campaignTag = 'Gom sóng Pre-10.10';
    else if (d === 9) campaignTag = 'Đỉnh D-1 Mega Sale 10.10';
    else if (d === 10) campaignTag = 'Mega Sale 10.10';
    else if (d === 15) campaignTag = 'Sale Giữa Tháng 15.10';
    else if (d === 25) campaignTag = 'Lương Về Payday 25.10';
    else if (d >= 29) campaignTag = 'Gom sóng Pre-11.11';

    dailyPulseMap[dateStr] = {
      date: dateStr,
      dayLabel: `${String(d).padStart(2, '0')}/10`,
      weekCode: wk,
      campaignTag,
      isWaveWindow: (d === 1) || (d >= 6 && d <= 10) || (d === 15) || (d === 25) || (d >= 29),
      plannedCount: 0,
      actualCount: 0,
      onTimeCount: 0,
      earlyCount: 0,
      lateSpilloverCount: 0,
      unscheduledCount: 0,
      pendingOnThisPlanDay: 0,
      totalCostActual: 0,
      topStoresOnDay: {},
    };
  }

  // Build store-level weekly plan & actual synchronization records for all 69 B2C stores
  const storeSyncList = [];

  raw.stores41.forEach((s, idx) => {
    const stName = s.storeName;
    const stKey = stName.toLowerCase().trim();
    const det = raw.detailed411ByStore[stName] || [];
    const ord = ordMap.get(stKey);
    const act = actMap.get(stKey);

    const hasLeader = det.length > 0 && String(det[0].leader || '').trim() === 'Nguyễn Thị Ngọc Tâm';
    const leaderName = hasLeader ? 'Nguyễn Thị Ngọc Tâm' : undefined;
    let pic = 'Chưa phân công';
    if (det.length > 0 && det[0].pic) {
      const lines = det[0].pic.split('\n').map(p => p.trim()).filter(Boolean);
      if (lines.length > 0) pic = lines[0];
    } else if (s.bookingPic && s.bookingPic !== 'Chưa gán') {
      const lines = s.bookingPic.split('\n').map(p => p.trim()).filter(Boolean);
      if (lines.length > 0) pic = lines[0];
    }
    const platform = s.channel.toLowerCase().includes('shopee') ? 'Shopee Mall' : 'TikTok Shop';

    // Initialize weekly buckets for this store
    const weeksMap = {};
    WEEK_META.forEach(wm => {
      weeksMap[wm.code] = {
        weekCode: wm.code,
        planPaidVideos: 0,
        planFocVideos: 0,
        planSelfVideos: 0,
        planCoreVideos: 0, // Paid + Self (excluding FOC 0đ mass samples)
        planTotalVideos: 0,
        planBudget: 0,
        bookedPlannedInWeek: 0,
        actualAiredInWeek: 0,
        onTimeInWeek: 0,
        lateInWeek: 0,
        earlyInWeek: 0,
        unscheduledInWeek: 0,
        pendingInWeek: 0,
      };
    });

    const has411Breakdown = det.length > 0;
    if (has411Breakdown) {
      det.forEach(w => {
        const wkCode = (w.week || '').split(' ')[0];
        if (!weeksMap[wkCode]) return;
        const paid = (w.kl1 || 0) + (w.kl2 || 0) + (w.kl3 || 0) + (w.kl4 || 0) + (w.kl5 || 0) + (w.kl6 || 0) + (w.kl7 || 0) + (w.shopeeAff || 0) + (w.fbAff || 0) + (w.insAff || 0) + (w.threadsAff || 0);
        const foc = (w.tapUpAff || 0);
        const self = (w.selfQty || 0);
        const budget = Math.round((w.affBudget || 0) + (w.selfBudget || 0) + (w.shopeeBudget || 0) + (w.fbBudget || 0));

        weeksMap[wkCode].planPaidVideos += paid;
        weeksMap[wkCode].planFocVideos += foc;
        weeksMap[wkCode].planSelfVideos += self;
        weeksMap[wkCode].planCoreVideos += paid + self;
        weeksMap[wkCode].planTotalVideos += paid + foc + self;
        weeksMap[wkCode].planBudget += budget;
      });
    } else {
      // Fallback distribution across W41-W44 if store only exists in 4.1 macro plan
      const macroAff = s.affVideos || 0;
      const macroFoc = s.tap || 0;
      const macroPaid = Math.max(0, macroAff - macroFoc);
      const macroSelf = s.selfVideos || 0;
      const weights = [
        { wk: 'W41', ratio: 0.30 },
        { wk: 'W42', ratio: 0.35 },
        { wk: 'W43', ratio: 0.20 },
        { wk: 'W44', ratio: 0.15 },
      ];
      weights.forEach(({ wk, ratio }) => {
        const p = Math.round(macroPaid * ratio);
        const f = Math.round(macroFoc * ratio);
        const sf = Math.round(macroSelf * ratio);
        weeksMap[wk].planPaidVideos += p;
        weeksMap[wk].planFocVideos += f;
        weeksMap[wk].planSelfVideos += sf;
        weeksMap[wk].planCoreVideos += p + sf;
        weeksMap[wk].planTotalVideos += p + f + sf;
        weeksMap[wk].planBudget += Math.round((s.totalBudget || 0) * ratio);
      });
    }

    // Match 3.2 booking records for this store
    const storeRecs = allRecords32.filter(r => (r.store || '').toLowerCase().trim() === stKey);

    let totalBooked = storeRecs.length;
    let totalAired = 0;
    let onTimeCount = 0;
    let earlyCount = 0;
    let lateCount = 0;
    let unscheduledCount = 0;
    let pendingCount = 0;
    let totalDelayDaysSum = 0;
    let delayedItemsCount = 0;

    const realDayMap = {};
    const planDayMap = {};
    const detailedDeals = [];

    storeRecs.forEach(r => {
      const pd = (r.p_air_date || '').slice(0, 10);
      const ad = (r.air_date_real || '').slice(0, 10);
      const pw = getWeekCodeFromDate(pd);
      const aw = ((r.week_real || '').split(' ')[0]) || getWeekCodeFromDate(ad);
      const deltaDays = diffDays(ad, pd);

      let syncTimingStatus = 'NOT_AIRED';
      if (!ad) {
        syncTimingStatus = 'NOT_AIRED';
        pendingCount++;
        if (pw && weeksMap[pw]) {
          weeksMap[pw].bookedPlannedInWeek++;
          weeksMap[pw].pendingInWeek++;
        }
        if (pd && dailyPulseMap[pd]) {
          dailyPulseMap[pd].plannedCount++;
          dailyPulseMap[pd].pendingOnThisPlanDay++;
        }
        if (pd) planDayMap[pd] = (planDayMap[pd] || 0) + 1;
      } else {
        totalAired++;
        realDayMap[ad] = (realDayMap[ad] || 0) + 1;
        if (pd) planDayMap[pd] = (planDayMap[pd] || 0) + 1;

        if (pw && weeksMap[pw]) {
          weeksMap[pw].bookedPlannedInWeek++;
        }

        if (!pd) {
          syncTimingStatus = 'UNSCHEDULED_AIR';
          unscheduledCount++;
          if (aw && weeksMap[aw]) {
            weeksMap[aw].actualAiredInWeek++;
            weeksMap[aw].unscheduledInWeek++;
          }
          if (dailyPulseMap[ad]) {
            dailyPulseMap[ad].actualCount++;
            dailyPulseMap[ad].unscheduledCount++;
            dailyPulseMap[ad].totalCostActual += Math.round(r.cost || 0);
            dailyPulseMap[ad].topStoresOnDay[stName] = (dailyPulseMap[ad].topStoresOnDay[stName] || 0) + 1;
          }
        } else {
          if (dailyPulseMap[pd]) {
            dailyPulseMap[pd].plannedCount++;
          }
          if (ad === pd) {
            syncTimingStatus = 'ON_TIME';
            onTimeCount++;
            if (aw && weeksMap[aw]) {
              weeksMap[aw].actualAiredInWeek++;
              weeksMap[aw].onTimeInWeek++;
            }
            if (dailyPulseMap[ad]) {
              dailyPulseMap[ad].actualCount++;
              dailyPulseMap[ad].onTimeCount++;
              dailyPulseMap[ad].totalCostActual += Math.round(r.cost || 0);
              dailyPulseMap[ad].topStoresOnDay[stName] = (dailyPulseMap[ad].topStoresOnDay[stName] || 0) + 1;
            }
          } else if (ad < pd) {
            syncTimingStatus = 'EARLY';
            earlyCount++;
            if (aw && weeksMap[aw]) {
              weeksMap[aw].actualAiredInWeek++;
              weeksMap[aw].earlyInWeek++;
            }
            if (dailyPulseMap[ad]) {
              dailyPulseMap[ad].actualCount++;
              dailyPulseMap[ad].earlyCount++;
              dailyPulseMap[ad].totalCostActual += Math.round(r.cost || 0);
              dailyPulseMap[ad].topStoresOnDay[stName] = (dailyPulseMap[ad].topStoresOnDay[stName] || 0) + 1;
            }
          } else {
            syncTimingStatus = 'LATE';
            lateCount++;
            if (deltaDays && deltaDays > 0) {
              totalDelayDaysSum += deltaDays;
              delayedItemsCount++;
            }
            if (aw && weeksMap[aw]) {
              weeksMap[aw].actualAiredInWeek++;
              weeksMap[aw].lateInWeek++;
            }
            if (dailyPulseMap[ad]) {
              dailyPulseMap[ad].actualCount++;
              dailyPulseMap[ad].lateSpilloverCount++;
              dailyPulseMap[ad].totalCostActual += Math.round(r.cost || 0);
              dailyPulseMap[ad].topStoresOnDay[stName] = (dailyPulseMap[ad].topStoresOnDay[stName] || 0) + 1;
            }
          }
        }
      }

      detailedDeals.push({
        code: r.code,
        channelId: r.channel_id || 'Chưa gắn kênh',
        productName: r.product || 'Sản phẩm chủ lực',
        pic: r.pic || pic,
        kl: r.kl || (r.cost === 0 ? 'TAP UpAffiliate' : 'KL2'),
        format: r.format || 'Booking Video KOC',
        videoType: r.video_type || 'Review Voice',
        cost: Math.round(r.cost || 0),
        plannedAirDate: pd || '',
        plannedWeek: pw || '',
        actualAirDate: ad || '',
        actualWeek: aw || '',
        dayDelta: deltaDays,
        syncTimingStatus,
        pipeline: r.pipeline || 'Đang xử lý',
        linkAir: r.link_air || '',
      });
    });

    // Peak day & Top 3-day burst concentration
    const sortedRealDays = Object.entries(realDayMap).sort((a, b) => b[1] - a[1]);
    const sortedPlanDays = Object.entries(planDayMap).sort((a, b) => b[1] - a[1]);

    const peakActualDate = sortedRealDays[0] ? sortedRealDays[0][0] : '';
    const peakActualCount = sortedRealDays[0] ? sortedRealDays[0][1] : 0;
    const top3DaysActualCount = sortedRealDays.slice(0, 3).reduce((sum, item) => sum + item[1], 0);
    const top3BurstDates = sortedRealDays.slice(0, 3).map(([d, c]) => `${d.slice(8, 10)}/10 (${c})`);

    const peakPlannedDate = sortedPlanDays[0] ? sortedPlanDays[0][0] : '';
    const peakPlannedCount = sortedPlanDays[0] ? sortedPlanDays[0][1] : 0;

    // Burst Concentration % (share of aired videos concentrated in top 3 peak days)
    const burstConcentrationPct = totalAired > 0 ? Math.round((top3DaysActualCount / totalAired) * 100) : 0;

    // Schedule Sync Rate % (among aired videos with a planned date, or overall aired)
    const scheduledAiredCount = onTimeCount + earlyCount + lateCount;
    const scheduleAdherencePct = scheduledAiredCount > 0
      ? Math.round(((onTimeCount + earlyCount) / scheduledAiredCount) * 100)
      : 0;
    const fullPlanCoveragePct = totalAired > 0
      ? Math.round((scheduledAiredCount / totalAired) * 100)
      : 0;

    const avgDelayDays = delayedItemsCount > 0 ? Number((totalDelayDaysSum / delayedItemsCount).toFixed(1)) : 0;

    // Classify Synchronized Airing Status ("Có air đồng loạt hay không")
    // 1. AIR_SYNCHRONIZED: Good volume aired, high schedule adherence (>=70%), good wave burst, low pending bottleneck
    // 2. AIR_BURST_UNSCHEDULED: High actual airing & burst concentration, but >45% of aired videos had no p_air_date recorded
    // 3. AIR_FRAGMENTED_LATE: Had planned wave, but significant late slippage (lateCount >= 4 or scheduleAdherencePct < 65%)
    // 4. AIR_BOTTLENECK_PENDING: Planned videos in W41-W42 or booked deals, but < 45% aired or 0 aired
    // 5. NO_WAVE_TARGET: Store has 0 planned core videos and 0 booked videos in W40-W42
    const w40To42PlanCore = weeksMap.W40.planCoreVideos + weeksMap.W41.planCoreVideos + weeksMap.W42.planCoreVideos;
    const w40To42ActualAir = weeksMap.W40.actualAiredInWeek + weeksMap.W41.actualAiredInWeek + weeksMap.W42.actualAiredInWeek;

    let syncStatus = 'NO_WAVE_TARGET';
    let syncDiagnosis = 'Không có lịch cam kết Air video trả phí trong nửa đầu tháng 10.';

    if (totalBooked === 0 && w40To42PlanCore === 0) {
      syncStatus = 'NO_WAVE_TARGET';
      syncDiagnosis = 'Gian hàng không giao chỉ tiêu Air video trả phí trong W40–W42.';
    } else if (totalAired === 0 || (totalBooked >= 8 && totalAired / totalBooked < 0.45)) {
      syncStatus = 'AIR_BOTTLENECK_PENDING';
      if (totalBooked > 0) {
        syncDiagnosis = `Nghẽn sóng: Đã book ${totalBooked} đơn nhưng mới Air ${totalAired} video (còn ${pendingCount} đơn kẹt chưa lên sóng).`;
      } else {
        syncDiagnosis = `Chưa lên sóng: Kế hoạch W41–W42 giao ${w40To42PlanCore} video (Paid + Kênh Brand) nhưng thực tế 0 video Air.`;
      }
    } else if (lateCount >= 4 && scheduleAdherencePct < 65) {
      syncStatus = 'AIR_FRAGMENTED_LATE';
      syncDiagnosis = `Vỡ lịch đồng loạt: Kế hoạch gom đỉnh ${peakPlannedDate ? peakPlannedDate.slice(8, 10) + '/10 (' + peakPlannedCount + ' video)' : 'đầu tuần'}, nhưng trễ hạn ${lateCount}/${totalAired} video (trễ TB ${avgDelayDays} ngày), bị rải vụn sang nhiều ngày.`;
    } else if (unscheduledCount > totalAired * 0.45) {
      syncStatus = 'AIR_BURST_UNSCHEDULED';
      syncDiagnosis = `Có gom cụm (${top3DaysActualCount}/${totalAired} video nổ vào ${top3BurstDates.join(', ')}) nhưng ${unscheduledCount}/${totalAired} đơn thiếu Ngày dự kiến Air trên kế hoạch.`;
    } else {
      syncStatus = 'AIR_SYNCHRONIZED';
      syncDiagnosis = `Air đồng loạt chuẩn nhịp: Đạt ${scheduleAdherencePct}% khớp lịch cam kết (${onTimeCount + earlyCount}/${scheduledAiredCount} video), tụ sóng đỉnh ${peakActualDate ? peakActualDate.slice(8, 10) + '/10 (' + peakActualCount + ' video)' : ''}.`;
    }

    const totalPlanPaidMonth = Object.values(weeksMap).reduce((acc, w) => acc + w.planPaidVideos, 0);
    const totalPlanFocMonth = Object.values(weeksMap).reduce((acc, w) => acc + w.planFocVideos, 0);
    const totalPlanSelfMonth = Object.values(weeksMap).reduce((acc, w) => acc + w.planSelfVideos, 0);
    const totalPlanCoreMonth = totalPlanPaidMonth + totalPlanSelfMonth;

    storeSyncList.push({
      storeId: `store-b2c-${idx + 1}`,
      storeName: stName,
      brandName: s.brandName || stName.split('_')[0],
      platform,
      pic,
      hasLeader,
      leaderName,
      has411Breakdown,
      budgetNet: act && typeof act.order_net === 'number' ? Math.round(act.order_net) : Math.round((ord ? (ord.aff_budget_net || 0) + (ord.self_budget_net || 0) : (s.totalBudget || 0) * 0.8418)),
      actualSpentNet: act ? Math.round(act.actual_cost || 0) : 0,
      totalPlanPaidMonth,
      totalPlanFocMonth,
      totalPlanSelfMonth,
      totalPlanCoreMonth,
      w40To42PlanCore,
      w40To42ActualAir,
      totalBooked,
      totalAired,
      onTimeCount,
      earlyCount,
      lateCount,
      unscheduledCount,
      pendingCount,
      burstConcentrationPct,
      scheduleAdherencePct,
      fullPlanCoveragePct,
      avgDelayDays,
      peakActualDate,
      peakActualCount,
      peakPlannedDate,
      peakPlannedCount,
      top3BurstDates,
      syncStatus,
      syncDiagnosis,
      weeks: WEEK_META.map(wm => weeksMap[wm.code]),
      deals: detailedDeals.sort((a, b) => (b.actualAirDate || b.plannedAirDate).localeCompare(a.actualAirDate || a.plannedAirDate)),
    });
  });

  // Sort storeSyncList so stores with highest activity (booked + planned core) appear first
  storeSyncList.sort((a, b) => (b.totalBooked * 3 + b.w40To42PlanCore) - (a.totalBooked * 3 + a.w40To42PlanCore));

  // Build Macro Weekly Summary across all 69 B2C stores
  const weeklyMacroSummary = WEEK_META.map(wm => {
    let planPaidVideos = 0;
    let planFocVideos = 0;
    let planSelfVideos = 0;
    let planCoreVideos = 0;
    let planTotalVideos = 0;
    let bookedPlannedInWeek = 0;
    let actualAiredInWeek = 0;
    let onTimeInWeek = 0;
    let earlyInWeek = 0;
    let lateInWeek = 0;
    let unscheduledInWeek = 0;
    let pendingInWeek = 0;
    let activeStoresCount = 0;

    storeSyncList.forEach(st => {
      const w = st.weeks.find(x => x.weekCode === wm.code);
      if (!w) return;
      planPaidVideos += w.planPaidVideos;
      planFocVideos += w.planFocVideos;
      planSelfVideos += w.planSelfVideos;
      planCoreVideos += w.planCoreVideos;
      planTotalVideos += w.planTotalVideos;
      bookedPlannedInWeek += w.bookedPlannedInWeek;
      actualAiredInWeek += w.actualAiredInWeek;
      onTimeInWeek += w.onTimeInWeek;
      earlyInWeek += w.earlyInWeek;
      lateInWeek += w.lateInWeek;
      unscheduledInWeek += w.unscheduledInWeek;
      pendingInWeek += w.pendingInWeek;
      if (w.planCoreVideos > 0 || w.actualAiredInWeek > 0 || w.bookedPlannedInWeek > 0) {
        activeStoresCount++;
      }
    });

    return {
      ...wm,
      planPaidVideos,
      planFocVideos,
      planSelfVideos,
      planCoreVideos,
      planTotalVideos,
      bookedPlannedInWeek,
      actualAiredInWeek,
      onTimeInWeek,
      earlyInWeek,
      lateInWeek,
      unscheduledInWeek,
      pendingInWeek,
      activeStoresCount,
    };
  });

  // Format daily pulse list
  const dailyPulseList = Object.values(dailyPulseMap).map(d => {
    const topStores = Object.entries(d.topStoresOnDay)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, cnt]) => ({ storeName: name, count: cnt }));
    return {
      date: d.date,
      dayLabel: d.dayLabel,
      weekCode: d.weekCode,
      campaignTag: d.campaignTag,
      isWaveWindow: d.isWaveWindow,
      plannedCount: d.plannedCount,
      actualCount: d.actualCount,
      onTimeCount: d.onTimeCount,
      earlyCount: d.earlyCount,
      lateSpilloverCount: d.lateSpilloverCount,
      unscheduledCount: d.unscheduledCount,
      pendingOnThisPlanDay: d.pendingOnThisPlanDay,
      totalCostActual: d.totalCostActual,
      topStores,
    };
  });

  // Summary counts by syncStatus
  const statusCounts = {
    AIR_SYNCHRONIZED: storeSyncList.filter(s => s.syncStatus === 'AIR_SYNCHRONIZED').length,
    AIR_BURST_UNSCHEDULED: storeSyncList.filter(s => s.syncStatus === 'AIR_BURST_UNSCHEDULED').length,
    AIR_FRAGMENTED_LATE: storeSyncList.filter(s => s.syncStatus === 'AIR_FRAGMENTED_LATE').length,
    AIR_BOTTLENECK_PENDING: storeSyncList.filter(s => s.syncStatus === 'AIR_BOTTLENECK_PENDING').length,
    NO_WAVE_TARGET: storeSyncList.filter(s => s.syncStatus === 'NO_WAVE_TARGET').length,
  };

  console.log('Weekly Macro Summary:', weeklyMacroSummary);
  console.log('Store Sync Status Counts:', statusCounts);

  const outPath = path.resolve(__dirname, '../src/lib/b2cWeeklyAirSyncDataset.ts');
  const fileContent = `// =========================================================================
// DỮ LIỆU ĐỐI SOÁT LỊCH AIR KẾ HOẠCH THEO TUẦN (W40-W45) & CHỈ SỐ AIR ĐỒNG LOẠT
// Nguồn tích hợp:
// 1. File 4.1 Plan order tổng (69 gian hàng B2C phụ trách = 1)
// 2. File 4.1.1 Input plan tuần (Phân rã lịch kế hoạch W40 -> W45 theo Paid KOC, FOC, Kênh Brand)
// 3. File 3.2 List duyệt book (746 đơn booking thuộc 69 gian B2C: Ngày dự kiến Air p_air_date vs Ngày thực tế Air air_date_real)
// =========================================================================

export type StoreAirSyncStatus =
  | 'AIR_SYNCHRONIZED'
  | 'AIR_BURST_UNSCHEDULED'
  | 'AIR_FRAGMENTED_LATE'
  | 'AIR_BOTTLENECK_PENDING'
  | 'NO_WAVE_TARGET';

export type DealAirTimingStatus =
  | 'ON_TIME'
  | 'EARLY'
  | 'LATE'
  | 'UNSCHEDULED_AIR'
  | 'NOT_AIRED';

export interface WeeklyAirBucket {
  weekCode: string;
  planPaidVideos: number;
  planFocVideos: number;
  planSelfVideos: number;
  planCoreVideos: number;
  planTotalVideos: number;
  planBudget: number;
  bookedPlannedInWeek: number;
  actualAiredInWeek: number;
  onTimeInWeek: number;
  lateInWeek: number;
  earlyInWeek: number;
  unscheduledInWeek: number;
  pendingInWeek: number;
}

export interface WeeklyMacroAirRecord extends WeeklyAirBucket {
  label: string;
  shortLabel: string;
  dateRange: string;
  waveTheme: string;
  activeStoresCount: number;
}

export interface DailyAirPulseRecord {
  date: string;
  dayLabel: string;
  weekCode: string;
  campaignTag: string;
  isWaveWindow: boolean;
  plannedCount: number;
  actualCount: number;
  onTimeCount: number;
  earlyCount: number;
  lateSpilloverCount: number;
  unscheduledCount: number;
  pendingOnThisPlanDay: number;
  totalCostActual: number;
  topStores: { storeName: string; count: number }[];
}

export interface StoreAirDealRecord {
  code: string;
  channelId: string;
  productName: string;
  pic: string;
  kl: string;
  format: string;
  videoType: string;
  cost: number;
  plannedAirDate: string;
  plannedWeek: string;
  actualAirDate: string;
  actualWeek: string;
  dayDelta: number | null;
  syncTimingStatus: DealAirTimingStatus;
  pipeline: string;
  linkAir: string;
}

export interface StoreWeeklyAirSyncRecord {
  storeId: string;
  storeName: string;
  brandName: string;
  platform: 'TikTok Shop' | 'Shopee Mall';
  pic: string;
  hasLeader: boolean;
  leaderName?: string;
  has411Breakdown: boolean;
  budgetNet: number;
  actualSpentNet: number;
  totalPlanPaidMonth: number;
  totalPlanFocMonth: number;
  totalPlanSelfMonth: number;
  totalPlanCoreMonth: number;
  w40To42PlanCore: number;
  w40To42ActualAir: number;
  totalBooked: number;
  totalAired: number;
  onTimeCount: number;
  earlyCount: number;
  lateCount: number;
  unscheduledCount: number;
  pendingCount: number;
  burstConcentrationPct: number;
  scheduleAdherencePct: number;
  fullPlanCoveragePct: number;
  avgDelayDays: number;
  peakActualDate: string;
  peakActualCount: number;
  peakPlannedDate: string;
  peakPlannedCount: number;
  top3BurstDates: string[];
  syncStatus: StoreAirSyncStatus;
  syncDiagnosis: string;
  weeks: WeeklyAirBucket[];
  deals: StoreAirDealRecord[];
}

export const B2C_WEEKLY_MACRO_AIR_SUMMARY: WeeklyMacroAirRecord[] = ${JSON.stringify(weeklyMacroSummary, null, 2)};

export const B2C_DAILY_AIR_PULSE_OCT_2026: DailyAirPulseRecord[] = ${JSON.stringify(dailyPulseList, null, 2)};

export const B2C_STORE_WEEKLY_AIR_SYNC_LIST: StoreWeeklyAirSyncRecord[] = ${JSON.stringify(storeSyncList, null, 2)};
`;

  fs.writeFileSync(outPath, fileContent, 'utf8');
  console.log('Successfully generated src/lib/b2cWeeklyAirSyncDataset.ts!');
}

generate();
