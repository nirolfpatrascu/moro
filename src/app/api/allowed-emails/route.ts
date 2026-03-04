import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAuth } from "@/lib/auth-guard";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;

  const emails = await prisma.allowedEmail.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(emails);
}

export async function POST(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const session = await auth();
  const { email } = await request.json();
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalid" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.allowedEmail.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return NextResponse.json({ error: "Emailul exista deja" }, { status: 409 });
  }

  const created = await prisma.allowedEmail.create({
    data: {
      email: normalizedEmail,
      addedBy: session!.user!.email!,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID lipsa" }, { status: 400 });
  }

  await prisma.allowedEmail.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
