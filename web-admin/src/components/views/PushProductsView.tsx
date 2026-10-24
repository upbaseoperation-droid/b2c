'use client';

import React, { useState, useMemo } from 'react';
import {
  Lock,
  MessageSquare,
  Send,
  History,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Tag,
  TrendingUp,
  Package,
  Store,
  Users,
  Search,
  Plus,
  FileText,
  ExternalLink,
  ShieldCheck,
  Layers,
  Check,
  X,
  ChevronRight,
  Calendar,
  Clock,
  FileEdit,
  SlidersHorizontal,
  Copy,
  CheckCheck
} from 'lucide-react';
import {
  UserProfile,
  BrandDetail,
  PushProductItem,
  PushProductStatus,
  PushProductRole,
  PushProductComment,
  PushProductChangeRequest,
  ChangeRequestType
} from '../../lib/types';
import { INITIAL_PUSH_PRODUCTS } from '../../lib/mockData';
import { formatDate, formatVnd } from '../../lib/format';
import { BrandAvatar, Button, ChannelTag, Modal, PageActions, Presence, ShopeeLogo, Stat, StatRow, TikTokLogo, LazadaLogo } from '../ui';

interface PushProductsViewProps {
  currentUser: UserProfile;
  brands: BrandDetail[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onOpenBookingWithProduct?: (product: PushProductItem) => void;
}

type TimeHorizon = 'AVAILABLE' | 'FUTURE' | 'HISTORY' | 'ALL';

export const PushProductsView: React.FC<PushProductsViewProps> = ({
  currentUser,
  brands,
  onNotify,
  onOpenBookingWithProduct
}) => {
  // Master Push Products State
  const [products, setProducts] = useState<PushProductItem[]>(INITIAL_PUSH_PRODUCTS);

  const availableBrands = useMemo(() => {
    const map = new Map<string, { id: string; name: string; category: string }>();
    brands.forEach((b) => {
      map.set(b.id, { id: b.id, name: b.name, category: b.category || 'Tiêu dùng & Bán lẻ' });
    });
    products.forEach((p) => {
      if (!map.has(p.brandId)) {
        map.set(p.brandId, { id: p.brandId, name: p.brandName, category: p.brandCategory || 'Tiêu dùng & Bán lẻ' });
      }
    });
    return Array.from(map.values());
  }, [brands, products]);

  // Active Role Switcher for Collaboration Simulation
  const [activeRole, setActiveRole] = useState<PushProductRole>(
    currentUser.role === 'BRAND_MEMBER' || currentUser.role === 'MANAGER' ? 'GROWTH' : 'B2C'
  );
  const [activeAuthorName, setActiveAuthorName] = useState<string>(
    currentUser.role === 'BRAND_MEMBER' || currentUser.role === 'MANAGER'
      ? 'Hoàng Long (Growth Lead)'
      : 'Nguyễn Thị Ngọc Tâm (Trưởng nhóm Booking)'
  );

  // Time Horizon View: Available (Hiện tại) | Future (Tương lai các tháng sau) | History (Lịch sử)
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('AVAILABLE');

  // Filter States
  const [selectedBrandId, setSelectedBrandId] = useState<string>('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL'); // ALL | TIKTOK_SHOP | SHOPEE_MALL
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedFeasibility, setSelectedFeasibility] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'BRAND_STORE_HIERARCHY' | 'GRID'>('BRAND_STORE_HIERARCHY');

  // Selected Product for Detail / Alignment Drawer Modal
  const [selectedProduct, setSelectedProduct] = useState<PushProductItem | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'SPECS' | 'DISCUSSIONS' | 'CHANGE_REVIEW'>('SPECS');

  // State copy brief feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Comment State in Drawer
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<PushProductComment['type']>('COMMENT');

