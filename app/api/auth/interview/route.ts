import prisma from "@/lib/prisma";
export async function POST(req: Request) {//recieving the data from the client side and storing it in the database
    const data = await req.json();
    if (!data.role || !data.skills || !data.topics || !data.type || !data.difficulty || !data.duration) {
        return new Response(JSON.stringify("Missing required fields"), { status: 400 });
    }
    const result = await prisma.interviewSession.create({
        data: {
            role: data.role,
            skills: data.skills,
            company: data.company || null,   // ← add
            level: data.level || null,       // ← add
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
    // console.log(data);
    return new Response(JSON.stringify(result), { status: 200 });

}
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
  }

  const session = await prisma.interviewSession.findUnique({
    where: { id },
  });

  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
    }
    // console.log(session);
  return new Response(JSON.stringify(session), { status: 200 });
}