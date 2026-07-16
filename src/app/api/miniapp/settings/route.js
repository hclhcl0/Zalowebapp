import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Only return configuration keys starting with "mini_app_" to prevent leaking API keys
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          startsWith: "mini_app_",
        }
      }
    });
    
    const result = configs.reduce((acc, c) => {
      acc[c.key] = { value: c.value, label: c.label };
      return acc;
    }, {});
    
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
