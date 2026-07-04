import prisma from "@/lib/prisma";

export async function POST(req: Request) {
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
        connect: { email: "test@gmail.com" },
      },
    }
  });
  return new Response(JSON.stringify(result), { status: 200 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // Single session (used by /session and /results pages)
  if (id) {
    const session = await prisma.interviewSession.findUnique({
      where: { id },
    });

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
    }
    return new Response(JSON.stringify(session), { status: 200 });
  }

  // No id → list all sessions (used by /dashboard)
  const sessions = await prisma.interviewSession.findMany({
    where: {
      user: { email: "test@gmail.com" }, // right now hardcoded
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
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });

  await prisma.interviewSession.delete({ where: { id } });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}