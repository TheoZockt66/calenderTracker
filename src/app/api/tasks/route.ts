import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const { getToken } = await import("next-auth/jwt");
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token.accessToken as string });

  const tasks = google.tasks({ version: "v1", auth: oauth2Client });

  try {
    // Get all task lists
    const taskListsRes = await tasks.tasklists.list({ maxResults: 100 });
    const taskLists = taskListsRes.data.items || [];

    interface TaskItem {
      id: string;
      title: string;
      notes: string | null;
      due: string | null;
      status: "needsAction" | "completed";
      completed: string | null;
      updated: string | null;
      taskListName: string;
      taskListId: string;
      parent: string | null;
      position: string | null;
      links: { type: string; description: string; link: string }[];
    }

    const allTasks: TaskItem[] = [];

    for (const list of taskLists) {
      try {
        const tasksRes = await tasks.tasks.list({
          tasklist: list.id!,
          maxResults: 100,
          showCompleted: true,
          showHidden: true,
        });

        const items = (tasksRes.data.items || []).map((task) => ({
          id: task.id || "",
          title: task.title || "(Kein Titel)",
          notes: task.notes || null,
          due: task.due || null,
          status: (task.status as "needsAction" | "completed") || "needsAction",
          completed: task.completed || null,
          updated: task.updated || null,
          taskListName: list.title || "Unbekannt",
          taskListId: list.id || "",
          parent: task.parent || null,
          position: task.position || null,
          links: (task.links || []).map((l) => ({
            type: l.type || "",
            description: l.description || "",
            link: l.link || "",
          })),
        }));

        allTasks.push(...items);
      } catch {
        // Skip task lists we can't access
      }
    }

    // Sort: open tasks first, then by due date
    allTasks.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "needsAction" ? -1 : 1;
      }
      const dateA = a.due ? new Date(a.due).getTime() : Infinity;
      const dateB = b.due ? new Date(b.due).getTime() : Infinity;
      return dateA - dateB;
    });

    return NextResponse.json({
      taskLists: taskLists.map((l) => ({
        id: l.id,
        name: l.title,
      })),
      tasks: allTasks,
      total: allTasks.length,
    });
  } catch (error: unknown) {
    console.error("Tasks API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tasks",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
