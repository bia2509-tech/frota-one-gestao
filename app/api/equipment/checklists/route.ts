export async function GET() {
  return Response.json({ error: "O checklist foi removido do sistema." }, { status: 410 });
}

export async function POST() {
  return Response.json({ error: "O checklist foi removido do sistema." }, { status: 410 });
}
