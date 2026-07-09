import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) { //to create a new interview session and save it to the database
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const data = await req.json();
  if (!data.role || !data.skills || !data.topics || !data.type || !data.difficulty || !data.duration) {
    return new Response(JSON.stringify("Missing required fields"), { status: 400 });
  }
  const result = await prisma.interviewSession.create({
    data: {
      role: data.role,
      skills: data.skills,
      company: data.company || null,
      level: data.level || null,
      focus: data.focus || null,
      topics: data.topics,
      type: data.type,
      difficulty: data.difficulty,
      duration: data.duration,
      score: 0,
      status: "In Progress",
      createdAt: new Date().toISOString(),
      user: {
        connect: { email: authSession.user.email },
      },
    }
  });
  return new Response(JSON.stringify(result), { status: 200 });
}

export async function GET(req: Request) { // to fetch the interview session data from the database
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // Single session (used by /session and /results pages)
  if (id) {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const session = await prisma.interviewSession.findUnique({
      where: { id },
    });

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { email: authSession.user.email } });
    if (!user || session.userId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    return new Response(JSON.stringify(session), { status: 200 });
  }

  // No id → list all sessions (used by /dashboard)
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const sessions = await prisma.interviewSession.findMany({
    where: {
      user: { email: authSession.user.email },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      role: true,
      company: true,
      level: true,
      focus: true,      
      skills: true,      
      topics: true,      
      type: true,
      difficulty: true,
      duration: true,
      score: true,
      status: true,
      createdAt: true,
    },
  });

  return new Response(JSON.stringify(sessions), { status: 200 });
}

// add to app/api/auth/interview/route.ts
export async function DELETE(req: Request) { // to delete the interview session from the database
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });

  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const session = await prisma.interviewSession.findUnique({ where: { id } });
  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { email: authSession.user.email } });
  if (!user || session.userId !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  await prisma.interviewSession.delete({ where: { id } });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}