import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { exportLog } from '@/db/schema';
import { requireCurrentSession } from '@/lib/session';

export async function GET() {
  const session = await requireCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  }

  const rows = await db
    .select({
      id: exportLog.id,
      app: exportLog.app,
      device: exportLog.device,
      width: exportLog.width,
      height: exportLog.height,
      title: exportLog.title,
      meta: exportLog.meta,
      createdAt: exportLog.createdAt,
    })
    .from(exportLog)
    .where(eq(exportLog.userId, session.user.id))
    .orderBy(desc(exportLog.createdAt))
    .limit(100);

  return NextResponse.json({ exports: rows });
}
