import { NextRequest, NextResponse } from 'next/server';
import { kalodataClient } from '@/lib/kalodata/client';
import { KalodataDiscoverFilter } from '@/lib/kalodata/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const minFollowers = searchParams.get('minFollowers') ? Number(searchParams.get('minFollowers')) : undefined;
    const maxFollowers = searchParams.get('maxFollowers') ? Number(searchParams.get('maxFollowers')) : undefined;
    const minGmv = searchParams.get('minGmv') ? Number(searchParams.get('minGmv')) : undefined;
    const sortBy = (searchParams.get('sortBy') as any) || 'gmv';
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
    const pageSize = searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 20;

    const filter: KalodataDiscoverFilter = {
      category,
      minFollowers,
      maxFollowers,
      minGmv,
      sortBy,
      page,
      pageSize
    };

    const creators = await kalodataClient.discoverCreators(filter);

    return NextResponse.json({
      success: true,
      data: creators,
      total: creators.length,
      page,
      pageSize
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi trong quá trình tìm kiếm danh sách Creator từ Kalodata',
        error: error.message
      },
      { status: 500 }
    );
  }
}
