-- =========================================================================
-- MIGRATION: HỨNG DỮ LIỆU ĐỒNG BỘ TỪ TIKTOK SELLER CENTER & ĐỐI SOÁT B2C
-- Phạm vi: 69 Gian hàng B2C (B2C phụ trách = 1), 39 TikTok Shop, Video File 3.2
-- =========================================================================

-- 1. Mở rộng bảng StorePortfolio với các cột hạn mức Gross/Net, Paid/FOC & Cảnh báo rủi ro
ALTER TABLE "StorePortfolio"
  ADD COLUMN IF NOT EXISTS "storeOperationId" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "isB2cManaged" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "hasBookingLeader" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bookingLeader" TEXT,
  ADD COLUMN IF NOT EXISTS "budgetGross" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "budgetNet" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "budgetAffiliateGross" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "budgetAffiliateNet" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "budgetSelfChannelGross" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "budgetSelfChannelNet" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "budgetLive" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "targetPaidVideos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "targetFocVideos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "targetSelfChannelContents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "targetLiveSessions" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "actualSpentNet" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "actualAiredVideos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "financialRiskStatus" TEXT NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "financialRiskNotes" TEXT;

CREATE INDEX IF NOT EXISTS "StorePortfolio_financialRiskStatus_idx" ON "StorePortfolio"("financialRiskStatus");

-- 2. Bảng kết nối Gian hàng TikTok Shop Seller Center & TikTok Ads (TikTokShopConnection)
CREATE TABLE IF NOT EXISTS "TikTokShopConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storePortfolioId" TEXT UNIQUE REFERENCES "StorePortfolio"("id") ON DELETE SET NULL,
  "shopId" TEXT NOT NULL UNIQUE,
  "shopCipher" TEXT,
  "sellerName" TEXT NOT NULL,
  "storeName" TEXT NOT NULL UNIQUE,
  "brandName" TEXT NOT NULL,
  "advertiserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "syncStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TikTokShopConnection_brandName_idx" ON "TikTokShopConnection"("brandName");
CREATE INDEX IF NOT EXISTS "TikTokShopConnection_syncStatus_idx" ON "TikTokShopConnection"("syncStatus");

-- 3. Bảng hứng doanh số & chỉ số vận hành Gian hàng theo ngày (TikTokSellerDailyMetric)
CREATE TABLE IF NOT EXISTS "TikTokSellerDailyMetric" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storePortfolioId" TEXT REFERENCES "StorePortfolio"("id") ON DELETE SET NULL,
  "storeName" TEXT NOT NULL,
  "brandName" TEXT NOT NULL,
  "reportDate" DATE NOT NULL,
  "gmv" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "nmv" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "refundAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "ordersCount" INTEGER NOT NULL DEFAULT 0,
  "buyersCount" INTEGER NOT NULL DEFAULT 0,
  "affiliateGmv" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "selfChannelGmv" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "liveGmv" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "adsSpend" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "adsGmv" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TikTokSellerDailyMetric_storeName_reportDate_key" UNIQUE ("storeName", "reportDate")
);

CREATE INDEX IF NOT EXISTS "TikTokSellerDailyMetric_brandName_reportDate_idx" ON "TikTokSellerDailyMetric"("brandName", "reportDate");
CREATE INDEX IF NOT EXISTS "TikTokSellerDailyMetric_storePortfolioId_idx" ON "TikTokSellerDailyMetric"("storePortfolioId");

-- 4. Bảng hứng báo cáo Chiến dịch Quảng cáo Sản phẩm & Livestream PGM/LGM (TikTokAdsCampaignReport)
CREATE TABLE IF NOT EXISTS "TikTokAdsCampaignReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "campaignName" TEXT NOT NULL,
  "storePortfolioId" TEXT REFERENCES "StorePortfolio"("id") ON DELETE SET NULL,
  "storeName" TEXT NOT NULL,
  "brandName" TEXT NOT NULL,
  "reportPeriod" TEXT NOT NULL,
  "sourceFileName" TEXT,
  "cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "gmv" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "orders" INTEGER NOT NULL DEFAULT 0,
  "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cpa" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cvr" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "hookRate2s" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "completionRate100" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "videoCount" INTEGER NOT NULL DEFAULT 0,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TikTokAdsCampaignReport_campaignId_reportPeriod_key" UNIQUE ("campaignId", "reportPeriod")
);

CREATE INDEX IF NOT EXISTS "TikTokAdsCampaignReport_storeName_idx" ON "TikTokAdsCampaignReport"("storeName");
CREATE INDEX IF NOT EXISTS "TikTokAdsCampaignReport_brandName_idx" ON "TikTokAdsCampaignReport"("brandName");

-- 5. Bảng hứng hiệu suất từng Video Creative & Đối soát đơn Booking File 3.2 (TikTokVideoPerformanceSnapshot)
CREATE TABLE IF NOT EXISTS "TikTokVideoPerformanceSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "videoId" TEXT NOT NULL,
  "bookingCode" TEXT,
  "bookingDealId" TEXT,
  "storePortfolioId" TEXT REFERENCES "StorePortfolio"("id") ON DELETE SET NULL,
  "storeName" TEXT NOT NULL,
  "brandName" TEXT NOT NULL,
  "campaignName" TEXT,
  "productId" TEXT,
  "productName" TEXT,
  "videoTitle" TEXT,
  "tiktokAccount" TEXT NOT NULL,
  "pic" TEXT,
  "format" TEXT,
  "videoType" TEXT,
  "salaryGradeKl" TEXT,
  "authorizationType" TEXT,
  "airDate" TEXT,
  "bookingCostNet" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "adsSpend" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "sellerGmv" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "sellerOrders" INTEGER NOT NULL DEFAULT 0,
  "cpa" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "viewsCount" INTEGER NOT NULL DEFAULT 0,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cvr" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "hookRate2s" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "viewRate6s" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "completionRate100" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pipelineStatus" TEXT,
  "slaWarning" TEXT,
  "linkAir" TEXT,
  "reportPeriod" TEXT NOT NULL DEFAULT '2026-10',
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TikTokVideoPerformanceSnapshot_videoId_reportPeriod_key" UNIQUE ("videoId", "reportPeriod")
);

CREATE INDEX IF NOT EXISTS "TikTokVideoPerformanceSnapshot_bookingCode_idx" ON "TikTokVideoPerformanceSnapshot"("bookingCode");
CREATE INDEX IF NOT EXISTS "TikTokVideoPerformanceSnapshot_storeName_idx" ON "TikTokVideoPerformanceSnapshot"("storeName");
CREATE INDEX IF NOT EXISTS "TikTokVideoPerformanceSnapshot_brandName_idx" ON "TikTokVideoPerformanceSnapshot"("brandName");
CREATE INDEX IF NOT EXISTS "TikTokVideoPerformanceSnapshot_pic_idx" ON "TikTokVideoPerformanceSnapshot"("pic");
CREATE INDEX IF NOT EXISTS "TikTokVideoPerformanceSnapshot_salaryGradeKl_idx" ON "TikTokVideoPerformanceSnapshot"("salaryGradeKl");
