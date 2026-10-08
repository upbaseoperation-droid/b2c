import { NextRequest, NextResponse } from 'next/server';
import { processLegalOcr } from '@/lib/legalOcrService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await processLegalOcr({
      imageBase64: body.imageBase64,
      documentTypeHint: body.documentTypeHint || 'AUTO',
      fileName: body.fileName || 'tai_lieu_phap_ly.jpg',
      presetKey: body.presetKey,
      apiKey: body.apiKey
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi bóc tách tài liệu OCR';
    console.error('[OCR Legal Extraction API Error]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: message 
      },
      { status: 500 }
    );
  }
}
