// Mã bản ghi dùng chung của Listing và Deal board theo kế hoạch tháng.
const slug = (planId: string) => planId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export const listingBoardKey = (planId: string) => `listing-board-${slug(planId)}`;
export const dealBoardKey = (planId: string) => `deal-board-${slug(planId)}`;
