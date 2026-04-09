import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'GoHighLevel integration coming soon' },
    { status: 501 }
  );
}