  // Modal State: Create / Propose New Push Product
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    brandId: brands[0]?.id || 'brand-kutieskin',
    storeId: '',
    storeName: '',
    platform: 'SHOPEE_MALL' as 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA',
    productName: '',
    sku: '',
    brandCategory: 'Mẹ & Bé / Chăm Sóc Da Trẻ Em',
    originalPrice: 100000,
    promotionalPrice: 79000,
    affiliateRate: 20,
    availableStock: 5000,
    monthlySampleQuota: 150,
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    cycleType: 'MONTHLY' as PushProductItem['cycleType']
  });

  // Modal State: B2C Input & Update KOC Brief Modal
  const [isEditBriefModalOpen, setIsEditBriefModalOpen] = useState(false);
  const [briefFormProduct, setBriefFormProduct] = useState<PushProductItem | null>(null);
  const [briefForm, setBriefForm] = useState({
    usp: '',
    keyMessage: '',
    viralAngle: '',
    targetKocNiche: '',
    pdpUrl: '',
    briefUrl: '',
    doAndDonts: '',
    sampleNotes: ''
  });

  // Modal State: Create Change Request
  const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState(false);
  const [changeRequestForm, setChangeRequestForm] = useState<{
    type: ChangeRequestType;
    field: string;
    fieldLabel: string;
    oldValue: string | number;
    newValue: string | number;
    startDateVal?: string;
    endDateVal?: string;
    reason: string;
  }>({
    type: 'CHANGE_PRICE',
    field: 'promotionalPrice',
    fieldLabel: 'Giá deal chiến dịch',
    oldValue: 0,
    newValue: 0,
    startDateVal: '',
    endDateVal: '',
    reason: ''
  });

  // Quick chips for discussion
  const quickDiscussionChips = [
    'Đề xuất tăng hoa hồng affiliate lên 20% để kéo KOC tier cao',
    'Kho tổng đang tồn nhiều, đề xuất chạy deal mua 1 tặng 1 trong ngày Mega',
    'KOC phản hồi mẫu dùng rất thích, xin tăng hạn mức mẫu thêm 50 suất',
    'Đã đồng thuận mọi điều kiện, tiến hành chốt duyệt khóa SKU cho chu kỳ!',
    'Đề xuất gia hạn chu kỳ thêm 5 ngày để đón trọn đợt sale lương về',
    'Giá deal hiện tại chưa cạnh tranh so với đối thủ cùng phân khúc'
  ];

  // Helper: notify
  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    if (onNotify) onNotify(msg, type);
  };

  // Helper: Calculate Cycle Statistics
  const getCycleStats = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) {
      return { totalDays: 30, daysRemaining: 0, status: 'ACTIVE' as const };
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date('2026-10-08'); // Current simulated working date
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);
    const daysRemaining = Math.round((end.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    let status: 'UPCOMING' | 'ACTIVE' | 'EXPIRED' = 'ACTIVE';
    if (today < start) status = 'UPCOMING';
    else if (today > end) status = 'EXPIRED';

    return { totalDays, daysRemaining, status };
  };

  // Action: Open B2C Brief Input Modal
  const handleOpenEditBriefModal = (product: PushProductItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBriefFormProduct(product);
    setBriefForm({
      usp: product.usp || '',
      keyMessage: product.keyMessage || '',
      viralAngle: product.viralAngle || '',
      targetKocNiche: (product.targetKocNiche || []).join(', '),
      pdpUrl: product.pdpUrl || '',
      briefUrl: product.briefUrl || '',
      doAndDonts: product.doAndDonts || '',
      sampleNotes: product.sampleNotes || ''
    });
    setIsEditBriefModalOpen(true);
  };

  // Action: Save B2C Brief Input
  const handleSaveB2cBrief = (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefFormProduct) return;

    if (!briefForm.usp.trim()) {
      notify('Vui lòng nhập điểm bán hàng độc nhất cho KOC!', 'warning');
      return;
    }

    const updatedNiches = briefForm.targetKocNiche
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const updated: PushProductItem = {
      ...briefFormProduct,
      usp: briefForm.usp.trim(),
      keyMessage: briefForm.keyMessage.trim() || briefForm.usp.trim(),
      viralAngle: briefForm.viralAngle.trim(),
      targetKocNiche: updatedNiches.length > 0 ? updatedNiches : ['Mẹ Bỉm Sữa', 'Reviewer'],
      pdpUrl: briefForm.pdpUrl.trim() || briefFormProduct.storeUrl || '',
      briefUrl: briefForm.briefUrl.trim(),
      doAndDonts: briefForm.doAndDonts.trim(),
      sampleNotes: briefForm.sampleNotes.trim(),
      b2cBriefStatus: 'BRIEF_COMPLETED',
      briefUpdatedBy: activeAuthorName,
      briefUpdatedAt: new Date().toISOString(),
      auditLogs: [
        ...(briefFormProduct.auditLogs || []),
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('vi-VN', { hour12: false }),
          action: 'B2C cập nhật brief KOC',
          actorName: activeAuthorName,
          actorRole: 'B2C',
          description: `B2C đã cập nhật thông tin brief KOC (USP: "${briefForm.usp.slice(0, 40)}...")`
        }
      ]
    };

    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (selectedProduct?.id === updated.id) {
      setSelectedProduct(updated);
    }
    setIsEditBriefModalOpen(false);
    notify(`Đã lưu thông tin brief KOC cho SKU [${updated.sku}] thành công! B2C có thể sao chép gửi Creator ngay.`);
  };

  // Helper: Copy KOC Brief to Clipboard
  const handleCopyKocBrief = (prod: PushProductItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!prod.usp || !prod.usp.trim()) {
      notify('Sản phẩm này chưa có nội dung brief KOC do B2C thiết lập. B2C vui lòng bổ sung trước!', 'warning');
      handleOpenEditBriefModal(prod);
      return;
    }
    const briefText = `[BRIEF KOC / CREATOR] - SẢN PHẨM THÚC ĐẨY
Thương hiệu: ${prod.brandName}
Gian hàng: ${prod.storeName} (${prod.platform === 'TIKTOK_SHOP' ? 'TikTok Shop' : 'Shopee Mall'})
Sản phẩm: ${prod.productName} (Mã SKU: ${prod.sku})
Chu kỳ hiệu lực: ${formatDate(prod.startDate)} → ${formatDate(prod.endDate)}

CHÍNH SÁCH THƯƠNG MẠI & QUYỀN LỢI:
- Giá niêm yết: ${formatVnd(prod.originalPrice)} | Giá deal chiến dịch: ${formatVnd(prod.promotionalPrice)} (-${prod.discountPercent}%)
- Hoa hồng Affiliate KOC: ${prod.affiliateRate}%
- Chính sách mẫu: ${prod.sampleNotes || `Cấp mẫu dùng thử fullsize cho Creator có video tương tác tốt.`}

NỘI DUNG & THÔNG ĐIỆP TRUYỀN THÔNG:
- USP nổi bật: ${prod.usp}
- Thông điệp chính: ${prod.keyMessage || prod.usp}
- Góc quay gợi ý: ${prod.viralAngle}
- Tệp Creator phù hợp: ${prod.targetKocNiche.join(', ')}
${prod.doAndDonts ? `- Lưu ý nội dung: ${prod.doAndDonts}` : ''}

LINK SẢN PHẨM GẮN GIỎ: ${prod.pdpUrl || prod.pdpUrlTikTok || prod.pdpUrlShopee || 'Đang cập nhật'}
LINK TÀI LIỆU BRIEF CHI TIẾT: ${prod.briefUrl || 'Đang cập nhật'}
`;

    navigator.clipboard.writeText(briefText).then(() => {
      setCopiedId(prod.id);
      setTimeout(() => setCopiedId(null), 2500);
      notify(`Đã sao chép toàn bộ thông tin Brief KOC của SKU [${prod.sku}]! Bạn có thể dán ngay vào Zalo/Lark gửi Creator.`, 'success');
    }).catch(() => {
      notify('Không thể truy cập clipboard, vui lòng kiểm tra quyền trình duyệt.', 'error');
    });
  };

  // Helper: Check time horizon category of a product
  const getProductHorizon = (p: PushProductItem): 'AVAILABLE' | 'FUTURE' | 'HISTORY' => {
    if (p.status === 'ARCHIVED') return 'HISTORY';
    const today = '2026-10-08';
    if (p.endDate < today) return 'HISTORY';
    if (p.startDate > today) return 'FUTURE';
    return 'AVAILABLE';
  };

  // Horizon Counts for Tabs
  const horizonCounts = useMemo(() => {
    let available = 0;
    let future = 0;
    let history = 0;
    products.forEach(p => {
      const h = getProductHorizon(p);
      if (h === 'AVAILABLE') available++;
      else if (h === 'FUTURE') future++;
      else if (h === 'HISTORY') history++;
    });
    return { available, future, history };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Time Horizon Filter
      if (timeHorizon !== 'ALL') {
        const h = getProductHorizon(p);
        if (h !== timeHorizon) return false;
      }

      // 2. Custom Date Range Filter
      if (customStartDate && p.endDate < customStartDate) return false;
      if (customEndDate && p.startDate > customEndDate) return false;

      // 3. Brand Filter
      if (selectedBrandId !== 'ALL' && p.brandId !== selectedBrandId) return false;

      // 4. Platform Filter (TikTok Shop vs Shopee)
      if (selectedPlatform !== 'ALL' && p.platform !== selectedPlatform) return false;

      // 5. Status Filter
      if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;

      // 6. Feasibility Filter
      if (selectedFeasibility !== 'ALL' && p.feasibilityScore !== selectedFeasibility) return false;

      // 7. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.productName.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchBrand = p.brandName.toLowerCase().includes(q);
        const matchStore = (p.storeName || '').toLowerCase().includes(q);
        const matchUsp = p.usp.toLowerCase().includes(q);
        const matchKeyMessage = (p.keyMessage || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBrand && !matchStore && !matchUsp && !matchKeyMessage) return false;
      }
      return true;
    });
  }, [products, timeHorizon, customStartDate, customEndDate, selectedBrandId, selectedPlatform, selectedStatus, selectedFeasibility, searchQuery]);

  // Aggregate Metrics (NO TARGET GMV per user instructions)
  const metrics = useMemo(() => {
    const totalCount = filteredProducts.length;
    const lockedCount = filteredProducts.filter(p => p.status === 'LOCKED_APPROVED').length;
    const inDiscussionCount = filteredProducts.filter(p => p.status === 'IN_DISCUSSION').length;
    const changeReqCount = filteredProducts.filter(p => p.status === 'CHANGE_REQUESTED').length;
    const proposedCount = filteredProducts.filter(p => p.status === 'PROPOSED').length;

    const totalAvailableStock = filteredProducts.reduce((sum, p) => sum + (p.availableStock || 0), 0);
    const totalSampleQuota = filteredProducts.reduce((sum, p) => sum + (p.monthlySampleQuota || 0), 0);
    const totalSampleAllocated = filteredProducts.reduce((sum, p) => sum + (p.allocatedSampleCount || 0), 0);

    const lockRatio = totalCount > 0 ? Math.round((lockedCount / totalCount) * 100) : 0;

    return {
      totalCount,
      lockedCount,
      inDiscussionCount,
      changeReqCount,
      proposedCount,
      totalAvailableStock,
      totalSampleQuota,
      totalSampleAllocated,
      lockRatio
    };
  }, [filteredProducts]);

  // HIERARCHICAL STRUCTURE: Brand => Gian Hàng (Store) => Sản Phẩm Thúc Đẩy
  interface StoreHierarchyGroup {
    storeId: string;
    storeName: string;
    platform: 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA';
    storeUrl?: string;
    items: PushProductItem[];
    totalStock: number;
    totalSampleQuota: number;
    lockedCount: number;
  }

  interface BrandHierarchyGroup {
    brandId: string;
    brandName: string;
    brandCategory: string;
    brandDetail?: BrandDetail;
    storeGroups: StoreHierarchyGroup[];
    totalProductsCount: number;
    lockedCount: number;
    totalStock: number;
    totalSampleQuota: number;
  }

  const brandStoreHierarchy = useMemo(() => {
    const brandMap = new Map<string, {
      brandName: string;
      brandCategory: string;
      brandDetail?: BrandDetail;
      storeMap: Map<string, StoreHierarchyGroup>;
    }>();

    filteredProducts.forEach(prod => {
      if (!brandMap.has(prod.brandId)) {
        const foundBrand = brands.find(b => b.id === prod.brandId);
        brandMap.set(prod.brandId, {
          brandName: prod.brandName,
          brandCategory: prod.brandCategory,
          brandDetail: foundBrand,
          storeMap: new Map<string, StoreHierarchyGroup>()
        });
      }

      const bEntry = brandMap.get(prod.brandId)!;
      const sKey = prod.storeId || `store-default-${prod.platform}`;

      if (!bEntry.storeMap.has(sKey)) {
        bEntry.storeMap.set(sKey, {
          storeId: sKey,
          storeName: prod.storeName || (prod.platform === 'TIKTOK_SHOP' ? `${prod.brandName} TikTok Shop` : `${prod.brandName} Shopee Mall`),
          platform: prod.platform,
          storeUrl: prod.storeUrl,
          items: [],
          totalStock: 0,
          totalSampleQuota: 0,
          lockedCount: 0
        });
      }

      const sGroup = bEntry.storeMap.get(sKey)!;
      sGroup.items.push(prod);
      sGroup.totalStock += (prod.availableStock || 0);
      sGroup.totalSampleQuota += (prod.monthlySampleQuota || 0);
      if (prod.status === 'LOCKED_APPROVED') {
        sGroup.lockedCount++;
      }
    });

    const result: BrandHierarchyGroup[] = [];
    brandMap.forEach((val, brandId) => {
      const storeGroups = Array.from(val.storeMap.values());
      const totalProductsCount = storeGroups.reduce((acc, s) => acc + s.items.length, 0);
      const lockedCount = storeGroups.reduce((acc, s) => acc + s.lockedCount, 0);
      const totalStock = storeGroups.reduce((acc, s) => acc + s.totalStock, 0);
      const totalSampleQuota = storeGroups.reduce((acc, s) => acc + s.totalSampleQuota, 0);

      result.push({
        brandId,
        brandName: val.brandName,
        brandCategory: val.brandCategory,
        brandDetail: val.brandDetail,
        storeGroups,
        totalProductsCount,
        lockedCount,
        totalStock,
        totalSampleQuota
      });
    });

    return result;
  }, [filteredProducts, brands]);

  // Action: Open Propose Modal with Brand & Store prefilled
  const handleOpenCreateForStore = (brandId: string, storeId: string) => {
    const brand = brands.find(b => b.id === brandId);
    const store = brand?.stores?.find(s => s.id === storeId);
    setNewProductForm(prev => ({
      ...prev,
      brandId,
      storeId,
      storeName: store?.storeName || '',
      platform: store?.platform || 'SHOPEE_MALL',
      brandCategory: brand?.category || 'Mẹ & Bé',
      productName: '',
      sku: ''
    }));
    setIsCreateModalOpen(true);
  };

  // Action: Send Discussion Comment
  const handleSendComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || !selectedProduct) return;

    const newComment: PushProductComment = {
      id: `comm-${Date.now()}`,
      authorName: activeAuthorName,
      authorRole: activeRole,
      content: commentText.trim(),
      type: commentType,
      createdAt: new Date().toISOString()
    };

    let nextStatus = selectedProduct.status;
    if (selectedProduct.status === 'PROPOSED') {
      nextStatus = 'IN_DISCUSSION';
    }

    const updatedProduct: PushProductItem = {
      ...selectedProduct,
      status: nextStatus,
      comments: [...selectedProduct.comments, newComment],
      auditLogs: [
        ...selectedProduct.auditLogs,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('vi-VN', { hour12: false }),
          action: 'Gửi Phản Hồi Trao Đổi',
          actorName: activeAuthorName,
          actorRole: activeRole,
          description: `Gửi phản hồi [${commentType}]: "${commentText.trim().slice(0, 60)}..."`
        }
      ]
    };

    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    setSelectedProduct(updatedProduct);
    setCommentText('');
    setCommentType('COMMENT');
    notify('Đã gửi phản hồi trao đổi 2 chiều thành công!');
  };

  // Action: Lock / Chốt Sản Phẩm Thúc Đẩy
  const handleLockProduct = (product: PushProductItem) => {
    const growthName = activeRole === 'GROWTH' ? activeAuthorName : product.growthPic || 'Hoàng Long (Growth Lead)';
    const b2cName = activeRole === 'B2C' ? activeAuthorName : product.b2cPic || 'Nguyễn Thị Ngọc Tâm (Trưởng nhóm Booking)';

    const updated: PushProductItem = {
      ...product,
      status: 'LOCKED_APPROVED',
      lockedAt: new Date().toISOString(),
      lockedBy: {
        growthPic: growthName,
        b2cPic: b2cName
      },
      auditLogs: [
        ...product.auditLogs,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('vi-VN', { hour12: false }),
          action: 'Chốt duyệt & khóa sản phẩm thúc đẩy',
          actorName: activeAuthorName,
          actorRole: activeRole,
          description: `Hai bên Growth & B2C đã đạt đồng thuận. Khóa duyệt SKU ${product.sku} cho chu kỳ ${formatDate(product.startDate)} → ${formatDate(product.endDate)}.`
        }
      ]
    };

    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (selectedProduct?.id === updated.id) {
      setSelectedProduct(updated);
    }
    notify(`Đã chốt duyệt thành công sản phẩm thúc đẩy [${product.productName}]! Dữ liệu đã sẵn sàng để B2C brief KOC.`);
  };

  // Action: Open Create Change Request
  const handleOpenChangeRequestModal = (fieldKey: string, fieldLabel: string, currValue: string | number) => {
    let reqType: ChangeRequestType = 'CHANGE_PRICE';
    if (fieldKey === 'affiliateRate') reqType = 'CHANGE_COMMISSION';
    else if (fieldKey === 'monthlySampleQuota') reqType = 'CHANGE_SAMPLE_QUOTA';
    else if (fieldKey === 'availableStock') reqType = 'CHANGE_STOCK';
    else if (fieldKey === 'sku') reqType = 'REPLACE_SKU';
    else if (fieldKey === 'cycleDates' || fieldKey === 'startDate' || fieldKey === 'endDate') reqType = 'CHANGE_CYCLE_DATES';

    setChangeRequestForm({
      type: reqType,
      field: fieldKey,
      fieldLabel,
      oldValue: currValue,
      newValue: currValue,
      startDateVal: selectedProduct?.startDate || '2026-10-01',
      endDateVal: selectedProduct?.endDate || '2026-10-31',
      reason: ''
    });
    setIsChangeRequestModalOpen(true);
  };

  // Action: Submit Change Request
  const handleSubmitChangeRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!changeRequestForm.reason.trim()) {
      notify('Vui lòng nhập lý do đề xuất thay đổi!', 'warning');
      return;
    }

    let finalNewValue = changeRequestForm.newValue;
    if (changeRequestForm.type === 'CHANGE_CYCLE_DATES') {
      finalNewValue = `${changeRequestForm.startDateVal || selectedProduct.startDate} → ${changeRequestForm.endDateVal || selectedProduct.endDate}`;
    }

    const newCr: PushProductChangeRequest = {
      id: `cr-${Date.now()}`,
      type: changeRequestForm.type,
      requestedBy: activeAuthorName,
      requesterRole: activeRole,
      requestedAt: new Date().toISOString(),
      reason: changeRequestForm.reason.trim(),
      field: changeRequestForm.field,
      fieldLabel: changeRequestForm.fieldLabel,
      oldValue: changeRequestForm.oldValue,
      newValue: finalNewValue,
      status: 'PENDING'
    };

    const updated: PushProductItem = {
      ...selectedProduct,
      status: 'CHANGE_REQUESTED',
      changeRequests: [...selectedProduct.changeRequests, newCr],
      auditLogs: [
        ...selectedProduct.auditLogs,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('vi-VN', { hour12: false }),
          action: 'Tạo yêu cầu thay đổi',
          actorName: activeAuthorName,
          actorRole: activeRole,
          description: `Yêu cầu đổi [${changeRequestForm.fieldLabel}]: từ ${changeRequestForm.oldValue} sang ${finalNewValue}. Lý do: ${changeRequestForm.reason.trim()}`
        }
      ]
    };

    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProduct(updated);
    setIsChangeRequestModalOpen(false);
    setActiveDrawerTab('CHANGE_REVIEW');
    notify(`Đã gửi yêu cầu thay đổi [${changeRequestForm.fieldLabel}]. Chờ phía đối ứng xem xét phê duyệt!`, 'info');
  };

  // Action: Approve Change Request
  const handleApproveChangeRequest = (crId: string) => {
    if (!selectedProduct) return;
    const cr = selectedProduct.changeRequests.find(c => c.id === crId);
    if (!cr) return;

    let updatedFields: Partial<PushProductItem> = { [cr.field]: cr.newValue } as Partial<PushProductItem>;
    if (cr.type === 'CHANGE_CYCLE_DATES') {
      if (typeof cr.newValue === 'string' && cr.newValue.includes('→')) {
        const [s, e] = cr.newValue.split('→').map(t => t.trim());
        updatedFields = { 
          startDate: s, 
          endDate: e,
          cycleMonth: s.slice(0, 7).replace('-', '/')
        };
      }
    }

    if (cr.field === 'promotionalPrice' && selectedProduct.originalPrice > 0) {
      updatedFields.discountPercent = Math.round(
        ((selectedProduct.originalPrice - Number(cr.newValue)) / selectedProduct.originalPrice) * 100
      );
    }

    const updatedCrList = selectedProduct.changeRequests.map(c => 
      c.id === crId ? {
        ...c,
        status: 'APPROVED' as const,
        reviewedBy: activeAuthorName,
        reviewedAt: new Date().toISOString(),
        reviewNote: `Đã được phê duyệt bởi ${activeAuthorName} (${activeRole})`
      } : c
    );

    const hasOtherPending = updatedCrList.some(c => c.status === 'PENDING');

    const updated: PushProductItem = {
      ...selectedProduct,
      ...updatedFields,
      status: hasOtherPending ? 'CHANGE_REQUESTED' : 'LOCKED_APPROVED',
      changeRequests: updatedCrList,
      auditLogs: [
        ...selectedProduct.auditLogs,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('vi-VN', { hour12: false }),
          action: 'Phê duyệt yêu cầu thay đổi',
          actorName: activeAuthorName,
          actorRole: activeRole,
          description: `Đã phê duyệt đổi [${cr.fieldLabel}] thành ${cr.newValue}. Cập nhật trực tiếp vào dữ liệu gốc.`
        }
      ]
    };

    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProduct(updated);
    notify(`Đã phê duyệt thay đổi [${cr.fieldLabel}]! Dữ liệu sản phẩm đã được cập nhật đồng bộ.`);
  };

  // Action: Reject Change Request
  const handleRejectChangeRequest = (crId: string, reasonText: string = 'Không phù hợp với chính sách thương mại hiện tại') => {
    if (!selectedProduct) return;
    const updatedCrList = selectedProduct.changeRequests.map(c => 
      c.id === crId ? {
        ...c,
        status: 'REJECTED' as const,
        reviewedBy: activeAuthorName,
        reviewedAt: new Date().toISOString(),
        reviewNote: reasonText
      } : c
    );

    const hasOtherPending = updatedCrList.some(c => c.status === 'PENDING');

    const updated: PushProductItem = {
      ...selectedProduct,
      status: hasOtherPending ? 'CHANGE_REQUESTED' : 'IN_DISCUSSION',
      changeRequests: updatedCrList,
      auditLogs: [
        ...selectedProduct.auditLogs,
        {
          id: `log-${selectedProduct.auditLogs.length + 1}`,
          timestamp: new Date().toLocaleString('vi-VN', { hour12: false }),
          action: 'Từ chối yêu cầu thay đổi',
          actorName: activeAuthorName,
          actorRole: activeRole,
          description: `Từ chối yêu cầu thay đổi. Lý do: ${reasonText}`
        }
      ]
    };

    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProduct(updated);
    notify('Đã từ chối yêu cầu thay đổi. Giữ nguyên giá trị hiện tại.', 'warning');
  };

  // Action: Submit Propose New Push Product
  const handleCreateNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.productName.trim() || !newProductForm.sku.trim()) {
      notify('Vui lòng điền tên sản phẩm và mã SKU!', 'warning');
      return;
    }

    const brand = brands.find(b => b.id === newProductForm.brandId);
    const brandName = brand?.name || 'Thương hiệu mới';
    
    // Find store details
    const selectedStore = brand?.stores?.find(s => s.id === newProductForm.storeId) || brand?.stores?.[0];
    const storeId = selectedStore?.id || 'store-default';
    const storeName = selectedStore?.storeName || (newProductForm.platform === 'TIKTOK_SHOP' ? `${brandName} TikTok Shop` : `${brandName} Shopee Mall`);
    const platform = selectedStore?.platform || newProductForm.platform || 'SHOPEE_MALL';
    const storeUrl = selectedStore?.storeUrl || '';

    const discPercent = newProductForm.originalPrice > 0 
      ? Math.round(((newProductForm.originalPrice - newProductForm.promotionalPrice) / newProductForm.originalPrice) * 100)
      : 0;

    const cycleMonthValue = newProductForm.startDate 
      ? newProductForm.startDate.slice(0, 7).replace('-', '/')
      : '2026/10';

    const newProd: PushProductItem = {
      id: `push-${Date.now()}`,
      sku: newProductForm.sku.trim().toUpperCase(),
      productName: newProductForm.productName.trim(),
      brandId: newProductForm.brandId,
      brandName,
      brandCategory: newProductForm.brandCategory,
      storeId,
      storeName,
      platform,
      storeUrl,
      imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80',
      cycleMonth: cycleMonthValue,
      campaignName: 'Chiến dịch thúc đẩy định kỳ',
      startDate: newProductForm.startDate || '2026-10-01',
      endDate: newProductForm.endDate || '2026-10-31',
      cycleType: newProductForm.cycleType || 'MONTHLY',
      originalPrice: Number(newProductForm.originalPrice),
      promotionalPrice: Number(newProductForm.promotionalPrice),
      discountPercent: discPercent,
      affiliateRate: Number(newProductForm.affiliateRate),
      availableStock: Number(newProductForm.availableStock),
      monthlySampleQuota: Number(newProductForm.monthlySampleQuota),
      allocatedSampleCount: 0,
      usp: '',
      keyMessage: '',
      viralAngle: '',
      targetKocNiche: ['Mẹ Bỉm Sữa', 'Reviewer'],
      pdpUrl: storeUrl,
      briefUrl: '',
      doAndDonts: '',
      sampleNotes: '',
      feasibilityScore: 'MEDIUM',
      b2cBriefStatus: 'PENDING_BRIEF',
      growthPic: 'Hoàng Long',
      b2cPic: 'Lê Phương Thảo',
      status: 'PROPOSED',
      proposedAt: new Date().toISOString(),
      comments: [
        {
          id: `comm-${Date.now()}`,
          authorName: activeAuthorName,
          authorRole: activeRole,
          content: `Growth khởi tạo đề xuất sản phẩm thúc đẩy mới cho gian hàng ${storeName}. Đề nghị B2C đánh giá tệp KOC và phản biện điều kiện mẫu/giá!`,
          type: 'COMMENT',
          createdAt: new Date().toISOString()
        }
      ],
      changeRequests: [],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('vi-VN', { hour12: false }),
          action: 'Đề xuất sản phẩm thúc đẩy mới',
          actorName: activeAuthorName,
          actorRole: activeRole,
          description: `Khởi tạo SKU [${newProductForm.sku}] cho gian hàng ${storeName} thuộc ${brandName}.`
        }
      ]
    };

    setProducts(prev => [newProd, ...prev]);
    setIsCreateModalOpen(false);
    setSelectedProduct(newProd);
    setActiveDrawerTab('SPECS');
    notify(`Đã khởi tạo đề xuất sản phẩm thúc đẩy [${newProd.productName}] cho ${storeName}!`);
  };

  // Render Status Badge
  const renderStatusBadge = (status: PushProductStatus) => {
    switch (status) {
      case 'LOCKED_APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            Đã chốt duyệt
          </span>
        );
      case 'IN_DISCUSSION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-soft text-accent border border-line">
            <MessageSquare className="w-3.5 h-3.5 text-accent" />
            Đang trao đổi
          </span>
        );
      case 'CHANGE_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Yêu cầu thay đổi
          </span>
        );
      case 'PROPOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Mới đề xuất
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sunken text-ink-2 border border-line">
            <History className="w-3.5 h-3.5 text-ink-3" />
            Lịch sử lưu trữ
          </span>
        );
    }
  };

  // Render Cycle Countdown Label
  const renderCycleBadge = (prod: PushProductItem) => {
    const { daysRemaining, status } = getCycleStats(prod.startDate, prod.endDate);
    return (
      <div className="flex items-center flex-wrap gap-1.5 text-2xs">
        <span className="inline-flex items-center gap-1 font-code text-ink-2 font-medium">
          <Calendar className="w-3 h-3 text-ink-3" />
          {formatDate(prod.startDate)} → {formatDate(prod.endDate)}
        </span>
        {status === 'ACTIVE' && (
          <span className="text-2xs font-medium text-positive">
            · Còn {Math.max(0, daysRemaining)} ngày
          </span>
        )}
        {status === 'UPCOMING' && (
          <span className="text-2xs font-medium text-accent">
            · Sắp bắt đầu
          </span>
        )}
        {status === 'EXPIRED' && (
          <span className="text-2xs font-medium text-ink-3">
            · Đã kết thúc
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageActions>
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs max-w-full overflow-x-auto">
          <span className="text-2xs text-slate-500 px-2 flex items-center gap-1 shrink-0">
            Góc nhìn:
          </span>
          <button
            type="button"
            onClick={() => {
              setActiveRole('GROWTH');
              setActiveAuthorName('Hoàng Long (Growth Lead)');
              notify('Chuyển sang góc nhìn: Growth Team', 'info');
            }}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 shrink-0 ${
              activeRole === 'GROWTH'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
            Growth
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveRole('B2C');
              setActiveAuthorName('Nguyễn Thị Ngọc Tâm (Trưởng nhóm Booking)');
              notify('Chuyển sang góc nhìn: B2C Team', 'info');
            }}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 shrink-0 ${
              activeRole === 'B2C'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-600" />
            B2C Booking
          </button>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Đề xuất sản phẩm thúc đẩy
        </Button>
      </PageActions>

      {/* TIME HORIZON TABS: Đang mở bán vs Kế hoạch vs Lịch sử */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTimeHorizon('AVAILABLE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              timeHorizon === 'AVAILABLE'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đang mở bán
            <span className={`px-1.5 py-0.5 rounded text-2xs font-mono ${
              timeHorizon === 'AVAILABLE' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {horizonCounts.available}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTimeHorizon('FUTURE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              timeHorizon === 'FUTURE'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Kế hoạch sắp tới
            <span className={`px-1.5 py-0.5 rounded text-2xs font-mono ${
              timeHorizon === 'FUTURE' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {horizonCounts.future}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTimeHorizon('HISTORY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              timeHorizon === 'HISTORY'
                ? 'bg-primary text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Lịch sử
            <span className={`px-1.5 py-0.5 rounded text-2xs font-mono ${
              timeHorizon === 'HISTORY' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {horizonCounts.history}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTimeHorizon('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              timeHorizon === 'ALL'
                ? 'bg-slate-200 text-slate-900 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả ({products.length})
          </button>
        </div>

        <div className="flex items-center gap-2 max-w-full">
          {/* Quick Platform Filter */}
          <div className="flex items-center bg-sunken p-1 rounded-lg border border-line text-xs max-w-full overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedPlatform('ALL')}
              className={`px-2.5 py-1 rounded text-2xs font-medium transition-colors shrink-0 ${
                selectedPlatform === 'ALL' ? 'bg-surface text-ink shadow-2xs font-semibold' : 'text-ink-3 hover:text-ink'
              }`}
            >
              Mọi sàn
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatform('SHOPEE_MALL')}
              className={`px-2.5 py-1 rounded text-2xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                selectedPlatform === 'SHOPEE_MALL' ? 'bg-surface text-ink shadow-2xs font-semibold' : 'text-ink-3 hover:text-ink'
              }`}
            >
              <ShopeeLogo className="w-3.5 h-3.5" /> Shopee
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatform('TIKTOK_SHOP')}
              className={`px-2.5 py-1 rounded text-2xs font-medium transition-colors flex items-center gap-1.5 ${
                selectedPlatform === 'TIKTOK_SHOP' ? 'bg-surface text-ink shadow-2xs font-semibold' : 'text-ink-3 hover:text-ink'
              }`}
            >
              <TikTokLogo className="w-3.5 h-3.5" /> TikTok
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatform('LAZADA')}
              className={`px-2.5 py-1 rounded text-2xs font-medium transition-colors flex items-center gap-1.5 ${
                selectedPlatform === 'LAZADA' ? 'bg-surface text-ink shadow-2xs font-semibold' : 'text-ink-3 hover:text-ink'
              }`}
            >
              <LazadaLogo className="w-3.5 h-3.5" /> Lazada
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <StatRow>
        <Stat
          label="Tổng sản phẩm"
          value={`${metrics.totalCount} SKU`}
          note="Theo gian hàng sàn"
        />
        <Stat
          label="Đã chốt duyệt"
          value={String(metrics.lockedCount)}
          note={`Đạt ${metrics.lockRatio}% tổng danh mục`}
          tone="positive"
        />
        <Stat
          label="Đang trao đổi"
          value={String(metrics.inDiscussionCount)}
          note={`${metrics.changeReqCount} yêu cầu đổi`}
        />
        <Stat
          label="Hạn mức mẫu"
          value={`${metrics.totalSampleAllocated} / ${metrics.totalSampleQuota}`}
          note={`Đã cấp ${metrics.totalSampleQuota > 0 ? Math.round((metrics.totalSampleAllocated / metrics.totalSampleQuota) * 100) : 0}% quota`}
        />
        <Stat
          label="Tồn kho khả dụng"
          value={`${metrics.totalAvailableStock.toLocaleString('vi-VN')} SP`}
          note="Cam kết chiến dịch"
        />
      </StatRow>

      {/* Filter and Control Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Search box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm SKU, sản phẩm, gian hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('BRAND_STORE_HIERARCHY')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === 'BRAND_STORE_HIERARCHY'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Theo gian hàng
              </button>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === 'GRID'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Dạng bảng
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown Filters Strip */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Brand filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Store className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Brand:</span>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[160px]"
            >
              <option value="ALL">Tất cả thương hiệu ({availableBrands.length})</option>
              {availableBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Trạng thái:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="LOCKED_APPROVED">Đã chốt đồng thuận</option>
              <option value="IN_DISCUSSION">Đang Trao đổi</option>
              <option value="CHANGE_REQUESTED">Có yêu cầu thay đổi</option>
              <option value="PROPOSED">Mới đề xuất</option>
            </select>
          </div>

          {/* Date range picker filter */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 max-w-full">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-500 font-medium">Lọc ngày:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-2xs font-mono"
              placeholder="Từ ngày"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-2xs font-mono"
              placeholder="Đến ngày"
            />
          </div>

          {(selectedBrandId !== 'ALL' || selectedPlatform !== 'ALL' || selectedStatus !== 'ALL' || selectedFeasibility !== 'ALL' || customStartDate || customEndDate || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedBrandId('ALL');
                setSelectedPlatform('ALL');
                setSelectedStatus('ALL');
                setSelectedFeasibility('ALL');
                setCustomStartDate('');
                setCustomEndDate('');
                setSearchQuery('');
              }}
              className="text-slate-500 hover:text-accent font-medium underline ml-auto text-xs"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Hierarchical vs Table */}
      {viewMode === 'BRAND_STORE_HIERARCHY' ? (
        /* PHÂN CẤP: BRAND => GIAN HÀNG => Sản phẩm thúc đẩy */
        <div className="space-y-8">
          {brandStoreHierarchy.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200 space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="text-base font-semibold text-slate-700">Không tìm thấy sản phẩm thúc đẩy phù hợp</div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Khởi tạo sản phẩm thúc đẩy mới
              </button>
            </div>
          ) : (
            brandStoreHierarchy.map(bGroup => (
              <div key={bGroup.brandId} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Brand Header Banner */}
                <div className="bg-slate-50 p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <BrandAvatar brandName={bGroup.brandName} size={44} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <h2 className="text-lg font-semibold text-slate-900">{bGroup.brandName}</h2>
                        <span className="text-xs font-medium text-slate-500">
                          · {bGroup.storeGroups.length} gian hàng · {bGroup.totalProductsCount} sản phẩm
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span>Ngành hàng: <strong>{bGroup.brandCategory}</strong></span>
                        <span>•</span>
                        <span>Đã chốt: <strong className="text-slate-800">{bGroup.lockedCount}/{bGroup.totalProductsCount} SKU</strong></span>
                        <span>•</span>
                        <span>Tổng tồn kho: <strong className="text-slate-700">{bGroup.totalStock.toLocaleString('vi-VN')} SP</strong></span>
                        <span>•</span>
                        <span>Hạn mức mẫu: <strong className="text-slate-800">{bGroup.totalSampleQuota} mẫu</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenCreateForStore(bGroup.brandId, bGroup.storeGroups[0]?.storeId || '')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm sản phẩm
                    </button>
                  </div>
                </div>

                {/* Stores & Their Focus Products */}
                <div className="p-3.5 sm:p-6 space-y-6 sm:space-y-8 bg-slate-50/50">
                  {bGroup.storeGroups.map(sGroup => (
                    <div key={sGroup.storeId} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                      {/* Store Sub-Header */}
                      <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <ChannelTag channel={sGroup.platform} />
                          <span className="font-semibold text-slate-800 text-sm">
                            {sGroup.storeName}
                          </span>
                          <span className="text-xs text-slate-400 font-code">({sGroup.items.length} SKU)</span>
                          {sGroup.storeUrl && (
                            <a
                              href={sGroup.storeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent hover:underline text-xs flex items-center gap-1 font-medium"
                            >
                              <ExternalLink className="w-3 h-3" /> Ghé gian hàng
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                          <span>Tồn kho gian hàng: <strong className="text-slate-800">{sGroup.totalStock.toLocaleString()}</strong></span>
                          <span>•</span>
                          <span>Hạn mức mẫu: <strong className="text-amber-700">{sGroup.totalSampleQuota}</strong></span>
                          <button
                            type="button"
                            onClick={() => handleOpenCreateForStore(bGroup.brandId, sGroup.storeId)}
                            className="text-accent hover:underline font-semibold text-xs flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Thêm SKU
                          </button>
                        </div>
                      </div>

                      {/* Product Cards Grid inside this Store */}
                      <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sGroup.items.map(prod => (
                          <div
                            key={prod.id}
                            onClick={() => {
                              setSelectedProduct(prod);
                              setActiveDrawerTab('SPECS');
                            }}
                            className="bg-white rounded-xl border border-slate-200 hover:border-line-strong hover:shadow-md transition-colors cursor-pointer flex flex-col justify-between overflow-hidden group"
                          >
                            {/* Card Top: Badges & Cycle */}
                            <div className="p-4 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-code text-xs font-semibold text-accent">
                                  {prod.sku}
                                </span>
                                {renderStatusBadge(prod.status)}
                              </div>

                              <div>
                                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-accent transition-colors line-clamp-2">
                                  {prod.productName}
                                </h3>
                                <div className="mt-1">
                                  {renderCycleBadge(prod)}
                                </div>
                              </div>

                              {/* Commercial Conditions Strip */}
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <span className="text-slate-500">Giá deal chiến dịch:</span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="line-through text-slate-400 text-2xs font-code">
                                      {formatVnd(prod.originalPrice)}
                                    </span>
                                    <span className="font-semibold text-rose-600 font-code text-sm">
                                      {formatVnd(prod.promotionalPrice)}
                                    </span>
                                    <span className="text-rose-700 text-2xs font-semibold">
                                      (-{prod.discountPercent}%)
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Hoa hồng Affiliate:</span>
                                  <span className="font-semibold text-emerald-700 font-code">
                                    {prod.affiliateRate}%
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Tồn kho khả dụng:</span>
                                  <span className="font-semibold text-slate-800 font-code">
                                    {prod.availableStock.toLocaleString()} SP
                                  </span>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                                  <span className="text-slate-500">Hạn mức mẫu cấp:</span>
                                  <span className="font-semibold text-amber-700 font-code">
                                    {prod.allocatedSampleCount} / {prod.monthlySampleQuota} mẫu
                                  </span>
                                </div>
                              </div>

                              {/* Key Message & USP Brief Highlight */}
                              <div className="space-y-1 text-xs">
                                <div className="text-2xs font-semibold text-slate-700 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-amber-500" />
                                    Brief KOC:
                                  </span>
                                  {(!prod.usp || prod.b2cBriefStatus === 'PENDING_BRIEF') && (
                                    <span className="text-2xs font-medium text-amber-700">
                                      Chờ B2C bổ sung
                                    </span>
                                  )}
                                </div>
                                {prod.usp ? (
                                  <p className="text-slate-600 text-2xs line-clamp-2 italic bg-amber-50/40 p-2 rounded border border-amber-100">
                                    &ldquo;{prod.keyMessage || prod.usp}&rdquo;
                                  </p>
                                ) : (
                                  <div className="p-2 rounded border border-dashed border-amber-300 bg-amber-50/40 text-amber-800 text-2xs flex items-center justify-between">
                                    <span>Chưa cập nhật USP & thông điệp KOC</span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenEditBriefModal(prod, e)}
                                      className="font-semibold text-accent hover:underline"
                                    >
                                      + Nhập brief
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* KOC Niche Tags */}
                              <div className="text-2xs text-slate-500">
                                {prod.targetKocNiche.slice(0, 3).map((tag) => `#${tag}`).join(' · ')}
                                {prod.targetKocNiche.length > 3 && ` (+${prod.targetKocNiche.length - 3})`}
                              </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                              {/* Copy / Input Brief Button */}
                              {(!prod.usp || prod.b2cBriefStatus === 'PENDING_BRIEF') ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenEditBriefModal(prod, e)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                                  title="Sản phẩm chưa có brief KOC do B2C thiết lập. Bấm để B2C bổ sung ngay"
                                >
                                  <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                                  Bổ sung brief KOC
                                </button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyKocBrief(prod, e)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                      copiedId === prod.id
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-accent'
                                    }`}
                                    title="Sao chép toàn bộ thông tin chuẩn hóa để gửi nhanh cho KOC qua Zalo/Lark"
                                  >
                                    {copiedId === prod.id ? (
                                      <>
                                        <CheckCheck className="w-3.5 h-3.5 text-white" />
                                        Đã chép brief
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        Chép brief KOC
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditBriefModal(prod, e)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-slate-100"
                                    title="Sửa brief KOC"
                                  >
                                    <FileEdit className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                              <div className="flex items-center gap-1.5">
                                {onOpenBookingWithProduct && prod.status === 'LOCKED_APPROVED' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenBookingWithProduct(prod);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-accent-soft text-accent border border-line hover:opacity-90 transition-colors flex items-center gap-1"
                                    title="Mở tab phân bổ KOC booking cho SKU này"
                                  >
                                    <Users className="w-3.5 h-3.5" />
                                    Book KOC
                                  </button>
                                )}
                                <span className="text-slate-400 group-hover:text-accent text-xs font-medium flex items-center gap-0.5">
                                  Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Dạng bảng master data view */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
                <tr>
                  <th className="py-3.5 px-4">Mã SKU & tên sản phẩm</th>
                  <th className="py-3.5 px-4">Thương hiệu & gian hàng</th>
                  <th className="py-3.5 px-4">Chu kỳ hiệu lực</th>
                  <th className="py-3.5 px-4 text-right">Giá deal / niêm yết</th>
                  <th className="py-3.5 px-4 text-center">Hoa hồng</th>
                  <th className="py-3.5 px-4 text-right">Tồn kho</th>
                  <th className="py-3.5 px-4 text-center">Mẫu đã cấp / hạn mức</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map(prod => (
                  <tr
                    key={prod.id}
                    onClick={() => {
                      setSelectedProduct(prod);
                      setActiveDrawerTab('SPECS');
                    }}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-code font-semibold text-accent">{prod.sku}</div>
                      <div className="font-semibold text-slate-900 line-clamp-1">{prod.productName}</div>
                      <div className="text-2xs text-slate-500 line-clamp-1 italic mt-0.5">
                        USP: {prod.usp}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{prod.brandName}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <ChannelTag channel={prod.platform} />
                        <span className="text-2xs text-slate-600 line-clamp-1">{prod.storeName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {renderCycleBadge(prod)}
                    </td>
                    <td className="py-3 px-4 text-right font-code">
                      <div className="font-semibold text-rose-600">{formatVnd(prod.promotionalPrice)}</div>
                      <div className="text-2xs text-slate-400 line-through">{formatVnd(prod.originalPrice)}</div>
                      <span className="text-2xs font-semibold text-rose-600">(-{prod.discountPercent}%)</span>
                    </td>
                    <td className="py-3 px-4 text-center font-code">
                      <span className="font-semibold text-emerald-700">
                        {prod.affiliateRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-code font-semibold text-slate-800">
                      {prod.availableStock.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-code">
                      <span className="font-semibold text-amber-700">
                        {prod.allocatedSampleCount} / {prod.monthlySampleQuota}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderStatusBadge(prod.status)}
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {(!prod.usp || prod.b2cBriefStatus === 'PENDING_BRIEF') ? (
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditBriefModal(prod, e)}
                          className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-2xs font-semibold inline-flex items-center gap-1"
                          title="B2C bổ sung brief KOC"
                        >
                          <FileEdit className="w-3 h-3 text-amber-600" />
                          Nhập brief
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleCopyKocBrief(prod, e)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xs font-semibold inline-flex items-center gap-1"
                            title="Sao chép brief KOC"
                          >
                            <Copy className="w-3 h-3" />
                            Chép brief
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditBriefModal(prod, e)}
                            className="p-1 rounded text-slate-400 hover:text-accent hover:bg-slate-100"
                            title="Chỉnh sửa brief KOC"
                          >
                            <FileEdit className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL / COLLABORATION ALIGNMENT DRAWER MODAL */}
      <Presence show={!!selectedProduct} exit="drawer">
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-ink/40 flex justify-end animate-fade-in">
          <div data-motion-panel className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-(--motion-slow) ease-enter">
            {/* Drawer Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-code text-xs font-semibold text-accent">
                    {selectedProduct.sku}
                  </span>
                  {renderStatusBadge(selectedProduct.status)}
                  <ChannelTag channel={selectedProduct.platform} />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedProduct.productName}</h2>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>{selectedProduct.brandName}</span>
                  <span>•</span>
                  <span>Gian hàng: <strong>{selectedProduct.storeName}</strong></span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Strip */}
            <div className="px-4 sm:px-6 py-3 bg-accent-soft border-b border-line flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleCopyKocBrief(selectedProduct)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-hover font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Sao chép brief KOC
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditBriefModal(selectedProduct)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-line text-accent hover:bg-hover font-semibold flex items-center gap-1.5 text-xs transition-colors"
                >
                  <FileEdit className="w-3.5 h-3.5 text-accent" />
                  {(!selectedProduct.usp || selectedProduct.b2cBriefStatus === 'PENDING_BRIEF') ? 'Bổ sung brief KOC' : 'Sửa brief KOC'}
                </button>
                {selectedProduct.pdpUrl && (
                  <a
                    href={selectedProduct.pdpUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-1 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Link gian hàng
                  </a>
                )}
                {selectedProduct.briefUrl && (
                  <a
                    href={selectedProduct.briefUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-1 text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" /> Tài liệu brief chi tiết
                  </a>
                )}
              </div>

              {selectedProduct.status !== 'LOCKED_APPROVED' && (
                <button
                  type="button"
                  onClick={() => handleLockProduct(selectedProduct)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" /> Chốt thống nhất
                </button>
              )}
            </div>

            {/* Drawer Tabs */}
            <div className="flex border-b border-slate-200 px-4 sm:px-6 text-xs font-semibold overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveDrawerTab('SPECS')}
                className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
                  activeDrawerTab === 'SPECS'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Tag className="w-4 h-4" />
                Thông số sản phẩm & brief KOC
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawerTab('DISCUSSIONS')}
                className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
                  activeDrawerTab === 'DISCUSSIONS'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Thảo luận & phản biện ({selectedProduct.comments.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawerTab('CHANGE_REVIEW')}
                className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
                  activeDrawerTab === 'CHANGE_REVIEW'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                Yêu cầu thay đổi & lịch sử ({selectedProduct.changeRequests.length})
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {activeDrawerTab === 'SPECS' && (
                <div className="space-y-6">
                  {/* Cycle Management Card */}
                  <div className="bg-accent-soft p-4 rounded-xl border border-line space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-accent" />
                        Quản trị chu kỳ & thời lượng thúc đẩy
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenChangeRequestModal('cycleDates', 'Chu kỳ thúc đẩy (ngày bắt đầu & kết thúc)', `${selectedProduct.startDate} → ${selectedProduct.endDate}`)}
                        className="text-xs text-accent hover:underline font-semibold flex items-center gap-1"
                      >
                        <FileEdit className="w-3.5 h-3.5" /> Đổi ngày / gia hạn chu kỳ
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-line text-xs">
                      <div>
                        <span className="text-slate-400 block text-2xs">Ngày bắt đầu:</span>
                        <span className="font-code font-semibold text-slate-800">{formatDate(selectedProduct.startDate)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-2xs">Ngày kết thúc:</span>
                        <span className="font-code font-semibold text-slate-800">{formatDate(selectedProduct.endDate)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-2xs">Thời lượng:</span>
                        <span className="font-code font-semibold text-accent">{getCycleStats(selectedProduct.startDate, selectedProduct.endDate).totalDays} ngày</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-2xs">Trạng thái chu kỳ:</span>
                        <span className="font-semibold text-emerald-700">{getCycleStats(selectedProduct.startDate, selectedProduct.endDate).daysRemaining >= 0 ? `Còn ${getCycleStats(selectedProduct.startDate, selectedProduct.endDate).daysRemaining} ngày` : 'Đã kết thúc'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Commercials Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                      <span>Điều kiện thương mại</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-2xs">Giá niêm yết</span>
                        <span className="font-code font-semibold text-slate-800 text-sm">{formatVnd(selectedProduct.originalPrice)}</span>
                      </div>

                      <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
                        <div className="flex items-center justify-between">
                          <span className="text-rose-700 block text-2xs font-medium">Giá deal thúc đẩy</span>
                          <button
                            type="button"
                            onClick={() => handleOpenChangeRequestModal('promotionalPrice', 'Giá deal chiến dịch', selectedProduct.promotionalPrice)}
                            className="text-rose-600 hover:text-rose-800"
                            title="Đề xuất đổi giá deal"
                          >
                            <FileEdit className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-code font-semibold text-rose-700 text-sm">{formatVnd(selectedProduct.promotionalPrice)}</span>
                        <span className="text-2xs text-rose-600 font-semibold block mt-0.5">Giảm {selectedProduct.discountPercent}%</span>
                      </div>

                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-700 block text-2xs font-medium">Hoa hồng KOC</span>
                          <button
                            type="button"
                            onClick={() => handleOpenChangeRequestModal('affiliateRate', 'Hoa hồng Affiliate KOC (%)', selectedProduct.affiliateRate)}
                            className="text-emerald-600 hover:text-emerald-800"
                            title="Đề xuất đổi % hoa hồng"
                          >
                            <FileEdit className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-code font-semibold text-emerald-700 text-sm">{selectedProduct.affiliateRate}%</span>
                        <span className="text-2xs text-emerald-600 block mt-0.5">Affiliate trực tiếp</span>
                      </div>

                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-800 block text-2xs font-medium">Mẫu cấp / hạn mức</span>
                          <button
                            type="button"
                            onClick={() => handleOpenChangeRequestModal('monthlySampleQuota', 'Hạn mức mẫu cấp / tháng', selectedProduct.monthlySampleQuota)}
                            className="text-amber-700 hover:text-amber-900"
                            title="Đề xuất đổi hạn mức mẫu"
                          >
                            <FileEdit className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-code font-semibold text-amber-800 text-sm">
                          {selectedProduct.allocatedSampleCount} / {selectedProduct.monthlySampleQuota}
                        </span>
                        <span className="text-2xs text-amber-700 block mt-0.5">mẫu cho Creator</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600">Tồn kho khả dụng cam kết giữ riêng cho chiến dịch thúc đẩy:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-code font-semibold text-slate-900 text-sm">{selectedProduct.availableStock.toLocaleString()} SP</span>
                        <button
                          type="button"
                          onClick={() => handleOpenChangeRequestModal('availableStock', 'Tồn kho cam kết chiến dịch', selectedProduct.availableStock)}
                          className="text-accent hover:opacity-80 p-1"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* KOC / CREATOR BRIEF SPECIFICATIONS (B2C INPUT) */}
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="flex items-center gap-1.5 text-accent font-semibold">
                          <FileText className="w-4 h-4 text-accent" />
                          Thông tin brief KOC
                        </span>
                        {selectedProduct.briefUpdatedBy && (
                          <span className="text-2xs text-slate-500 block mt-0.5">
                            Cập nhật bởi {selectedProduct.briefUpdatedBy} • {selectedProduct.briefUpdatedAt ? new Date(selectedProduct.briefUpdatedAt).toLocaleDateString('vi-VN') : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditBriefModal(selectedProduct)}
                          className="px-2.5 py-1 rounded bg-accent-soft text-accent hover:opacity-90 font-semibold text-2xs flex items-center gap-1 border border-line"
                        >
                          <FileEdit className="w-3 h-3" />
                          {(!selectedProduct.usp || selectedProduct.b2cBriefStatus === 'PENDING_BRIEF') ? 'Bổ sung brief' : 'Chỉnh sửa'}
                        </button>
                        {selectedProduct.usp && (
                          <button
                            type="button"
                            onClick={() => handleCopyKocBrief(selectedProduct)}
                            className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-2xs flex items-center gap-1 border border-slate-200"
                          >
                            <Copy className="w-3 h-3" /> Sao chép
                          </button>
                        )}
                      </div>
                    </div>

                    {(!selectedProduct.usp || selectedProduct.b2cBriefStatus === 'PENDING_BRIEF') ? (
                      <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-amber-900 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Chưa có nội dung brief KOC cho sản phẩm này</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenEditBriefModal(selectedProduct)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white inline-flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          Bổ sung brief KOC
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 text-xs">
                        {/* USP */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            Điểm bán hàng độc nhất:
                          </span>
                          <p className="text-slate-800 font-medium">{selectedProduct.usp}</p>
                        </div>

                        {/* Key Message */}
                        <div className="p-3 bg-accent-soft rounded-xl border border-line space-y-1">
                          <span className="font-semibold text-ink flex items-center gap-1">
                            Thông điệp truyền thông chính:
                          </span>
                          <p className="text-slate-800 font-medium italic">&ldquo;{selectedProduct.keyMessage || selectedProduct.usp}&rdquo;</p>
                        </div>

                        {/* Viral Angle */}
                        <div className="p-3 bg-rose-50/40 rounded-xl border border-rose-100 space-y-1">
                          <span className="font-semibold text-rose-800 flex items-center gap-1">
                            Góc quay video gợi ý:
                          </span>
                          <p className="text-slate-800 font-medium">{selectedProduct.viralAngle}</p>
                        </div>

                        {/* Do & Don'ts */}
                        {selectedProduct.doAndDonts && (
                          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-1">
                            <span className="font-semibold text-amber-900 flex items-center gap-1">
                              Lưu ý nên & không nên làm khi review:
                            </span>
                            <p className="text-slate-800 whitespace-pre-line">{selectedProduct.doAndDonts}</p>
                          </div>
                        )}

                        {/* Sample Notes */}
                        {selectedProduct.sampleNotes && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              Chính sách & điều kiện cấp mẫu cho KOC:
                            </span>
                            <p className="text-slate-800">{selectedProduct.sampleNotes}</p>
                          </div>
                        )}

                        {/* Target Niche */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                          <span className="font-semibold text-slate-700 block">
                            Tệp KOC phù hợp đã thống nhất:
                          </span>
                          <div className="text-xs font-medium text-accent">
                            {selectedProduct.targetKocNiche.map((tag) => `#${tag}`).join(' · ')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeDrawerTab === 'DISCUSSIONS' && (
                <div className="space-y-4">
                  {/* Quick suggestion chips */}
                  <div className="space-y-1.5">
                    <span className="text-2xs font-semibold text-slate-500">
                      Phản biện nhanh 2 chiều:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {quickDiscussionChips.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCommentText(chip)}
                          className="px-2.5 py-1 rounded-full text-2xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors text-left"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment History List */}
                  <div className="space-y-3 pt-2">
                    {selectedProduct.comments.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        Chưa có trao đổi nào. Hãy là người đầu tiên đưa ra phản hồi hoặc đề xuất!
                      </div>
                    ) : (
                      selectedProduct.comments.map(c => (
                        <div
                          key={c.id}
                          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                            c.authorRole === 'GROWTH'
                              ? 'bg-accent-soft border-line ml-4'
                              : c.authorRole === 'B2C'
                              ? 'bg-rose-50/50 border-rose-100 mr-4'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-2xs">
                            <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                              <span className={`w-2 h-2 rounded-full ${c.authorRole === 'GROWTH' ? 'bg-accent' : 'bg-rose-600'}`} />
                              {c.authorName} ({c.authorRole})
                            </span>
                            <span className="text-slate-400 font-mono">
                              {new Date(c.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input Form */}
                  <form onSubmit={handleSendComment} className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Gửi phản hồi dưới tên: <strong>{activeAuthorName}</strong></span>
                      <select
                        value={commentType}
                        onChange={(e) => setCommentType(e.target.value as PushProductComment['type'])}
                        className="text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-700"
                      >
                        <option value="COMMENT">Trao đổi thông thường</option>
                        <option value="PRICE_DEAL">Thương lượng giá deal</option>
                        <option value="SAMPLE_REQUEST">Đề xuất hạn mức mẫu</option>
                        <option value="FEASIBILITY_FEEDBACK">Đánh giá khả thi</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nhập nội dung trao đổi, phản biện hoặc thương lượng điều kiện..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" /> Gửi
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeDrawerTab === 'CHANGE_REVIEW' && (
                <div className="space-y-6">
                  {/* Change Requests List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                      <span>Danh sách yêu cầu thay đổi</span>
                    </div>

                    {selectedProduct.changeRequests.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                        Chưa có yêu cầu thay đổi nào cho SKU này. Khi có biến động giá, kho hoặc chu kỳ, hãy tạo yêu cầu thay đổi.
                      </div>
                    ) : (
                      selectedProduct.changeRequests.map(cr => (
                        <div key={cr.id} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              Yêu cầu đổi: {cr.fieldLabel}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                              cr.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : cr.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {cr.status === 'APPROVED' ? 'Đã phê duyệt' : cr.status === 'REJECTED' ? 'Từ chối' : 'Chờ phê duyệt'}
                            </span>
                          </div>

                          {/* Diff Before vs After */}
                          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg text-xs font-mono">
                            <div>
                              <span className="text-slate-400 block text-2xs">Giá trị cũ:</span>
                              <span className="text-rose-600 line-through font-semibold">{String(cr.oldValue)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-2xs">Giá trị đề xuất mới:</span>
                              <span className="text-emerald-700 font-semibold">{String(cr.newValue)}</span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-600">
                            <strong>Lý do:</strong> {cr.reason}
                          </div>

                          <div className="text-2xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100">
                            <span>Đề xuất bởi: <strong>{cr.requestedBy}</strong> ({cr.requesterRole})</span>
                            {cr.reviewedBy && (
                              <span>Duyệt bởi: <strong>{cr.reviewedBy}</strong></span>
                            )}
                          </div>

                          {/* Approve / Reject Actions (Only counterpart can approve) */}
                          {cr.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleRejectChangeRequest(cr.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                              >
                                Từ chối
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveChangeRequest(cr.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs"
                              >
                                <Check className="w-3.5 h-3.5" /> Phê duyệt & cập nhật dữ liệu
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Audit Trail Log */}
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      Lịch sử thay đổi & quyết định
                    </span>

                    <div className="space-y-2 text-xs">
                      {selectedProduct.auditLogs.map(log => (
                        <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between text-2xs text-slate-500">
                            <span className="font-semibold text-slate-800">{log.action}</span>
                            <span className="font-mono">{log.timestamp}</span>
                          </div>
                          <p className="text-slate-600 text-2xs">{log.description}</p>
                          <div className="text-2xs text-slate-400">
                            Người thực hiện: <strong>{log.actorName}</strong> ({log.actorRole})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </Presence>

      {/* MODAL: KHỞI TẠO ĐỀ XUẤT SẢN PHẨM THÚC ĐẨY MỚI (GROWTH KHỞI TẠO) */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Khởi tạo sản phẩm thúc đẩy mới"
        size="lg"
      >
            <form onSubmit={handleCreateNewProduct} className="space-y-4 text-xs">
              {/* Row 1: Brand & Gian Hàng Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Thương hiệu *</label>
                  <select
                    value={newProductForm.brandId}
                    onChange={(e) => {
                      const bId = e.target.value;
                      const br = brands.find(b => b.id === bId);
                      const defaultStore = br?.stores?.[0];
                      setNewProductForm(prev => ({
                        ...prev,
                        brandId: bId,
                        brandCategory: br?.category || 'Mẹ & Bé',
                        storeId: defaultStore?.id || '',
                        storeName: defaultStore?.storeName || '',
                        platform: defaultStore?.platform || 'SHOPEE_MALL'
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                  >
                    {availableBrands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Gian hàng áp dụng *</label>
                  <select
                    value={newProductForm.storeId}
                    onChange={(e) => {
                      const sId = e.target.value;
                      const br = brands.find(b => b.id === newProductForm.brandId);
                      const st = br?.stores?.find(s => s.id === sId);
                      setNewProductForm(prev => ({
                        ...prev,
                        storeId: sId,
                        storeName: st?.storeName || '',
                        platform: st?.platform || 'SHOPEE_MALL'
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20 font-medium"
                  >
                    {brands.find(b => b.id === newProductForm.brandId)?.stores?.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.storeName} ({s.platform === 'TIKTOK_SHOP' ? 'TikTok' : 'Shopee'})
                      </option>
                    )) || (
                      <>
                        <option value="store-sp">Shopee Mall chính hãng</option>
                        <option value="store-tts">TikTok Shop Official</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Row 2: Product Name & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-slate-700 block">Tên sản phẩm thúc đẩy *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Kem bôi dịu da Kutieskin 30g"
                    value={newProductForm.productName}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, productName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Mã SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="KUTIE-SOOTH-30G"
                    value={newProductForm.sku}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20 font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Chu kỳ ngày bắt đầu & kết thúc */}
              <div className="p-3 bg-accent-soft rounded-xl border border-line space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    Chu kỳ áp dụng thúc đẩy (ngày bắt đầu & kết thúc) *
                  </span>
                  <span className="text-2xs font-mono text-accent font-semibold bg-white px-2 py-0.5 rounded border border-line">
                    Thời lượng: {getCycleStats(newProductForm.startDate, newProductForm.endDate).totalDays} ngày
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewProductForm(prev => ({
                      ...prev,
                      startDate: '2026-10-01',
                      endDate: '2026-10-31',
                      cycleType: 'MONTHLY'
                    }))}
                    className="px-2 py-1 rounded text-2xs font-medium border bg-white text-slate-700 hover:bg-slate-100"
                  >
                    Toàn tháng 10
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProductForm(prev => ({
                      ...prev,
                      startDate: '2026-10-05',
                      endDate: '2026-10-20',
                      cycleType: 'MEGA_CAMPAIGN'
                    }))}
                    className="px-2 py-1 rounded text-2xs font-medium border bg-white text-slate-700 hover:bg-slate-100"
                  >
                    Mega 10.10
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProductForm(prev => ({
                      ...prev,
                      startDate: '2026-11-01',
                      endDate: '2026-11-30',
                      cycleType: 'MONTHLY'
                    }))}
                    className="px-2 py-1 rounded text-2xs font-medium border bg-white text-slate-700 hover:bg-slate-100"
                  >
                    Tháng 11 (tương lai)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-2xs text-slate-600 block mb-0.5">Ngày bắt đầu:</label>
                    <input
                      type="date"
                      required
                      value={newProductForm.startDate}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-2xs text-slate-600 block mb-0.5">Ngày kết thúc:</label>
                    <input
                      type="date"
                      required
                      value={newProductForm.endDate}
                      onChange={(e) => setNewProductForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Pricing, Stock, Commission, Sample Quota (NO TARGET GMV) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Giá niêm yết (VNĐ)</label>
                  <input
                    type="number"
                    value={newProductForm.originalPrice}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, originalPrice: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Giá deal khuyến mãi</label>
                  <input
                    type="number"
                    value={newProductForm.promotionalPrice}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, promotionalPrice: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-semibold text-rose-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Hoa hồng Affiliate (%)</label>
                  <input
                    type="number"
                    value={newProductForm.affiliateRate}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, affiliateRate: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-semibold text-emerald-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Hạn mức mẫu cấp</label>
                  <input
                    type="number"
                    value={newProductForm.monthlySampleQuota}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, monthlySampleQuota: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Row 5: Available Stock */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Tồn kho cam kết giữ cho chiến dịch</label>
                <input
                  type="number"
                  value={newProductForm.availableStock}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, availableStock: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                />
              </div>



              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Khởi tạo & chuyển sang B2C bổ sung brief
                </button>
              </div>
            </form>
      </Modal>

      {/* MODAL: B2C BỔ SUNG & CẬP NHẬT THÔNG TIN BRIEF KOC / CREATOR */}
      <Modal
        open={Boolean(isEditBriefModalOpen && briefFormProduct)}
        onClose={() => setIsEditBriefModalOpen(false)}
        title={briefFormProduct ? `Cập nhật brief KOC · ${briefFormProduct.sku}` : 'Cập nhật brief KOC'}
        size="lg"
      >
        {briefFormProduct && (
            <form onSubmit={handleSaveB2cBrief} className="space-y-4 text-xs">


              {/* USP */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Điểm bán hàng độc nhất *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="VD: 100% thảo dược Nano Bạc & Yến mạch Pháp, dịu ngứa chàm sữa sau 3 ngày..."
                  value={briefForm.usp}
                  onChange={(e) => setBriefForm(prev => ({ ...prev, usp: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {/* Key Message */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Thông điệp truyền thông chính
                </label>
                <input
                  type="text"
                  placeholder="VD: Dịu êm da bé tức thì - Mẹ an tâm trọn giấc nồng"
                  value={briefForm.keyMessage}
                  onChange={(e) => setBriefForm(prev => ({ ...prev, keyMessage: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {/* Viral Angle */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Góc quay video gợi ý
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Mẹ bỉm chia sẻ khoảnh khắc cứu nguy làn da bé nửa đêm, cận cảnh chất kem mỏng nhẹ thẩm thấu nhanh..."
                  value={briefForm.viralAngle}
                  onChange={(e) => setBriefForm(prev => ({ ...prev, viralAngle: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {/* Target KOC Niches */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Tệp KOC phù hợp (phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="Mẹ Bỉm Sữa, Reviewer Da Liễu, Sinh Viên"
                  value={briefForm.targetKocNiche}
                  onChange={(e) => setBriefForm(prev => ({ ...prev, targetKocNiche: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {/* Links: PDP & Brief Doc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Link sản phẩm trên gian hàng
                  </label>
                  <input
                    type="url"
                    placeholder="https://shopee.vn/... hoặc https://shop.tiktok.com/..."
                    value={briefForm.pdpUrl}
                    onChange={(e) => setBriefForm(prev => ({ ...prev, pdpUrl: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Link tài liệu brief chi tiết
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... hoặc Lark Docs"
                    value={briefForm.briefUrl}
                    onChange={(e) => setBriefForm(prev => ({ ...prev, briefUrl: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-2xs"
                  />
                </div>
              </div>

              {/* Do & Don'ts */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Lưu ý nên và không nên làm khi review
                </label>
                <textarea
                  rows={2}
                  placeholder="NÊN: quay cận cảnh sản phẩm, dùng thử trên da... KHÔNG: so sánh dìm hàng nhãn khác, cam kết chữa khỏi 100%..."
                  value={briefForm.doAndDonts}
                  onChange={(e) => setBriefForm(prev => ({ ...prev, doAndDonts: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {/* Sample Conditions */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Chính sách & điều kiện cấp mẫu cho KOC
                </label>
                <input
                  type="text"
                  placeholder="VD: Cấp 01 tuýp 30g fullsize cho KOC cam kết lên video trong 7 ngày..."
                  value={briefForm.sampleNotes}
                  onChange={(e) => setBriefForm(prev => ({ ...prev, sampleNotes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditBriefModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Lưu & hoàn tất brief KOC
                </button>
              </div>
            </form>
        )}
      </Modal>

      {/* MODAL: TẠO CHANGE REQUEST (YÊU CẦU THAY ĐỔI ĐIỀU KIỆN / CHU KỲ) */}
      <Modal
        open={isChangeRequestModalOpen}
        onClose={() => setIsChangeRequestModalOpen(false)}
        title={`Yêu cầu thay đổi: ${changeRequestForm.fieldLabel}`}
        size="md"
      >
            <form onSubmit={handleSubmitChangeRequest} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-2xs">Giá trị hiện tại:</span>
                <span className="font-mono font-semibold text-slate-800 text-sm">{String(changeRequestForm.oldValue)}</span>
              </div>

              {changeRequestForm.type === 'CHANGE_CYCLE_DATES' ? (
                <div className="space-y-3 p-3 bg-accent-soft rounded-xl border border-line">
                  <span className="font-semibold text-slate-800 block text-xs">
                    Chọn khoảng ngày chu kỳ mới:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-2xs text-slate-600 block mb-0.5">Ngày bắt đầu:</label>
                      <input
                        type="date"
                        required
                        value={changeRequestForm.startDateVal}
                        onChange={(e) => setChangeRequestForm(prev => ({ ...prev, startDateVal: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-2xs text-slate-600 block mb-0.5">Ngày kết thúc:</label>
                      <input
                        type="date"
                        required
                        value={changeRequestForm.endDateVal}
                        onChange={(e) => setChangeRequestForm(prev => ({ ...prev, endDateVal: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Giá trị mới đề xuất *</label>
                  <input
                    type="text"
                    required
                    value={changeRequestForm.newValue}
                    onChange={(e) => setChangeRequestForm(prev => ({ ...prev, newValue: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-semibold text-accent text-sm"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Lý do đề xuất thay đổi *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Nêu rõ lý do (ví dụ: Kho tổng nhập thêm hàng, KOC xin tăng hạn mức mẫu để live, gia hạn chu kỳ đón đợt sale lương về...)"
                  value={changeRequestForm.reason}
                  onChange={(e) => setChangeRequestForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsChangeRequestModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Gửi yêu cầu thay đổi
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
};
