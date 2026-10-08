'use client';

import React, { useState, useMemo } from 'react';
import {
  Flame,
  Sparkles,
  Lock,
  Unlock,
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
  Filter,
  Plus,
  RefreshCw,
  FileText,
  ExternalLink,
  ShieldCheck,
  Layers,
  Award,
  Check,
  X,
  ChevronRight,
  Calendar,
  ArrowRight,
  Clock,
  DollarSign,
  Percent,
  Boxes,
  HelpCircle,
  ThumbsUp,
  FileEdit,
  SlidersHorizontal,
  ChevronDown,
  Copy,
  ShoppingBag,
  Share2,
  PlayCircle,
  CheckCheck
} from 'lucide-react';
import {
  UserProfile,
  BrandDetail,
  PushProductItem,
  PushProductStatus,
  PushProductFeasibility,
  PushProductRole,
  PushProductComment,
  PushProductChangeRequest,
  PushProductAuditLog,
  ChangeRequestType
} from '../../lib/types';
import { INITIAL_PUSH_PRODUCTS } from '../../lib/mockData';

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

  // Active Role Switcher for Collaboration Simulation
  const [activeRole, setActiveRole] = useState<PushProductRole>(
    currentUser.role === 'BRAND_MEMBER' || currentUser.role === 'MANAGER' ? 'GROWTH' : 'B2C'
  );
  const [activeAuthorName, setActiveAuthorName] = useState<string>(
    currentUser.role === 'BRAND_MEMBER' || currentUser.role === 'MANAGER'
      ? 'Hoàng Long (Growth Lead)'
      : 'Khánh Vy (Booking Lead)'
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
    oldValue: any;
    newValue: any;
    startDateVal?: string;
    endDateVal?: string;
    reason: string;
  }>({
    type: 'CHANGE_PRICE',
    field: 'promotionalPrice',
    fieldLabel: 'Giá Deal Chiến Dịch',
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
    'Đề xuất gia hạn chu kỳ thêm 5 ngày để đón trọn đợt Sale Lương Về (Payday)',
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

  // Helper: Format Date String to DD/MM/YYYY
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Helper: Format VND
  const formatVnd = (num: number) => {
    return (num || 0).toLocaleString('vi-VN') + ' đ';
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
      notify('Vui lòng nhập Điểm bán hàng độc nhất (USP) cho KOC!', 'warning');
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
          action: 'B2C Cập Nhật Brief KOC',
          actorName: activeAuthorName,
          actorRole: 'B2C',
          description: `B2C đã cập nhật thông tin Brief KOC (USP: "${briefForm.usp.slice(0, 40)}...")`
        }
      ]
    };

    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (selectedProduct?.id === updated.id) {
      setSelectedProduct(updated);
    }
    setIsEditBriefModalOpen(false);
    notify(`Đã lưu thông tin Brief KOC cho SKU [${updated.sku}] thành công! B2C có thể sao chép gửi Creator ngay.`);
  };

  // Helper: Copy KOC Brief to Clipboard
  const handleCopyKocBrief = (prod: PushProductItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!prod.usp || !prod.usp.trim()) {
      notify('Sản phẩm này chưa có nội dung Brief KOC do B2C thiết lập. B2C vui lòng bổ sung trước!', 'warning');
      handleOpenEditBriefModal(prod);
      return;
    }
    const briefText = `[BRIEF KOC / CREATOR] - SẢN PHẨM THÚC ĐẨY
Thương hiệu: ${prod.brandName}
Gian hàng: ${prod.storeName} (${prod.platform === 'TIKTOK_SHOP' ? 'TikTok Shop' : 'Shopee Mall'})
Sản phẩm: ${prod.productName} (Mã SKU: ${prod.sku})
Chu kỳ hiệu lực: ${formatDateDisplay(prod.startDate)} → ${formatDateDisplay(prod.endDate)}

CHÍNH SÁCH THƯƠNG MẠI & QUYỀN LỢI:
- Giá niêm yết: ${formatVnd(prod.originalPrice)} | Giá deal chiến dịch: ${formatVnd(prod.promotionalPrice)} (-${prod.discountPercent}%)
- Hoa hồng Affiliate KOC: ${prod.affiliateRate}%
- Chính sách mẫu: ${prod.sampleNotes || `Cấp mẫu dùng thử fullsize cho Creator có video tương tác tốt.`}

NỘI DUNG & THÔNG ĐIỆP TRUYỀN THÔNG:
- USP nổi bật: ${prod.usp}
- Thông điệp chính (Key Message): ${prod.keyMessage || prod.usp}
- Góc quay gợi ý (Viral Angle): ${prod.viralAngle}
- Tệp Creator phù hợp: ${prod.targetKocNiche.join(', ')}
${prod.doAndDonts ? `- Quy tắc Do & Don'ts: ${prod.doAndDonts}` : ''}

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
    const b2cName = activeRole === 'B2C' ? activeAuthorName : product.b2cPic || 'Khánh Vy (Booking Lead)';

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
          action: 'Chốt Duyệt & Khóa SP Thúc Đẩy (LOCKED)',
          actorName: activeAuthorName,
          actorRole: activeRole,
          description: `Hai bên Growth & B2C đã đạt đồng thuận. Khóa duyệt SKU ${product.sku} cho chu kỳ ${formatDateDisplay(product.startDate)} → ${formatDateDisplay(product.endDate)}.`
        }
      ]
    };

    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (selectedProduct?.id === updated.id) {
      setSelectedProduct(updated);
    }
    notify(`Đã CHỐT DUYỆT thành công sản phẩm thúc đẩy [${product.productName}]! Dữ liệu đã sẵn sàng để B2C brief KOC.`);
  };

  // Action: Open Create Change Request
  const handleOpenChangeRequestModal = (fieldKey: string, fieldLabel: string, currValue: any) => {
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
          action: 'Tạo Yêu Cầu Thay Đổi (Change Request)',
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
    notify(`Đã gửi Yêu Cầu Thay Đổi [${changeRequestForm.fieldLabel}]. Chờ phía đối ứng xem xét phê duyệt!`, 'info');
  };

  // Action: Approve Change Request
  const handleApproveChangeRequest = (crId: string) => {
    if (!selectedProduct) return;
    const cr = selectedProduct.changeRequests.find(c => c.id === crId);
    if (!cr) return;

    let updatedFields: any = { [cr.field]: cr.newValue };
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
          action: 'Phê Duyệt Yêu Cầu Thay Đổi',
          actorName: activeAuthorName,
          actorRole: activeRole,
          description: `Đã phê duyệt đổi [${cr.fieldLabel}] thành ${cr.newValue}. Cập nhật trực tiếp vào Master Data.`
        }
      ]
    };

    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProduct(updated);
    notify(`Đã phê duyệt thay đổi [${cr.fieldLabel}]! Dữ liệu Master Data đã được cập nhật đồng bộ.`);
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
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('vi-VN', { hour12: false }),
          action: 'Từ Chối Yêu Cầu Thay Đổi',
          actorName: activeAuthorName,
          actorRole: activeRole,
          description: `Từ chối yêu cầu thay đổi. lý do: ${reasonText}`
        }
      ]
    };

    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSelectedProduct(updated);
    notify('Đã từ chối yêu cầu thay đổi. Giữ nguyên giá trị Master Data hiện tại.', 'warning');
  };

  // Action: Submit Propose New Push Product
  const handleCreateNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.productName.trim() || !newProductForm.sku.trim()) {
      notify('Vui lòng điền Tên sản phẩm và Mã SKU!', 'warning');
      return;
    }

    const brand = brands.find(b => b.id === newProductForm.brandId);
    const brandName = brand?.name || 'Thương Hiệu Mới';
    
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
      campaignName: 'Chiến Dịch Thúc Đẩy Định Kỳ',
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
      b2cPic: 'Khánh Vy',
      status: 'PROPOSED',
      proposedAt: new Date().toISOString(),
      comments: [
        {
          id: `comm-${Date.now()}`,
          authorName: activeAuthorName,
          authorRole: activeRole,
          content: `Growth khởi tạo đề xuất SP Thúc Đẩy mới cho gian hàng ${storeName}. Đề nghị B2C đánh giá tệp KOC và phản biện điều kiện mẫu/giá!`,
          type: 'COMMENT',
          createdAt: new Date().toISOString()
        }
      ],
      changeRequests: [],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('vi-VN', { hour12: false }),
          action: 'Đề Xuất Sản Phẩm Thúc Đẩy Mới',
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
    notify(`Đã khởi tạo đề xuất Sản Phẩm Thúc Đẩy [${newProd.productName}] cho ${storeName}!`);
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
            Đang Trao đổi
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            <History className="w-3.5 h-3.5 text-gray-500" />
            Lịch sử lưu trữ
          </span>
        );
    }
  };

  // Render Platform Badge (TikTok Shop vs Shopee)
  const renderPlatformBadge = (platform: 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA', storeName?: string) => {
    if (platform === 'TIKTOK_SHOP') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-2xs font-semibold bg-slate-900 text-white border border-slate-700 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          TikTok Shop
        </span>
      );
    }
    if (platform === 'SHOPEE_MALL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-2xs font-semibold bg-orange-600 text-white border border-orange-500 shadow-2xs">
          <ShoppingBag className="w-3 h-3 text-white" />
          Shopee Mall
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-blue-600 text-white">
        Lazada
      </span>
    );
  };

  // Render Cycle Countdown Badge
  const renderCycleBadge = (prod: PushProductItem) => {
    const { daysRemaining, status } = getCycleStats(prod.startDate, prod.endDate);
    return (
      <div className="flex items-center flex-wrap gap-1.5 text-2xs">
        <span className="inline-flex items-center gap-1 font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs font-semibold">
          <Calendar className="w-3 h-3 text-indigo-500" />
          {formatDateDisplay(prod.startDate)} → {formatDateDisplay(prod.endDate)}
        </span>
        {status === 'ACTIVE' && (
          <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Còn {Math.max(0, daysRemaining)} ngày
          </span>
        )}
        {status === 'UPCOMING' && (
          <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Sắp bắt đầu
          </span>
        )}
        {status === 'EXPIRED' && (
          <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            Đã kết thúc
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Clean Top Bar: Role Switcher & Create Action */}
      <div className="bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              Sản phẩm thúc đẩy
            </h1>
            <p className="text-xs text-slate-500">
              Thiết lập điều kiện chiến dịch, tồn kho, mẫu và brief KOC giữa Growth & B2C
            </p>
          </div>
        </div>

        {/* Persona Switcher & Create Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <span className="text-2xs text-slate-500 px-2 flex items-center gap-1">
              Góc nhìn:
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveRole('GROWTH');
                setActiveAuthorName('Hoàng Long (Growth Lead)');
                notify('Chuyển sang góc nhìn: Growth Team', 'info');
              }}
              className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
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
                setActiveAuthorName('Khánh Vy (Booking Lead)');
                notify('Chuyển sang góc nhìn: B2C Team', 'info');
              }}
              className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
                activeRole === 'B2C'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              B2C Booking
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Đề xuất sản phẩm thúc đẩy
          </button>
        </div>
      </div>

      {/* TIME HORIZON TABS: Đang mở bán vs Kế hoạch vs Lịch sử */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTimeHorizon('AVAILABLE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              timeHorizon === 'AVAILABLE'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đang mở bán
            <span className={`px-1.5 py-0.2 rounded text-2xs font-mono ${
              timeHorizon === 'AVAILABLE' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {horizonCounts.available}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTimeHorizon('FUTURE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              timeHorizon === 'FUTURE'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Kế hoạch sắp tới
            <span className={`px-1.5 py-0.2 rounded text-2xs font-mono ${
              timeHorizon === 'FUTURE' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {horizonCounts.future}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTimeHorizon('HISTORY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              timeHorizon === 'HISTORY'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Lịch sử
            <span className={`px-1.5 py-0.2 rounded text-2xs font-mono ${
              timeHorizon === 'HISTORY' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {horizonCounts.history}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTimeHorizon('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              timeHorizon === 'ALL'
                ? 'bg-slate-200 text-slate-900 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả ({products.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Platform Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setSelectedPlatform('ALL')}
              className={`px-2.5 py-1 rounded text-2xs font-medium transition-colors ${
                selectedPlatform === 'ALL' ? 'bg-white text-indigo-600 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mọi sàn
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatform('SHOPEE_MALL')}
              className={`px-2.5 py-1 rounded text-2xs font-medium transition-colors flex items-center gap-1 ${
                selectedPlatform === 'SHOPEE_MALL' ? 'bg-orange-600 text-white shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3 h-3" /> Shopee
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatform('TIKTOK_SHOP')}
              className={`px-2.5 py-1 rounded text-2xs font-medium transition-colors flex items-center gap-1 ${
                selectedPlatform === 'TIKTOK_SHOP' ? 'bg-slate-900 text-white shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> TikTok
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Tổng sản phẩm</span>
            <Boxes className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-semibold text-slate-900">{metrics.totalCount} <span className="text-xs font-normal text-slate-500">SKU</span></div>
          <div className="text-2xs text-slate-400 mt-0.5">Theo gian hàng sàn</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Đã chốt duyệt</span>
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-semibold text-slate-900">{metrics.lockedCount}</div>
          <div className="text-2xs text-slate-500 mt-0.5">
            Đạt {metrics.lockRatio}% tổng danh mục
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Đang trao đổi</span>
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-semibold text-slate-900">{metrics.inDiscussionCount}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Phản biện điều kiện deal/mẫu</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Hạn mức mẫu</span>
            <Package className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-semibold text-slate-900">
            {metrics.totalSampleAllocated} <span className="text-xs font-normal text-slate-500">/ {metrics.totalSampleQuota}</span>
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">
            Đã cấp {metrics.totalSampleQuota > 0 ? Math.round((metrics.totalSampleAllocated / metrics.totalSampleQuota) * 100) : 0}% quota
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Tồn kho khả dụng</span>
            <Store className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-semibold text-slate-900">
            {metrics.totalAvailableStock.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">SP</span>
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">Cam kết cho chiến dịch</div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Search box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo SKU, tên sản phẩm, gian hàng, thương hiệu..."
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
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
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
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'GRID'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Dạng bảng
              </button>
            </div>

            {/* Propose Product Button */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm sản phẩm
            </button>
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
              <option value="ALL">Tất cả thương hiệu</option>
              <option value="brand-kutieskin">Kutieskin Mama & Baby</option>
              <option value="brand-bye-bye-blemish">Bye Bye Blemish</option>
              <option value="brand-royal-ausnz">Royal Ausnz Úc</option>
              <option value="brand-phcare">pHCare Japan</option>
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
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
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
              className="text-slate-500 hover:text-indigo-600 font-medium underline ml-auto text-xs"
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
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Vui lòng kiểm tra lại bộ lọc thời gian ({timeHorizon === 'AVAILABLE' ? 'Đang Available' : timeHorizon === 'FUTURE' ? 'Kế Hoạch Tương Lai' : 'Lịch Sử'}) hoặc nhấn nút bên dưới để khởi tạo sản phẩm mới.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Khởi tạo sản phẩm thúc đẩy mới
              </button>
            </div>
          ) : (
            brandStoreHierarchy.map(bGroup => (
              <div key={bGroup.brandId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Brand Header Banner */}
                <div className="bg-slate-50 p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center text-lg shadow-sm">
                      {bGroup.brandName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">{bGroup.brandName}</h2>
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-indigo-100 text-indigo-700">
                          {bGroup.storeGroups.length} Gian Hàng
                        </span>
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {bGroup.totalProductsCount} sản phẩm
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
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

                  <div className="flex items-center gap-2">
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
                <div className="p-6 space-y-8 bg-slate-50/50">
                  {bGroup.storeGroups.map(sGroup => (
                    <div key={sGroup.storeId} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                      {/* Store Sub-Header */}
                      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {renderPlatformBadge(sGroup.platform, sGroup.storeName)}
                          <span className="font-semibold text-slate-800 text-sm">
                            {sGroup.storeName}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">({sGroup.items.length} SKU)</span>
                          {sGroup.storeUrl && (
                            <a
                              href={sGroup.storeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1 font-medium ml-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Ghé gian hàng
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>Tồn kho gian hàng: <strong className="text-slate-800">{sGroup.totalStock.toLocaleString()}</strong></span>
                          <span>•</span>
                          <span>Hạn mức mẫu: <strong className="text-amber-700">{sGroup.totalSampleQuota}</strong></span>
                          <button
                            type="button"
                            onClick={() => handleOpenCreateForStore(bGroup.brandId, sGroup.storeId)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs flex items-center gap-1 ml-2"
                          >
                            <Plus className="w-3 h-3" /> Thêm SKU
                          </button>
                        </div>
                      </div>

                      {/* Product Cards Grid inside this Store */}
                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sGroup.items.map(prod => (
                          <div
                            key={prod.id}
                            onClick={() => {
                              setSelectedProduct(prod);
                              setActiveDrawerTab('SPECS');
                            }}
                            className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden group"
                          >
                            {/* Card Top: Badges & Cycle */}
                            <div className="p-4 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  {prod.sku}
                                </span>
                                {renderStatusBadge(prod.status)}
                              </div>

                              <div>
                                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                  {prod.productName}
                                </h3>
                                <div className="mt-1">
                                  {renderCycleBadge(prod)}
                                </div>
                              </div>

                              {/* Commercial Conditions Strip */}
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Giá deal chiến dịch:</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="line-through text-slate-400 text-2xs font-mono">
                                      {formatVnd(prod.originalPrice)}
                                    </span>
                                    <span className="font-semibold text-rose-600 font-mono text-sm">
                                      {formatVnd(prod.promotionalPrice)}
                                    </span>
                                    <span className="px-1 py-0.2 rounded bg-rose-100 text-rose-700 text-2xs font-semibold">
                                      -{prod.discountPercent}%
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Hoa Hồng Affiliate:</span>
                                  <span className="font-semibold text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {prod.affiliateRate}%
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Tồn kho khả dụng:</span>
                                  <span className="font-semibold text-slate-800 font-mono">
                                    {prod.availableStock.toLocaleString()} SP
                                  </span>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                                  <span className="text-slate-500">Hạn mức mẫu cấp:</span>
                                  <span className="font-semibold text-amber-700 font-mono">
                                    {prod.allocatedSampleCount} / {prod.monthlySampleQuota} mẫu
                                  </span>
                                </div>
                              </div>

                              {/* Key Message & USP Brief Highlight */}
                              <div className="space-y-1 text-xs">
                                <div className="text-2xs font-semibold text-slate-700 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    Brief KOC (B2C Input):
                                  </span>
                                  {(!prod.usp || prod.b2cBriefStatus === 'PENDING_BRIEF') && (
                                    <span className="text-2xs font-medium text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded">
                                      Chờ B2C bổ sung
                                    </span>
                                  )}
                                </div>
                                {prod.usp ? (
                                  <p className="text-slate-600 text-2xs line-clamp-2 italic bg-amber-50/40 p-2 rounded border border-amber-100">
                                    "{prod.keyMessage || prod.usp}"
                                  </p>
                                ) : (
                                  <div className="p-2 rounded border border-dashed border-amber-300 bg-amber-50/40 text-amber-800 text-2xs flex items-center justify-between">
                                    <span>Chưa cập nhật USP & thông điệp KOC</span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenEditBriefModal(prod, e)}
                                      className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                      + Nhập brief
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* KOC Niche Tags */}
                              <div className="flex flex-wrap gap-1">
                                {prod.targetKocNiche.slice(0, 3).map((tag, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 rounded text-2xs bg-slate-100 text-slate-600 border border-slate-200">
                                    #{tag}
                                  </span>
                                ))}
                                {prod.targetKocNiche.length > 3 && (
                                  <span className="px-1.5 py-0.5 rounded text-2xs bg-slate-100 text-slate-500">
                                    +{prod.targetKocNiche.length - 3}
                                  </span>
                                )}
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
                                  Bổ sung Brief KOC
                                </button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyKocBrief(prod, e)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                      copiedId === prod.id
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-indigo-600'
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
                                        Chép Brief KOC
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditBriefModal(prod, e)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
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
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                    title="Mở tab phân bổ KOC booking cho SKU này"
                                  >
                                    <Users className="w-3.5 h-3.5" />
                                    Book KOC
                                  </button>
                                )}
                                <span className="text-slate-400 group-hover:text-indigo-600 text-xs font-medium flex items-center gap-0.5">
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
                  <th className="py-3.5 px-4">Brand & Gian Hàng</th>
                  <th className="py-3.5 px-4">Chu kỳ hiệu lực</th>
                  <th className="py-3.5 px-4 text-right">Giá deal / niêm yết</th>
                  <th className="py-3.5 px-4 text-center">Hoa Hồng</th>
                  <th className="py-3.5 px-4 text-right">Tồn Kho</th>
                  <th className="py-3.5 px-4 text-center">Mẫu đã cấp / Quota</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-center">Thao Tác</th>
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
                      <div className="font-mono font-semibold text-indigo-700">{prod.sku}</div>
                      <div className="font-semibold text-slate-900 line-clamp-1">{prod.productName}</div>
                      <div className="text-2xs text-slate-500 line-clamp-1 italic mt-0.5">
                        USP: {prod.usp}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{prod.brandName}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        {renderPlatformBadge(prod.platform)}
                        <span className="text-2xs text-slate-600 line-clamp-1">{prod.storeName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {renderCycleBadge(prod)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <div className="font-semibold text-rose-600">{formatVnd(prod.promotionalPrice)}</div>
                      <div className="text-2xs text-slate-400 line-through">{formatVnd(prod.originalPrice)}</div>
                      <span className="text-2xs font-semibold text-rose-600">(-{prod.discountPercent}%)</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {prod.affiliateRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                      {prod.availableStock.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
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
                          title="B2C bổ sung Brief KOC"
                        >
                          <FileEdit className="w-3 h-3 text-amber-600" />
                          Nhập Brief
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleCopyKocBrief(prod, e)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xs font-semibold inline-flex items-center gap-1"
                            title="Sao chép Brief KOC"
                          >
                            <Copy className="w-3 h-3" />
                            Chép Brief
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditBriefModal(prod, e)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
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
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                    {selectedProduct.sku}
                  </span>
                  {renderStatusBadge(selectedProduct.status)}
                  {renderPlatformBadge(selectedProduct.platform)}
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
            <div className="px-5 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleCopyKocBrief(selectedProduct)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Sao Chép Brief KOC / Creator
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditBriefModal(selectedProduct)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold flex items-center gap-1.5 text-xs transition-colors"
                >
                  <FileEdit className="w-3.5 h-3.5 text-indigo-600" />
                  {(!selectedProduct.usp || selectedProduct.b2cBriefStatus === 'PENDING_BRIEF') ? 'Bổ sung Brief KOC (B2C)' : 'Sửa Brief KOC'}
                </button>
                {selectedProduct.pdpUrl && (
                  <a
                    href={selectedProduct.pdpUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-1 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Link Gian Hàng
                  </a>
                )}
                {selectedProduct.briefUrl && (
                  <a
                    href={selectedProduct.briefUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-1 text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" /> Doc Brief Chi Tiết
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
            <div className="flex border-b border-slate-200 px-5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveDrawerTab('SPECS')}
                className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
                  activeDrawerTab === 'SPECS'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Tag className="w-4 h-4" />
                Thông số Master Data & brief KOC
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawerTab('DISCUSSIONS')}
                className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
                  activeDrawerTab === 'DISCUSSIONS'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Thảo Luận & Phản Biện ({selectedProduct.comments.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawerTab('CHANGE_REVIEW')}
                className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
                  activeDrawerTab === 'CHANGE_REVIEW'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                Review Thay Đổi & Audit Log ({selectedProduct.changeRequests.length})
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeDrawerTab === 'SPECS' && (
                <div className="space-y-6">
                  {/* Cycle Management Card */}
                  <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        Quản trị Chu kỳ & thời lượng thúc đẩy
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenChangeRequestModal('cycleDates', 'Chu Kỳ Thúc Đẩy (Ngày Bắt Đầu & Kết Thúc)', `${selectedProduct.startDate} → ${selectedProduct.endDate}`)}
                        className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold underline flex items-center gap-1"
                      >
                        <FileEdit className="w-3.5 h-3.5" /> Đổi ngày / gia hạn Chu kỳ
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-indigo-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-2xs">Ngày bắt đầu:</span>
                        <span className="font-mono font-semibold text-slate-800">{formatDateDisplay(selectedProduct.startDate)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-2xs">Ngày kết thúc:</span>
                        <span className="font-mono font-semibold text-slate-800">{formatDateDisplay(selectedProduct.endDate)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-2xs">Thời lượng:</span>
                        <span className="font-mono font-semibold text-indigo-700">{getCycleStats(selectedProduct.startDate, selectedProduct.endDate).totalDays} ngày</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-2xs">Trạng thái Chu kỳ:</span>
                        <span className="font-semibold text-emerald-700">{getCycleStats(selectedProduct.startDate, selectedProduct.endDate).daysRemaining >= 0 ? `Còn ${getCycleStats(selectedProduct.startDate, selectedProduct.endDate).daysRemaining} ngày` : 'Đã kết thúc'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Commercials Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                      <span>Điều kiện thương mại (Growth thiết lập với sàn)</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-2xs">Giá niêm yết</span>
                        <span className="font-mono font-semibold text-slate-800 text-sm">{formatVnd(selectedProduct.originalPrice)}</span>
                      </div>

                      <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
                        <div className="flex items-center justify-between">
                          <span className="text-rose-700 block text-2xs font-medium">Giá deal thúc đẩy</span>
                          <button
                            type="button"
                            onClick={() => handleOpenChangeRequestModal('promotionalPrice', 'Giá Deal Chiến Dịch', selectedProduct.promotionalPrice)}
                            className="text-rose-600 hover:text-rose-800"
                            title="Đề xuất đổi giá deal"
                          >
                            <FileEdit className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-mono font-semibold text-rose-700 text-sm">{formatVnd(selectedProduct.promotionalPrice)}</span>
                        <span className="text-2xs text-rose-600 font-semibold block mt-0.5">Giảm {selectedProduct.discountPercent}%</span>
                      </div>

                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-700 block text-2xs font-medium">Hoa Hồng KOC</span>
                          <button
                            type="button"
                            onClick={() => handleOpenChangeRequestModal('affiliateRate', 'Hoa Hồng Affiliate KOC (%)', selectedProduct.affiliateRate)}
                            className="text-emerald-600 hover:text-emerald-800"
                            title="Đề xuất đổi % hoa hồng"
                          >
                            <FileEdit className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-mono font-semibold text-emerald-700 text-sm">{selectedProduct.affiliateRate}%</span>
                        <span className="text-2xs text-emerald-600 block mt-0.5">Affiliate trực tiếp</span>
                      </div>

                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-800 block text-2xs font-medium">Mẫu cấp / Quota</span>
                          <button
                            type="button"
                            onClick={() => handleOpenChangeRequestModal('monthlySampleQuota', 'Hạn Mức Mẫu Cấp / Tháng', selectedProduct.monthlySampleQuota)}
                            className="text-amber-700 hover:text-amber-900"
                            title="Đề xuất đổi hạn mức mẫu"
                          >
                            <FileEdit className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-mono font-semibold text-amber-800 text-sm">
                          {selectedProduct.allocatedSampleCount} / {selectedProduct.monthlySampleQuota}
                        </span>
                        <span className="text-2xs text-amber-700 block mt-0.5">mẫu cho Creator</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600">Tồn kho khả dụng cam kết giữ riêng cho chiến dịch thúc đẩy:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900 text-sm">{selectedProduct.availableStock.toLocaleString()} SP</span>
                        <button
                          type="button"
                          onClick={() => handleOpenChangeRequestModal('availableStock', 'Tồn Kho Cam Kết Chiến Dịch', selectedProduct.availableStock)}
                          className="text-indigo-600 hover:text-indigo-800 p-1"
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
                        <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          Thông tin Brief KOC / Creator (B2C Input)
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
                          className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-2xs flex items-center gap-1 border border-indigo-200"
                        >
                          <FileEdit className="w-3 h-3" />
                          {(!selectedProduct.usp || selectedProduct.b2cBriefStatus === 'PENDING_BRIEF') ? 'Bổ sung Brief' : 'Chỉnh sửa'}
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
                      <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 text-amber-900 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          Chờ B2C tiếp nhận & bổ sung thông tin Brief KOC
                        </div>
                        <p className="text-2xs text-amber-800 leading-relaxed">
                          Sản phẩm thúc đẩy này được Growth khởi tạo với các thông tin thương mại (giá, tồn kho, hoa hồng, mẫu). Đội ngũ B2C nghiên cứu góc nhìn người tiêu dùng để bổ sung USP, Key Message, Content Hook, tài liệu hướng dẫn và chính sách mẫu trước khi gửi Creator.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenEditBriefModal(selectedProduct)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          Bổ Sung Brief KOC Ngay (B2C)
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 text-xs">
                        {/* USP */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            Điểm bán hàng độc nhất (USP):
                          </span>
                          <p className="text-slate-800 font-medium">{selectedProduct.usp}</p>
                        </div>

                        {/* Key Message */}
                        <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-1">
                          <span className="font-semibold text-indigo-800 flex items-center gap-1">
                            Thông điệp truyền thông chính (Key Message KOC cần nhấn mạnh):
                          </span>
                          <p className="text-slate-800 font-medium italic">"{selectedProduct.keyMessage || selectedProduct.usp}"</p>
                        </div>

                        {/* Viral Angle */}
                        <div className="p-3 bg-rose-50/40 rounded-xl border border-rose-100 space-y-1">
                          <span className="font-semibold text-rose-800 flex items-center gap-1">
                            Content Hook & góc Quay video gợi ý:
                          </span>
                          <p className="text-slate-800 font-medium">{selectedProduct.viralAngle}</p>
                        </div>

                        {/* Do & Don'ts */}
                        {selectedProduct.doAndDonts && (
                          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-1">
                            <span className="font-semibold text-amber-900 flex items-center gap-1">
                              Quy tắc nên & không được làm khi Review:
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
                          <div className="flex flex-wrap gap-1.5">
                            {selectedProduct.targetKocNiche.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded text-2xs font-medium bg-white text-indigo-700 border border-slate-200">
                                #{tag}
                              </span>
                            ))}
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
                        Chưa có trao đổi nào. hãy là người đầu tiên đưa ra phản hồi hoặc đề xuất!
                      </div>
                    ) : (
                      selectedProduct.comments.map(c => (
                        <div
                          key={c.id}
                          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                            c.authorRole === 'GROWTH'
                              ? 'bg-indigo-50/50 border-indigo-100 ml-4'
                              : c.authorRole === 'B2C'
                              ? 'bg-rose-50/50 border-rose-100 mr-4'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-2xs">
                            <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                              <span className={`w-2 h-2 rounded-full ${c.authorRole === 'GROWTH' ? 'bg-indigo-600' : 'bg-rose-600'}`} />
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
                        onChange={(e: any) => setCommentType(e.target.value)}
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
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
                        Chưa có yêu cầu thay đổi nào cho SKU này. Khi có biến động giá, kho hoặc chu kỳ, hãy tạo Change Request.
                      </div>
                    ) : (
                      selectedProduct.changeRequests.map(cr => (
                        <div key={cr.id} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              Yêu Cầu Đổi: {cr.fieldLabel}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                              cr.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : cr.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {cr.status === 'APPROVED' ? 'Đã Phê Duyệt' : cr.status === 'REJECTED' ? 'Từ Chối' : 'Chờ Phê Duyệt'}
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
                                Từ Chối
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveChangeRequest(cr.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs"
                              >
                                <Check className="w-3.5 h-3.5" /> Phê duyệt & cập nhật Master Data
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
                      Nhật ký Audit Trail (lịch sử thay đổi & quyết định)
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

      {/* MODAL: KHỞI TẠO ĐỀ XUẤT SẢN PHẨM THÚC ĐẨY MỚI (GROWTH KHỞI TẠO) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  Khởi tạo sản phẩm thúc đẩy mới
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập Master Data sản phẩm thúc đẩy theo Gian hàng cụ thể để B2C review và brief KOC
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  >
                    <option value="brand-kutieskin">Kutieskin Mama & Baby</option>
                    <option value="brand-bye-bye-blemish">Bye Bye Blemish</option>
                    <option value="brand-royal-ausnz">Royal Ausnz Úc</option>
                    <option value="brand-phcare">pHCare Japan</option>
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Chu kỳ ngày bắt đầu & kết thúc */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Chu kỳ áp dụng thúc đẩy (ngày bắt đầu & kết thúc) *
                  </span>
                  <span className="text-2xs font-mono text-indigo-700 font-semibold bg-white px-2 py-0.5 rounded border border-indigo-200">
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

                <div className="grid grid-cols-2 gap-3 pt-1">
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
                  <label className="font-semibold text-slate-700 block">Hoa Hồng Affiliate (%)</label>
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
                <label className="font-semibold text-slate-700 block">Tồn kho Cam kết giữ cho chiến dịch</label>
                <input
                  type="number"
                  value={newProductForm.availableStock}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, availableStock: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                />
              </div>

              {/* Note on KOC Brief - To be inputted by B2C later */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Thông tin Brief KOC / Creator (B2C đảm nhiệm sau khi tiếp nhận)
                </div>
                <p className="text-2xs text-slate-500 leading-relaxed">
                  Các thông tin như Điểm bán hàng độc nhất (USP), Thông điệp truyền thông (Key Message), Góc quay gợi ý, Do & Don'ts và Link tài liệu brief chi tiết sẽ do đội ngũ B2C nghiên cứu và cập nhật sau khi tiếp nhận sản phẩm.
                </p>
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
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Khởi tạo & chuyển sang B2C bổ sung Brief
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: B2C BỔ SUNG & CẬP NHẬT THÔNG TIN BRIEF KOC / CREATOR */}
      {isEditBriefModalOpen && briefFormProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Cập Nhật Thông Tin Brief KOC / Creator (B2C Input)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sản phẩm: <strong>{briefFormProduct.productName}</strong> ({briefFormProduct.sku}) • Gian hàng: <strong>{briefFormProduct.storeName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditBriefModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveB2cBrief} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 text-xs text-indigo-900 space-y-1">
                <span className="font-semibold block">Thông tin dành riêng cho B2C Booking & Content:</span>
                <p className="text-2xs text-indigo-700 leading-relaxed">
                  Đội ngũ B2C nghiên cứu góc nhìn người tiêu dùng, đúc kết USP nổi bật, thông điệp truyền thông và tài liệu hướng dẫn để gửi Creator. Dữ liệu này sẽ tự động tích hợp vào tính năng sao chép 1-click gửi KOC.
                </p>
              </div>

              {/* USP */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Điểm Bán Hàng Độc Nhất (USP - Unique Selling Point) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="VD: 100% thảo dược Nano Bạc & Yến mạch Pháp, dịu ngứa chàm sữa sau 3 ngày..."
                  value={briefForm.usp}
                  onChange={(e) => setBriefForm(prev => ({ ...prev, usp: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Key Message */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Thông Điệp Truyền Thông Chính (Key Message KOC Nhấn Mạnh)
                </label>
                <input
                  type="text"
                  placeholder="VD: Dịu êm da bé tức thì - Mẹ an tâm trọn giấc nồng"
                  value={briefForm.keyMessage}
                  onChange={(e) => setBriefForm(prev => ({ ...prev, keyMessage: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Viral Angle */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Content Hook & Góc Quay Video Gợi Ý (Viral Angle)
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Mẹ bỉm chia sẻ khoảnh khắc cứu nguy làn da bé nửa đêm, cận cảnh chất kem mỏng nhẹ thẩm thấu nhanh..."
                  value={briefForm.viralAngle}
                  onChange={(e) => setBriefForm(prev => ({ ...prev, viralAngle: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Target KOC Niches */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Tệp KOC / Creator Phù Hợp (Phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="Mẹ Bỉm Sữa, Reviewer Da Liễu, Sinh Viên"
                  value={briefForm.targetKocNiche}
                  onChange={(e) => setBriefForm(prev => ({ ...prev, targetKocNiche: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Links: PDP & Brief Doc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Link Sản Phẩm Trên Gian Hàng (PDP URL Gắn Giỏ)
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
                    Link Doc Brief Chi Tiết (Google Drive / Lark Docs)
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
                  Quy Tắc NÊN & KHÔNG ĐƯỢC LÀM khi Review (Do & Don'ts)
                </label>
                <textarea
                  rows={2}
                  placeholder="NÊN: quay cận cảnh sản phẩm, dùng thử trên da... KHÔNG: so sánh dìm hàng nhãn khác, cam kết chữa khỏi 100%..."
                  value={briefForm.doAndDonts}
                  onChange={(e) => setBriefForm(prev => ({ ...prev, doAndDonts: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Sample Conditions */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Chính Sách & Điều Kiện Cấp Mẫu Cho KOC
                </label>
                <input
                  type="text"
                  placeholder="VD: Cấp 01 tuýp 30g fullsize cho KOC cam kết lên video trong 7 ngày..."
                  value={briefForm.sampleNotes}
                  onChange={(e) => setBriefForm(prev => ({ ...prev, sampleNotes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditBriefModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Lưu & Hoàn Tất Brief KOC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TẠO CHANGE REQUEST (YÊU CẦU THAY ĐỔI ĐIỀU KIỆN / CHU KỲ) */}
      {isChangeRequestModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-indigo-600" />
                  Yêu Cầu Thay Đổi: {changeRequestForm.fieldLabel}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đề xuất sẽ được gửi sang phía đối ứng để phê duyệt và ghi nhận vào Audit Log
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeRequestModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitChangeRequest} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-2xs">Giá trị hiện tại (cũ):</span>
                <span className="font-mono font-semibold text-slate-800 text-sm">{String(changeRequestForm.oldValue)}</span>
              </div>

              {changeRequestForm.type === 'CHANGE_CYCLE_DATES' ? (
                <div className="space-y-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-200">
                  <span className="font-semibold text-slate-800 block text-xs">
                    Chọn khoảng ngày Chu kỳ mới:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-semibold text-indigo-700 text-sm"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Lý Do đề xuất thay đổi *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Nêu rõ lý do (ví dụ: Kho tổng nhập thêm hàng, KOC xin tăng hạn mức mẫu để live, gia hạn chu kỳ đón đợt Payday lương về...)"
                  value={changeRequestForm.reason}
                  onChange={(e) => setChangeRequestForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Gửi yêu cầu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
