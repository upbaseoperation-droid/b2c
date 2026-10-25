import { EMPTY_DEAL_BOARD, sanitizeDealBoard, syncDealSummaryFields, type DealBoardData } from '../dealBoardRules';
import { isPersonInField, type StaffCodeMap } from '../staffIdentity';
import { dealBoardKey } from './boardKeys';
import { readRecord, RecordError, updateRecord } from './sharedRecords';

/**
 * Chuyển deal / Job của một người sang người khác trên các kế hoạch cho trước.
 * Chỉ Job còn đang làm và chưa đề nghị thanh toán; Job đã đề nghị / đã chi giữ người cũ để tất toán.
 * Người gọi tự kiểm quyền.
 */
export async function transferDealOwner(opts: {
  planIds: string[];
  fromPic: string;
  toPic: string;
  actorName: string;
  storeCodes?: StaffCodeMap;
}): Promise<number> {
  const isFrom = (name?: string) => isPersonInField({ id: '', name: opts.fromPic }, name, opts.storeCodes);
  let transferred = 0;
  for (const planId of opts.planIds) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const rec = await readRecord<DealBoardData>(dealBoardKey(planId), EMPTY_DEAL_BOARD);
      let count = 0;
      try {
        await updateRecord<DealBoardData>(dealBoardKey(planId), EMPTY_DEAL_BOARD, rec.revision, prev => {
          const board = sanitizeDealBoard(prev);
          const nowIso = new Date().toISOString();
          return {
            ...board,
            deals: board.deals.map(d => {
              let changed = false;
              const jobs = (d.jobs || []).map(j => {
                const owned = isFrom(j.pic) || (!j.pic?.trim() && isFrom(d.pic));
                if (!owned || j.payment.status !== 'NONE' || (j.lifecycleStatus && j.lifecycleStatus !== 'ACTIVE')) return j;
                changed = true;
                count++;
                return { ...j, pic: opts.toPic };
              });
              if (!changed) return d;
              return syncDealSummaryFields({
                ...d,
                pic: isFrom(d.pic) ? opts.toPic : d.pic,
                jobs,
                history: [...(d.history || []), { at: nowIso, actor: opts.actorName, text: `Chuyển deal từ ${opts.fromPic} sang ${opts.toPic}` }],
              });
            }),
          };
        });
        transferred += count;
        break;
      } catch (e) {
        if (!(e instanceof RecordError) || e.status !== 409 || attempt === 2) throw e;
      }
    }
  }
  return transferred;
}
