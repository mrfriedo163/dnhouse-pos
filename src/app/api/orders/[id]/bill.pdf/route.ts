import { getCurrentProfile } from "@/lib/auth";
import { generateBillPdf } from "@/lib/bill";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile || !profile.active) return new Response("Unauthorized", { status: 401 });
  try {
    const pdf = await generateBillPdf(params.id);
    return new Response(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="bill-${params.id}.pdf"`,
      },
    });
  } catch (e: any) {
    return new Response(e?.message ?? "Failed to generate bill", { status: 400 });
  }
}
